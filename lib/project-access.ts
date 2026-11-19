import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ProjectWithCollaborators = Prisma.ProjectGetPayload<{
  include: { collaborators: true };
}>;

export interface UserIdentity {
  userId: string;
  email: string | null;
}

export interface ProjectAccessResult {
  hasAccess: boolean;
  project: ProjectWithCollaborators | null;
  isOwner: boolean;
}

/**
 * Retrieves the current authenticated Clerk identity (userId and primary email).
 * Returns null if the user is unauthenticated.
 */
export async function getCurrentUserIdentity(): Promise<UserIdentity | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  return { userId, email };
}

/**
 * Checks whether the specified user identity has access to a project by ID.
 * Resolves ownership or collaborator membership; returns hasAccess: false if project
 * does not exist or user lacks permission.
 */
export async function checkProjectAccess(
  projectId: string,
  identity?: UserIdentity | null
): Promise<ProjectAccessResult> {
  const user = identity ?? (await getCurrentUserIdentity());
  if (!user || !user.userId) {
    return { hasAccess: false, project: null, isOwner: false };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: true,
    },
  });

  if (!project) {
    return { hasAccess: false, project: null, isOwner: false };
  }

  const isOwner = project.ownerId === user.userId;

  const isCollaborator = Boolean(
    user.email &&
      project.collaborators.some(
        (collab) => collab.email.toLowerCase() === user.email!.toLowerCase()
      )
  );

  const hasAccess = isOwner || isCollaborator;

  return {
    hasAccess,
    project: hasAccess ? project : null,
    isOwner,
  };
}
