"use client";

import * as React from "react";
import { X, Plus, FolderKanban, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface ProjectSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onNewProject?: () => void;
  className?: string;
}

export function ProjectSidebar({
  isOpen,
  onClose,
  onNewProject,
  className,
}: ProjectSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed top-12 bottom-0 left-0 z-40 w-80 bg-surface/95 backdrop-blur-md border-r border-border-subtle flex flex-col transition-transform duration-300 ease-in-out shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        className
      )}
      aria-label="Projects sidebar"
      aria-hidden={!isOpen}
    >
      {/* Header with Projects title + close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <h2 className="text-sm font-semibold text-copy-primary tracking-wide">
          Projects
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close projects sidebar"
          className="text-copy-muted hover:text-copy-primary hover:bg-subtle"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs: My Projects & Shared */}
      <Tabs defaultValue="my-projects" className="flex flex-col flex-1 overflow-hidden">
        <div className="px-4 pt-3 pb-2 shrink-0">
          <TabsList className="w-full grid grid-cols-2 bg-subtle">
            <TabsTrigger
              value="my-projects"
              className="text-xs data-[state=active]:bg-elevated data-[state=active]:text-copy-primary"
            >
              My Projects
            </TabsTrigger>
            <TabsTrigger
              value="shared"
              className="text-xs data-[state=active]:bg-elevated data-[state=active]:text-copy-primary"
            >
              Shared
            </TabsTrigger>
          </TabsList>
        </div>

        {/* My Projects Tab - Empty Placeholder State */}
        <TabsContent
          value="my-projects"
          className="flex-1 flex flex-col items-center justify-center p-6 text-center outline-none overflow-y-auto"
        >
          <div className="flex flex-col items-center justify-center max-w-[200px]">
            <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center mb-3 text-copy-muted">
              <FolderKanban className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-copy-secondary">No projects yet</p>
            <p className="text-xs text-copy-muted mt-1">
              Create your first project to get started with Ghost AI.
            </p>
          </div>
        </TabsContent>

        {/* Shared Tab - Empty Placeholder State */}
        <TabsContent
          value="shared"
          className="flex-1 flex flex-col items-center justify-center p-6 text-center outline-none overflow-y-auto"
        >
          <div className="flex flex-col items-center justify-center max-w-[200px]">
            <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center mb-3 text-copy-muted">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-copy-secondary">No shared projects</p>
            <p className="text-xs text-copy-muted mt-1">
              Projects shared with you will appear here.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Full-width New Project button at bottom with Plus icon */}
      <div className="p-4 border-t border-border-subtle mt-auto shrink-0">
        <Button
          className="w-full flex items-center justify-center gap-2"
          onClick={onNewProject}
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </Button>
      </div>
    </aside>
  );
}

