import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getProjectCollaborators,
  inviteCollaborator,
  removeCollaborator,
} from "@/lib/collaborators";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * GET /api/projects/[projectId]/collaborators
 * Lists collaborators for a project enriched with Clerk user data.
 * Accessible by both the project owner and existing collaborators.
 */
export async function GET(_request: Request, context: RouteParams) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user has access to this project (owner or collaborator)
  const access = await checkProjectAccess(projectId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getProjectCollaborators(projectId, userId);

  return NextResponse.json(data);
}

/**
 * POST /api/projects/[projectId]/collaborators
 * Invites a collaborator by email.
 * Enforces project ownership server-side.
 */
export async function POST(request: Request, context: RouteParams) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isJsonObject(parsedBody) || typeof parsedBody.email !== "string") {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 400 }
    );
  }

  const result = await inviteCollaborator(projectId, parsedBody.email, userId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.statusCode || 400 }
    );
  }

  return NextResponse.json(result.collaborator, { status: 201 });
}

/**
 * DELETE /api/projects/[projectId]/collaborators
 * Removes a collaborator by ID.
 * Enforces project ownership server-side.
 */
export async function DELETE(request: Request, context: RouteParams) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  let collaboratorId: string | null = null;

  // Check URL query params first
  const url = new URL(request.url);
  collaboratorId = url.searchParams.get("collaboratorId");

  // If not in query params, inspect body
  if (!collaboratorId) {
    try {
      const body = await request.json();
      if (isJsonObject(body) && typeof body.collaboratorId === "string") {
        collaboratorId = body.collaboratorId;
      }
    } catch {
      // Ignored if request has no body
    }
  }

  if (!collaboratorId) {
    return NextResponse.json(
      { error: "collaboratorId is required" },
      { status: 400 }
    );
  }

  const result = await removeCollaborator(projectId, collaboratorId, userId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.statusCode || 400 }
    );
  }

  return NextResponse.json({ success: true });
}
