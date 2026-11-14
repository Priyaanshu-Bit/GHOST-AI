"use client";

import * as React from "react";
import { EditorDialog } from "./editor-dialog";
import { Button } from "@/components/ui/button";
import { useProjectDialogs } from "@/hooks/use-project-dialogs";

export function DeleteProjectDialog() {
  const {
    isDeleteOpen,
    closeDeleteDialog,
    targetProject,
    isLoading,
    handleDeleteSubmit,
  } = useProjectDialogs();

  return (
    <EditorDialog
      open={isDeleteOpen}
      onOpenChange={(open) => {
        if (!open) closeDeleteDialog();
      }}
      title="Delete Project"
      description={
        <span>
          Are you sure you want to delete{" "}
          <strong className="text-copy-primary font-medium">
            &ldquo;{targetProject?.name ?? "this project"}&rdquo;
          </strong>
          ? This action cannot be undone.
        </span>
      }
      footerActions={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={closeDeleteDialog}
            disabled={isLoading}
            className="text-copy-muted hover:text-copy-primary hover:bg-subtle"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteSubmit}
            disabled={isLoading}
          >
            Delete Project
          </Button>
        </>
      }
    >
      <p className="text-xs text-copy-muted">
        All canvas nodes, edges, specifications, and project metadata associated
        with this workspace will be permanently removed.
      </p>
    </EditorDialog>
  );
}

