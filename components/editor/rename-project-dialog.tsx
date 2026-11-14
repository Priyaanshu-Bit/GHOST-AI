"use client";

import * as React from "react";
import { EditorDialog } from "./editor-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProjectDialogs } from "@/hooks/use-project-dialogs";

export function RenameProjectDialog() {
  const {
    isRenameOpen,
    closeRenameDialog,
    targetProject,
    projectName,
    setProjectName,
    isLoading,
    handleRenameSubmit,
  } = useProjectDialogs();

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isRenameOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isRenameOpen]);

  return (
    <EditorDialog
      open={isRenameOpen}
      onOpenChange={(open) => {
        if (!open) closeRenameDialog();
      }}
      title="Rename Project"
      description={`Enter a new name for "${targetProject?.name ?? ""}".`}
      footerActions={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={closeRenameDialog}
            disabled={isLoading}
            className="text-copy-muted hover:text-copy-primary hover:bg-subtle"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleRenameSubmit()}
            disabled={isLoading}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleRenameSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="rename-project-name"
            className="text-xs font-medium text-copy-secondary"
          >
            Project Name
          </label>
          <Input
            id="rename-project-name"
            ref={inputRef}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isLoading}
            className="bg-elevated border-border-subtle text-copy-primary placeholder:text-copy-muted"
          />
        </div>
      </form>
    </EditorDialog>
  );
}

