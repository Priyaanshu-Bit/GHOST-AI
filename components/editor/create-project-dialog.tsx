"use client";

import * as React from "react";
import { EditorDialog } from "./editor-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";

export function CreateProjectDialog() {
  const {
    isCreateOpen,
    closeCreateDialog,
    projectName,
    setProjectName,
    roomId,
    isLoading,
    error,
    handleCreateProject,
  } = useProjectActions();

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isCreateOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isCreateOpen]);

  return (
    <EditorDialog
      open={isCreateOpen}
      onOpenChange={(open) => {
        if (!open) closeCreateDialog();
      }}
      title="Create Project"
      description="Start a new architecture workspace."
      footerActions={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={closeCreateDialog}
            disabled={isLoading}
            className="text-copy-muted hover:text-copy-primary hover:bg-subtle"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleCreateProject()}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Project"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleCreateProject} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="create-project-name"
            className="text-xs font-medium text-copy-secondary"
          >
            Project Name
          </label>
          <Input
            id="create-project-name"
            ref={inputRef}
            placeholder="e.g. Payment Gateway Architecture"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isLoading}
            className="bg-elevated border-border-subtle text-copy-primary placeholder:text-copy-muted"
          />
        </div>

        {/* Live room ID preview */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-subtle/50 border border-border-subtle">
          <span className="text-xs font-medium text-copy-muted">Room ID Preview</span>
          <div className="flex items-center gap-1.5 text-xs font-mono text-copy-secondary break-all">
            <span className="text-copy-faint select-none">/editor/</span>
            <span className="text-brand font-semibold">
              {roomId}
            </span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-state-error font-medium">{error}</p>
        )}
      </form>
    </EditorDialog>
  );
}
