import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { triggerAuth } from "@/lib/trigger";
import { prisma } from "@/lib/prisma";

interface TokenRequestBody {
  runId?: string;
}

/**
 * POST /api/ai/design/token
 * Accepts a run ID, verifies ownership via the TaskRun record in Prisma,
 * and generates a Trigger.dev public token scoped to that run.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
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

  const body = rawBody as TokenRequestBody;
  const { runId } = body;

  if (!runId || typeof runId !== "string" || !runId.trim()) {
    return NextResponse.json(
      { error: "runId is required" },
      { status: 400 }
    );
  }

  // Verify ownership via TaskRun record in Prisma
  const taskRun = await prisma.taskRun.findUnique({
    where: { runId: runId.trim() },
  });

  if (!taskRun) {
    return NextResponse.json(
      { error: "Task run not found" },
      { status: 404 }
    );
  }

  if (taskRun.userId !== userId) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to access this run" },
      { status: 403 }
    );
  }

  try {
    // Generate a Trigger.dev public token scoped strictly to read this run
    const publicToken = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [runId.trim()],
        },
      },
    });

    return NextResponse.json({
      success: true,
      token: publicToken,
      publicAccessToken: publicToken,
      runId: runId.trim(),
    });
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    console.error("Failed to generate Trigger.dev public token:", errorDetail, err);
    return NextResponse.json(
      {
        error: "Failed to generate run token",
        details: errorDetail,
      },
      { status: 500 }
    );
  }
}
