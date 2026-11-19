"use client";

import * as React from "react";
import {
  Copy,
  Check,
  UserPlus,
  Trash2,
  Loader2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectCollaborators } from "@/hooks/useProjectCollaborators";

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
  isOwner?: boolean;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

/**
 * ShareDialog allows project owners to invite and remove collaborators by email,
 * view enriched collaborator profiles from Clerk, and copy the room link.
 * Collaborators have read-only access to view the membership list.
 */
export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  isOwner: initialIsOwner = false,
}: ShareDialogProps) {
  const [copied, setCopied] = React.useState(false);
  const [emailInput, setEmailInput] = React.useState("");

  const {
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
  } = useProjectCollaborators({
    projectId,
    open,
    initialIsOwner,
  });

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setEmailInput("");
        setErrorMessage(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, setErrorMessage]
  );

  // Copy project URL to clipboard
  const handleCopyLink = React.useCallback(async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, []);

  // Invite collaborator
  const handleInvite = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const success = await inviteCollaborator(emailInput);
      if (success) {
        setEmailInput("");
      }
    },
    [emailInput, inviteCollaborator]
  );

  // Remove collaborator
  const handleRemove = React.useCallback(
    async (collaboratorId: string) => {
      await removeCollaborator(collaboratorId);
    },
    [removeCollaborator]
  );

  return (
    <EditorDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Share Project"
      description="Collaborate with teammates in real time on this architecture workspace."
      className="sm:max-w-lg"
    >
      <div className="space-y-5">
        {/* Project Link Copy Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-copy-secondary">
            Project Link
          </label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={typeof window !== "undefined" ? window.location.href : ""}
              className="font-mono text-xs text-copy-secondary bg-subtle border-border-subtle select-all"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0 gap-1.5 text-xs font-medium"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-state-success" />
                  <span className="text-state-success font-semibold">
                    Copied!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Invite Form (Owner only) */}
        {isOwner ? (
          <form onSubmit={handleInvite} className="space-y-2">
            <label className="text-xs font-medium text-copy-secondary">
              Invite by Email
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                disabled={isInviting || isLoading}
                className="text-xs bg-subtle border-border-subtle"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={isInviting || isLoading || !emailInput.trim()}
                className="shrink-0 gap-1.5 text-xs"
              >
                {isInviting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                <span>Invite</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-subtle/50 border border-border-subtle text-xs text-copy-muted">
            <ShieldAlert className="h-4 w-4 shrink-0 text-copy-muted" />
            <span>
              You have collaborator access. Only the project owner can invite or
              remove members.
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-state-error/10 border border-state-error/20 text-xs text-state-error font-medium">
            {errorMessage}
          </div>
        )}

        {/* Collaborators List */}
        <div className="space-y-2 pt-1 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-copy-secondary">
              Members & Collaborators
            </span>
            <span className="text-[11px] text-copy-muted">
              {1 + collaborators.length}{" "}
              {1 + collaborators.length === 1 ? "member" : "members"}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-copy-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {/* Owner Item */}
              {owner && (
                <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-subtle/40 border border-border-subtle/60">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {owner.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={owner.avatarUrl}
                        alt={owner.name || "Project Owner"}
                        className="h-8 w-8 rounded-full object-cover shrink-0 border border-border-subtle"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-elevated border border-border-subtle text-copy-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(owner.name, owner.email)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {owner.name ? (
                        <>
                          <p className="text-xs font-medium text-copy-primary truncate">
                            {owner.name}
                          </p>
                          {owner.email && (
                            <p className="text-[11px] text-copy-muted truncate">
                              {owner.email}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs font-medium text-copy-primary truncate">
                          {owner.email || "Project Owner"}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-dim text-accent-primary border border-accent-primary/20 shrink-0">
                    Owner
                  </span>
                </div>
              )}

              {/* Collaborators */}
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="group flex items-center justify-between gap-3 p-2 rounded-xl bg-subtle/20 hover:bg-subtle/40 border border-transparent hover:border-border-subtle transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {collab.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={collab.avatarUrl}
                        alt={collab.name || collab.email}
                        className="h-8 w-8 rounded-full object-cover shrink-0 border border-border-subtle"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-elevated border border-border-subtle text-copy-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(collab.name, collab.email)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {collab.name ? (
                        <>
                          <p className="text-xs font-medium text-copy-primary truncate">
                            {collab.name}
                          </p>
                          <p className="text-[11px] text-copy-muted truncate">
                            {collab.email}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-medium text-copy-primary truncate">
                          {collab.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-subtle text-copy-muted border border-border-subtle">
                      Can edit
                    </span>

                    {/* Owner can remove collaborator */}
                    {isOwner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemove(collab.id)}
                        disabled={removingId === collab.id}
                        aria-label={`Remove ${collab.name || collab.email}`}
                        title="Remove collaborator"
                        className="text-copy-muted hover:text-state-error hover:bg-elevated"
                      >
                        {removingId === collab.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {collaborators.length === 0 && (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center mb-1.5 text-copy-muted">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-copy-muted">
                    No collaborators invited yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </EditorDialog>
  );
}
