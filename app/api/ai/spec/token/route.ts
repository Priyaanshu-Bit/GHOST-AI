import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";

interface TokenRequestBody {
  runId?: string;
}

/**
 * POST /api/ai/spec/token
 * Conforms to 27-spec-generation-flow.md:
 * - Accepts `runId`.
 * - Authenticates the current user via Clerk.
 * - Verifies the `TaskRun` record in Prisma belongs to the authenticated user.
 * - Issues a Trigger.dev public access token scoped strictly to read this run.
 * - Sets token expiration to 1 hour.
 * - Returns the token to the client.
 */
export async function POST(request: Request) {
  // 1. Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body
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

  const cleanRunId = runId.trim();

  // 3. Verify ownership via TaskRun record in Prisma
  const taskRun = await prisma.taskRun.findUnique({
    where: { runId: cleanRunId },
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
    // 4. Issue Trigger.dev public access token scoped to read this run with 1-hour expiration
    const publicToken = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [cleanRunId],
        },
      },
      expirationTime: "1h",
    });

    return NextResponse.json({
      success: true,
      token: publicToken,
      publicAccessToken: publicToken,
      runId: cleanRunId,
      expiresIn: "1h",
    });
  } catch (err) {
    console.error("Failed to generate Trigger.dev public token for spec run:", err);
    return NextResponse.json(
      { error: "Failed to generate spec token" },
      { status: 500 }
    );
  }
}
