import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks, auth as triggerAuth } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";
import { SpecTriggerRequestSchema } from "@/types/tasks";
import type { generateSpec } from "@/trigger/generate-spec";

/**
 * POST /api/ai/spec
 * Conforms to 27-spec-generation-flow.md:
 * - Accepts `roomId`, `chatHistory`, `nodes`, and `edges`.
 * - Authenticates the current user via Clerk.
 * - Resolves project access strictly from `roomId` (never trusts client-supplied projectId).
 * - Triggers the `generate-spec` Trigger.dev background task.
 * - Saves a `TaskRun` record in Prisma for ownership/access control.
 * - Returns the Trigger.dev `runId` and scoped public access token.
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

  const { roomId, chatHistory, nodes, edges } = parsed.data;

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
    // 4. Trigger the generate-spec task through Trigger.dev
    const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
      projectId: resolvedProjectId,
      roomId,
      chatHistory,
      nodes,
      edges,
    });

    // 5. Save TaskRun record in Prisma for ownership tracking
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: resolvedProjectId,
        userId,
      },
    });

    // 6. Generate 1-hour scoped Trigger.dev public access token
    let publicToken: string | undefined;
    try {
      publicToken = await triggerAuth.createPublicToken({
        scopes: {
          read: {
            runs: [handle.id],
          },
        },
        expirationTime: "1h",
      });
    } catch (tokenErr) {
      console.warn("Could not generate public token at spec dispatch:", tokenErr);
    }

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicToken,
    });
  } catch (err) {
    console.error("Failed to trigger generate-spec task:", err);
    const message =
      err instanceof Error ? err.message : "Failed to trigger spec background task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
