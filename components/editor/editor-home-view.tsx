"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorLayout } from "@/components/editor/editor-layout";
import { useProjectActionsSafe } from "@/hooks/use-project-actions";
import { Project } from "@/types/project";

export interface EditorHomeViewProps {
  ownedProjects: Project[];
  sharedProjects: Project[];
}

function EditorHomeCenter() {
  const actions = useProjectActionsSafe();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the sidebar.
        </p>
        <div className="pt-2 flex justify-center">
          <Button
            onClick={actions?.openCreateDialog}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Client surface for the /editor home page.
 * Receives server-fetched projects and connects them to the sidebar and project dialogs.
 */
export function EditorHomeView({
  ownedProjects,
  sharedProjects,
}: EditorHomeViewProps) {
  return (
    <EditorLayout
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    >
      <EditorHomeCenter />
    </EditorLayout>
  );
}
