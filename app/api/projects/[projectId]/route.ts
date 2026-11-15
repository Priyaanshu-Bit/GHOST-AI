import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProjectById, renameProject, deleteProject } from "@/lib/projects";

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * PATCH /api/projects/[projectId]
 * Renames an existing project.
 * Returns 401 if unauthenticated.
 * Returns 404 if project not found.
 * Returns 403 if caller is not the project owner.
 */
export async function PATCH(request: Request, context: RouteParams) {
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

  if (!isJsonObject(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = parsedBody;

  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "A valid project name is required" },
      { status: 400 }
    );
  }

  const project = await getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Security: only the project owner can rename
  if (project.ownerId !== userId) {
    return NextResponse.json(
      { error: "Forbidden: Only the project owner can rename this project" },
      { status: 403 }
    );
  }

  const updatedProject = await renameProject(projectId, userId, body.name);

  if (!updatedProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(updatedProject);
}

/**
 * DELETE /api/projects/[projectId]
 * Deletes an existing project.
 * Returns 401 if unauthenticated.
 * Returns 404 if project not found.
 * Returns 403 if caller is not the project owner.
 */
export async function DELETE(_request: Request, context: RouteParams) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const project = await getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Security: only the project owner can delete
  if (project.ownerId !== userId) {
    return NextResponse.json(
      { error: "Forbidden: Only the project owner can delete this project" },
      { status: 403 }
    );
  }

  const deletedCount = await deleteProject(projectId, userId);

  if (deletedCount === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
