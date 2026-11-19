import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { liveblocks } from "@/lib/liveblocks";

export interface EnrichedCollaborator {
  id: string;
  projectId: string;
  email: string;
  createdAt: string | Date;
  name: string | null;
  avatarUrl: string | null;
  isOwner?: boolean;
}

export interface ProjectCollaboratorsData {
  owner: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  collaborators: EnrichedCollaborator[];
  isOwner: boolean;
}

/**
 * Retrieves and enriches all collaborators for a project with Clerk user data (display name and avatar).
 * Falls back to showing email only if a Clerk user is not found for an email address.
 */
export async function getProjectCollaborators(
  projectId: string,
  currentUserId?: string
): Promise<ProjectCollaboratorsData> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) {
    return { owner: null, collaborators: [], isOwner: false };
  }

  const isOwner = Boolean(currentUserId && project.ownerId === currentUserId);

  // Fetch owner details from Clerk
  let ownerData: ProjectCollaboratorsData["owner"] = null;
  try {
    const client = await clerkClient();
    const ownerUser = await client.users.getUser(project.ownerId);
    if (ownerUser) {
      const ownerName =
        [ownerUser.firstName, ownerUser.lastName].filter(Boolean).join(" ") ||
        ownerUser.username ||
        null;
      const ownerEmail =
        ownerUser.primaryEmailAddress?.emailAddress ??
        ownerUser.emailAddresses?.[0]?.emailAddress ??
        null;
      ownerData = {
        id: ownerUser.id,
        email: ownerEmail,
        name: ownerName,
        avatarUrl: ownerUser.imageUrl || null,
      };
    }
  } catch {
    ownerData = {
      id: project.ownerId,
      email: null,
      name: null,
      avatarUrl: null,
    };
  }

  // Lookup collaborators in Clerk
  const collaboratorEmails = project.collaborators.map((c) =>
    c.email.toLowerCase()
  );

  const clerkMap = new Map<
    string,
    { name: string | null; avatarUrl: string | null }
  >();

  if (collaboratorEmails.length > 0) {
    try {
      const client = await clerkClient();
      const clerkUsers = await client.users.getUserList({
        emailAddress: collaboratorEmails,
        limit: 100,
      });

      for (const u of clerkUsers.data) {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.username ||
          null;
        const avatarUrl = u.imageUrl || null;
        for (const em of u.emailAddresses) {
          clerkMap.set(em.emailAddress.toLowerCase(), { name, avatarUrl });
        }
      }
    } catch {
      // In case of lookup issue, proceed with email-only fallback
    }
  }

  const enrichedCollaborators: EnrichedCollaborator[] = project.collaborators.map(
    (c) => {
      const clerkInfo = clerkMap.get(c.email.toLowerCase());
      return {
        id: c.id,
        projectId: c.projectId,
        email: c.email,
        createdAt: c.createdAt,
        name: clerkInfo?.name ?? null,
        avatarUrl: clerkInfo?.avatarUrl ?? null,
        isOwner: false,
      };
    }
  );

  return {
    owner: ownerData,
    collaborators: enrichedCollaborators,
    isOwner,
  };
}

/**
 * Invites a collaborator by email to a project.
 * Strictly enforces project ownership server-side.
 */
export async function inviteCollaborator(
  projectId: string,
  email: string,
  requestingUserId: string
): Promise<{
  success: boolean;
  collaborator?: EnrichedCollaborator;
  error?: string;
  statusCode?: number;
}> {
  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      success: false,
      error: "Please enter a valid email address.",
      statusCode: 400,
    };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return {
      success: false,
      error: "Project not found.",
      statusCode: 404,
    };
  }

  if (project.ownerId !== requestingUserId) {
    return {
      success: false,
      error: "Only the project owner can invite collaborators.",
      statusCode: 403,
    };
  }

  // Prevent inviting self as collaborator
  try {
    const client = await clerkClient();
    const ownerUser = await client.users.getUser(project.ownerId);
    const ownerEmails = ownerUser.emailAddresses.map((e) =>
      e.emailAddress.toLowerCase()
    );
    if (ownerEmails.includes(normalizedEmail)) {
      return {
        success: false,
        error: "You are the project owner and cannot be invited as a collaborator.",
        statusCode: 400,
      };
    }
  } catch {
    // If lookup fails, proceed
  }

  // Check if collaborator already exists
  const existing = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_email: {
        projectId,
        email: normalizedEmail,
      },
    },
  });

  if (existing) {
    return {
      success: false,
      error: "This email is already a collaborator on this project.",
      statusCode: 409,
    };
  }

  const newCollab = await prisma.projectCollaborator.create({
    data: {
      projectId,
      email: normalizedEmail,
    },
  });

  // Try to enrich with Clerk user info
  let name: string | null = null;
  let avatarUrl: string | null = null;

  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      emailAddress: [normalizedEmail],
      limit: 1,
    });
    if (users.data.length > 0) {
      const u = users.data[0];
      name =
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.username ||
        null;
      avatarUrl = u.imageUrl || null;
    }
  } catch {
    // Fall back to null name/avatar
  }

  return {
    success: true,
    collaborator: {
      id: newCollab.id,
      projectId: newCollab.projectId,
      email: newCollab.email,
      createdAt: newCollab.createdAt,
      name,
      avatarUrl,
      isOwner: false,
    },
  };
}

/**
 * Removes a collaborator from a project.
 * Strictly enforces project ownership server-side.
 */
export async function removeCollaborator(
  projectId: string,
  collaboratorId: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return {
      success: false,
      error: "Project not found.",
      statusCode: 404,
    };
  }

  if (project.ownerId !== requestingUserId) {
    return {
      success: false,
      error: "Only the project owner can remove collaborators.",
      statusCode: 403,
    };
  }

  const target = await prisma.projectCollaborator.findFirst({
    where: {
      id: collaboratorId,
      projectId,
    },
  });

  if (!target) {
    return {
      success: false,
      error: "Collaborator not found.",
      statusCode: 404,
    };
  }

  await prisma.projectCollaborator.delete({
    where: {
      id: target.id,
    },
  });

  // Invalidate Liveblocks room access for this collaborator
  try {
    await liveblocks.broadcastEvent(projectId, {
      type: "access-revoked",
      collaboratorEmail: target.email,
      timestamp: Date.now(),
    });
  } catch (lbErr) {
    console.warn("Could not broadcast room access revocation:", lbErr);
  }

  return { success: true };
}
