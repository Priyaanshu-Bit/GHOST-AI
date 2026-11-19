"use client";

import * as React from "react";
import type { EnrichedCollaborator } from "@/lib/collaborators";

export interface OwnerInfo {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface UseProjectCollaboratorsOptions {
  projectId: string;
  open: boolean;
  initialIsOwner?: boolean;
}

export function useProjectCollaborators({
  projectId,
  open,
  initialIsOwner = false,
}: UseProjectCollaboratorsOptions) {
  const [collaborators, setCollaborators] = React.useState<EnrichedCollaborator[]>([]);
  const [owner, setOwner] = React.useState<OwnerInfo | null>(null);
  const [isOwner, setIsOwner] = React.useState<boolean>(initialIsOwner);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInviting, setIsInviting] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const mutationCountRef = React.useRef(0);

  // Fetch collaborators list whenever dialog opens
  React.useEffect(() => {
    if (!open || !projectId) return;

    let ignore = false;
    mutationCountRef.current = 0;

    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/collaborators`);
        if (res.ok) {
          const data = await res.json();
          // Check cancellation immediately after response body read
          if (ignore) return;

          // Prevent slow initial load from overwriting changes made during this dialog session
          if (mutationCountRef.current === 0) {
            setCollaborators(data.collaborators || []);
          }
          if (data.owner) setOwner(data.owner);
          if (typeof data.isOwner === "boolean") setIsOwner(data.isOwner);
        } else {
          const err = await res.json().catch(() => ({}));
          // Check cancellation immediately after response body read
          if (ignore) return;
          setErrorMessage(err.error || "Failed to load collaborators.");
        }
      } catch {
        if (!ignore) {
          setErrorMessage("Network error loading collaborators.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [open, projectId]);

  // Invite collaborator by email
  const inviteCollaborator = React.useCallback(
    async (targetEmail: string) => {
      const email = targetEmail.trim();
      if (!email) return false;

      setIsInviting(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/projects/${projectId}/collaborators`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (res.ok) {
          const newCollab: EnrichedCollaborator = await res.json();
          mutationCountRef.current += 1;
          setCollaborators((prev) => [...prev, newCollab]);
          return true;
        } else {
          const err = await res.json().catch(() => ({}));
          setErrorMessage(err.error || "Failed to invite collaborator.");
          return false;
        }
      } catch {
        setErrorMessage("Network error while inviting collaborator.");
        return false;
      } finally {
        setIsInviting(false);
      }
    },
    [projectId]
  );

  // Remove collaborator
  const removeCollaborator = React.useCallback(
    async (collaboratorId: string) => {
      setRemovingId(collaboratorId);
      setErrorMessage(null);

      try {
        const res = await fetch(
          `/api/projects/${projectId}/collaborators?collaboratorId=${encodeURIComponent(
            collaboratorId
          )}`,
          {
            method: "DELETE",
          }
        );

        if (res.ok) {
          mutationCountRef.current += 1;
          setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
          return true;
        } else {
          const err = await res.json().catch(() => ({}));
          setErrorMessage(err.error || "Failed to remove collaborator.");
          return false;
        }
      } catch {
        setErrorMessage("Network error while removing collaborator.");
        return false;
      } finally {
        setRemovingId(null);
      }
    },
    [projectId]
  );

  return {
    collaborators,
    owner,
    isOwner,
    isLoading,
    isInviting,
    removingId,
    errorMessage,
    setErrorMessage,
    inviteCollaborator,
    removeCollaborator,
  };
}
