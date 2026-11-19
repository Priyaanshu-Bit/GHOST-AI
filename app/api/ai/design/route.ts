import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks, auth as triggerAuth } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";
import type { designAgent } from "@/trigger/design-agent";

interface DesignRequestBody {
  prompt?: string;
  roomId?: string;
  projectId?: string;
}

/**
 * POST /api/ai/design
 * Accepts the design prompt and context (roomId, projectId).
 * Triggers the Trigger.dev design task, stores the TaskRun in Prisma,
 * and returns the run ID.
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

  let body: DesignRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, roomId, projectId } = body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json(
      { error: "Design prompt is required" },
      { status: 400 }
    );
  }

  const resolvedProjectId = projectId || roomId;
  const resolvedRoomId = roomId || projectId;

  if (!resolvedProjectId || !resolvedRoomId) {
    return NextResponse.json(
      { error: "Project ID or Room ID is required" },
      { status: 400 }
    );
  }

  // Verify user has access to the project
  const access = await checkProjectAccess(resolvedProjectId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  try {
    // Trigger design agent task through Trigger.dev
    const handle = await tasks.trigger<typeof designAgent>("design-agent", {
      prompt: prompt.trim(),
      roomId: resolvedRoomId,
      projectId: resolvedProjectId,
    });

    // Create TaskRun record in Prisma to track ownership
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: resolvedProjectId,
        userId,
      },
    });

    // Generate Trigger.dev public token scoped strictly to read this run
    let publicToken: string | undefined;
    try {
      publicToken = await triggerAuth.createPublicToken({
        scopes: {
          read: {
            runs: [handle.id],
          },
        },
      });
    } catch (tokenErr) {
      console.warn("Could not generate public token at dispatch:", tokenErr);
    }

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicToken,
    });
  } catch (err) {
    console.error("Failed to trigger design agent task:", err);
    const message =
      err instanceof Error ? err.message : "Failed to trigger background task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
