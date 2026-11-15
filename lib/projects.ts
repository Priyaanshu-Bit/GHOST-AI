import { prisma } from "@/lib/prisma";

export interface CreateProjectInput {
  id?: string;
  name?: string;
  description?: string | null;
  ownerId: string;
}

/**
 * Retrieves all owned and shared projects for a given user identity.
 */
export async function getProjectsForUser(userId: string, userEmail?: string | null) {
  const [owned, sharedCollaborations] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        collaborators: true,
      },
    }),
    userEmail
      ? prisma.projectCollaborator.findMany({
          where: { email: userEmail },
          include: {
            project: {
              include: {
                collaborators: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  const shared = sharedCollaborations
    .map((collab) => collab.project)
    .filter((project) => project.ownerId !== userId);

  return {
    owned,
    shared,
  };
}

/**
 * Creates a new project using the schema's default ID strategy (or optional client-provided slug ID).
 * Defaults missing name to "Untitled Project".
 */
export async function createProject({
  id,
  name,
  description,
  ownerId,
}: CreateProjectInput) {
  const resolvedName = name?.trim() ? name.trim() : "Untitled Project";
  let targetId = id?.trim() || undefined;

  // If an ID/slug is provided, ensure uniqueness to prevent collision
  if (targetId) {
    const existing = await prisma.project.findUnique({
      where: { id: targetId },
    });
    if (existing) {
      targetId = `${targetId}-${Math.random().toString(36).substring(2, 6)}`;
    }
  }

  return prisma.project.create({
    data: {
      ...(targetId ? { id: targetId } : {}),
      name: resolvedName,
      description: description ?? null,
      ownerId,
    },
  });
}

/**
 * Retrieves a single project by ID.
 */
export async function getProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: true,
    },
  });
}

/**
 * Renames an existing project.
 */
export async function renameProject(
  projectId: string,
  ownerId: string,
  newName: string
) {
  const [project] = await prisma.project.updateManyAndReturn({
    where: { id: projectId, ownerId },
    data: {
      name: newName.trim(),
    },
  });

  return project ?? null;
}

/**
 * Deletes a project and cascades deletion to collaborators.
 */
export async function deleteProject(projectId: string, ownerId: string) {
  const result = await prisma.project.deleteMany({
    where: { id: projectId, ownerId },
  });

  return result.count;
}
