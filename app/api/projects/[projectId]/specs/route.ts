import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";
import { getProjectSpecs, saveProjectSpec } from "@/lib/specs";

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * GET /api/projects/[projectId]/specs
 * Returns all generated specs for the specified project.
 */
export async function GET(_request: Request, context: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity || !identity.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const access = await checkProjectAccess(projectId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  try {
    const specs = await getProjectSpecs(projectId);
    return NextResponse.json({ specs });
  } catch (err) {
    console.error("Failed to list project specs:", err);
    return NextResponse.json(
      { error: "Failed to retrieve project specifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/specs
 * Persists a Markdown technical spec directly into Vercel Blob and creates a ProjectSpec record.
 */
export async function POST(request: Request, context: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity || !identity.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const access = await checkProjectAccess(projectId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  let body: { markdown?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.markdown || typeof body.markdown !== "string" || !body.markdown.trim()) {
    return NextResponse.json(
      { error: "Markdown content is required" },
      { status: 400 }
    );
  }

  try {
    const spec = await saveProjectSpec(projectId, body.markdown.trim());
    return NextResponse.json({
      success: true,
      spec,
    });
  } catch (err) {
    console.error("Failed to save project spec:", err);
    return NextResponse.json(
      { error: "Failed to persist specification" },
      { status: 500 }
    );
  }
}
