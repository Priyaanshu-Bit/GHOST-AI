import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { liveblocks, getUserColor } from "@/lib/liveblocks";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * POST /api/liveblocks-auth
 * Liveblocks authentication endpoint.
 *
 * Requirements:
 * 1. Require Clerk authentication.
 * 2. Verify project access using checkProjectAccess helper.
 * 3. Ensure the Liveblocks room exists (create only if needed).
 * 4. Return a session token with user name, avatar, and generated cursor color.
 * 5. Return 403 for unauthorized project access.
 */
export async function POST(request: Request) {
  // 1. Require Clerk authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity || !identity.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse room parameter from request body (Liveblocks client sends { room: string })
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isJsonObject(parsedBody)) {
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }

  const roomId =
    (typeof parsedBody.room === "string" ? parsedBody.room : null) ||
    (typeof parsedBody.roomId === "string" ? parsedBody.roomId : null);

  if (!roomId) {
    return NextResponse.json(
      { error: "Room ID is required" },
      { status: 400 }
    );
  }

  // 2. Verify project access using the existing access helper
  const access = await checkProjectAccess(roomId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  // 3. Ensure the Liveblocks room exists (create only if needed)
  try {
    await liveblocks.getOrCreateRoom(roomId, {
      defaultAccesses: [],
      metadata: {
        projectId: roomId,
        title: access.project.name,
      },
    });
  } catch (error) {
    // If Liveblocks API warning or room already exists, proceed to session authorization
    console.warn("Liveblocks getOrCreateRoom notice:", error);
  }

  // Ensure collaborative room feeds (ai-chat & ai-status-feed) exist
  try {
    await liveblocks.createFeed({ roomId, feedId: "ai-chat" });
  } catch (err: unknown) {
    const errorStatus = (err as { status?: number })?.status;
    const errorMessage = String((err as Error)?.message || "");
    if (errorStatus !== 409 && !errorMessage.includes("already exists")) {
      console.warn("Liveblocks ai-chat feed setup notice:", err);
    }
  }

  try {
    await liveblocks.createFeed({ roomId, feedId: "ai-status-feed" });
  } catch (err: unknown) {
    const errorStatus = (err as { status?: number })?.status;
    const errorMessage = String((err as Error)?.message || "");
    if (errorStatus !== 409 && !errorMessage.includes("already exists")) {
      console.warn("Liveblocks ai-status-feed setup notice:", err);
    }
  }

  // Resolve user metadata
  const user = await currentUser();
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    identity.email?.split("@")[0] ||
    "Anonymous";
  const avatar = user?.imageUrl || undefined;
  const color = getUserColor(userId);

  // 4. Return session token with user name, avatar, and generated cursor color
  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name,
      avatar,
      color,
    },
  });

  // Grant full access to the project's room
  session.allow(roomId, session.FULL_ACCESS);

  try {
    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (err) {
    console.error("Liveblocks session authorization error:", err);
    return NextResponse.json(
      { error: "Failed to authorize Liveblocks session" },
      { status: 500 }
    );
  }
}
