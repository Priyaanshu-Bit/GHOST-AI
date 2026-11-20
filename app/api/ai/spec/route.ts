import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";
import { SpecTriggerRequestSchema } from "@/types/tasks";
import { executeSpecGeneration } from "@/lib/ai/spec-service";

export const maxDuration = 60; // 60 seconds max execution time for Vercel functions

/**
 * POST /api/ai/spec
 * Conforms to 27-spec-generation-flow.md:
 * - Accepts `roomId`, `chatHistory`, `nodes`, and `edges`.
 * - Authenticates the current user via Clerk.
 * - Resolves project access strictly from `roomId`.
 * - Executes spec synthesis directly on serverless.
 * - Saves generated Markdown spec to Vercel Blob and records metadata in Prisma.
 * - Returns the generated spec record.
 */
export async function POST(request: Request) {
  // 1. Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity || !identity.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SpecTriggerRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { roomId } = parsed.data;

  // 3. Resolve project access strictly from roomId
  const access = await checkProjectAccess(roomId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  const resolvedProjectId = access.project.id;

  try {
    const runId = `serverless_spec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 4. Save TaskRun record in Prisma for ownership tracking
    await prisma.taskRun.create({
      data: {
        runId,
        projectId: resolvedProjectId,
        userId,
      },
    });

    // 5. Execute spec generation directly on serverless
    const result = await executeSpecGeneration({
      ...parsed.data,
      projectId: resolvedProjectId,
    });

    return NextResponse.json({
      success: true,
      runId,
      specId: result.specId,
      title: result.title,
      spec: result.spec,
      completed: true,
    });
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    console.error("Failed to generate architecture spec:", errorDetail, err);
    return NextResponse.json(
      {
        error: "Failed to generate architecture spec",
        details: errorDetail,
      },
      { status: 500 }
    );
  }
}
