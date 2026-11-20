import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";
import { executeDesignAgent } from "@/lib/ai/design-service";

export const maxDuration = 60; // 60 seconds max execution time for Vercel serverless functions

interface DesignRequestBody {
  prompt?: string;
  roomId?: string;
  projectId?: string;
}

/**
 * POST /api/ai/design
 * Accepts the design prompt and context (roomId, projectId).
 * Executes the AI design agent directly on serverless, writes to Liveblocks canvas,
 * stores the TaskRun audit record in Prisma, and returns the generation summary.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity || !identity.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
    return NextResponse.json(
      { error: "Expected JSON object body" },
      { status: 400 }
    );
  }

  const body = rawBody as DesignRequestBody;
  const { prompt, roomId, projectId } = body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json(
      { error: "Design prompt is required" },
      { status: 400 }
    );
  }

  // Reject conflicting project and room identifiers
  if (projectId && roomId && projectId !== roomId) {
    return NextResponse.json(
      { error: "Conflicting project and room identifiers" },
      { status: 400 }
    );
  }

  const targetId = projectId || roomId;
  if (!targetId || typeof targetId !== "string" || !targetId.trim()) {
    return NextResponse.json(
      { error: "Project ID or Room ID is required" },
      { status: 400 }
    );
  }

  // Verify user has access to the project
  const access = await checkProjectAccess(targetId.trim(), identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  const authorizedId = access.project.id;

  try {
    const runId = `serverless_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Create TaskRun record in Prisma to track ownership and auditing
    await prisma.taskRun.create({
      data: {
        runId,
        projectId: authorizedId,
        userId,
      },
    });

    // Execute design agent directly and synchronously on Vercel
    const result = await executeDesignAgent({
      prompt: prompt.trim(),
      roomId: authorizedId,
      projectId: authorizedId,
    });

    return NextResponse.json({
      success: true,
      runId,
      summary: result.summary,
      actionCount: result.actionCount,
      completed: true,
    });
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    console.error("Failed to execute design agent task:", errorDetail, err);
    return NextResponse.json(
      {
        error: "Failed to generate architecture design",
        details: errorDetail,
      },
      { status: 500 }
    );
  }
}
