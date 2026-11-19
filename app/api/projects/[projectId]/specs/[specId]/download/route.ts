import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";
import { fetchSpecContent } from "@/lib/specs";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    projectId: string;
    specId: string;
  }>;
}

/**
 * GET /api/projects/[projectId]/specs/[specId]/download
 * Conforms to 28-spec-persistence-download.md:
 * 1. Authenticates the user via Clerk.
 * 2. Verifies user access to the project (owner or invited collaborator).
 * 3. Verifies the requested spec exists and belongs to that project.
 * 4. Fetches the Markdown content from Vercel Blob using `ProjectSpec.filePath`.
 * 5. Returns the content as a downloadable Markdown file attachment.
 * 6. Handles 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), and 502 (Storage Error) properly.
 */
export async function GET(_request: Request, context: RouteParams) {
  // 1. Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity || !identity.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, specId } = await context.params;
  if (!projectId || !specId) {
    return NextResponse.json(
      { error: "Both projectId and specId are required" },
      { status: 400 }
    );
  }

  // 2. Verify access to the project
  const access = await checkProjectAccess(projectId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  // 3. Query spec metadata from Prisma scoped strictly to the authorized project
  const spec = await prisma.projectSpec.findFirst({
    where: {
      id: specId,
      projectId,
    },
  });

  if (!spec) {
    return NextResponse.json(
      { error: "Specification not found" },
      { status: 404 }
    );
  }

  // 4. Fetch the Markdown file from Vercel Blob using filePath
  let markdownContent: string;
  try {
    markdownContent = await fetchSpecContent(spec.filePath);
  } catch (err) {
    console.error("Failed to retrieve spec content from storage:", err);
    return NextResponse.json(
      { error: "Failed to retrieve spec content from storage" },
      { status: 502 }
    );
  }

  // 5. Construct downloadable Markdown response attachment
  const sanitizedProjectName = access.project.name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const filename = `${sanitizedProjectName || "project"}-spec-${specId.slice(-6)}.md`;

  return new Response(markdownContent, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
