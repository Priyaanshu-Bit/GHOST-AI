"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectDialogs } from "@/hooks/use-project-dialogs";

export default function EditorHomePage() {
  const { openCreateDialog } = useProjectDialogs();

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
            onClick={openCreateDialog}
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
