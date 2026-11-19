"use client";

import * as React from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useOthers } from "@liveblocks/react";
import { cn } from "@/lib/utils";

/**
 * Extracts 1-2 character uppercase initials from a user's display name.
 */
function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export interface ParticipantAvatarsProps {
  className?: string;
}

/**
 * ParticipantAvatars displays active room collaborators alongside the Clerk UserButton.
 * Conforms to 19-presence-avatars-cursors.md:
 * - Current user resolved from Clerk and excluded from collaborator list.
 * - Current user rendered exclusively via the Clerk UserButton (no duplicate avatar).
 * - Up to 5 collaborator avatars shown in an overlapping stack with subtle dark ring.
 * - Profile image used when available, falling back to initials with user's presence color.
 * - Overflow chip (+N) shown when more than 5 collaborators are present.
 * - Divider between collaborator avatars and UserButton shown ONLY when at least 1 collaborator exists.
 * - Collaborator avatars are display-only (non-interactive).
 */
export function ParticipantAvatars({ className }: ParticipantAvatarsProps) {
  const { user: currentUser } = useUser();
  const currentUserId = currentUser?.id;

  // Real-time peer participants in the Liveblocks room
  const others = useOthers();

  // Filter out any connection belonging to the current user
  const collaborators = React.useMemo(() => {
    if (!others || others.length === 0) return [];
    return others.filter((other) => other.id !== currentUserId);
  }, [others, currentUserId]);

  const maxVisible = 5;
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const overflowCount = Math.max(0, collaborators.length - maxVisible);

  return (
    <div
      className={cn("flex items-center gap-2 select-none", className)}
      role="group"
      aria-label="Room participants"
    >
      {/* Overlapping collaborator avatar stack */}
      {visibleCollaborators.length > 0 && (
        <div className="flex items-center -space-x-2">
          {visibleCollaborators.map((collaborator) => {
            const name = collaborator.info?.name || "Collaborator";
            const avatarUrl = collaborator.info?.avatar;
            const userColor = collaborator.info?.color || "#00c8d4";
            const initials = getInitials(name);

            return (
              <div
                key={collaborator.connectionId}
                title={name}
                aria-label={name}
                className="relative flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-surface border border-white/10 overflow-hidden shadow-sm pointer-events-none shrink-0"
                style={{
                  backgroundColor: userColor,
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-[10px] font-semibold text-white tracking-wider">
                    {initials}
                  </span>
                )}
              </div>
            );
          })}

          {/* +N Overflow badge when more than 5 collaborators */}
          {overflowCount > 0 && (
            <div
              title={`${overflowCount} more collaborator${overflowCount > 1 ? "s" : ""}`}
              className="relative flex items-center justify-center h-7 w-7 rounded-full bg-subtle border border-border-subtle ring-2 ring-surface text-[10px] font-semibold text-copy-secondary shadow-sm pointer-events-none shrink-0"
            >
              +{overflowCount}
            </div>
          )}
        </div>
      )}

      {/* Divider shown ONLY when at least one collaborator is present */}
      {collaborators.length > 0 && (
        <div
          className="w-px h-4 bg-border-subtle mx-0.5 shrink-0"
          aria-hidden="true"
        />
      )}

      {/* Current user's Clerk profile button */}
      <div className="flex items-center shrink-0">
        <UserButton />
      </div>
    </div>
  );
}
