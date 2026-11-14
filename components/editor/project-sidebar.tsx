"use client";

import * as React from "react";
import { X, Plus, FolderKanban, Users, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";
import { useProjectDialogsSafe } from "@/hooks/use-project-dialogs";

export interface ProjectSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onNewProject?: () => void;
  onRenameProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  ownedProjects?: Project[];
  sharedProjects?: Project[];
  activeProjectId?: string;
  className?: string;
}

/**
 * Renders a project sidebar overlay with My Projects and Shared tabs.
 * Supports project item actions (rename, delete) on owned projects only.
 * Includes a mobile backdrop scrim that closes the sidebar when tapped outside.
 */
export function ProjectSidebar({
  isOpen,
  onClose,
  onNewProject,
  onRenameProject,
  onDeleteProject,
  ownedProjects: propsOwned,
  sharedProjects: propsShared,
  activeProjectId,
  className,
}: ProjectSidebarProps) {
  const contextValue = useProjectDialogsSafe();

  const owned = propsOwned ?? contextValue?.ownedProjects ?? [];
  const shared = propsShared ?? contextValue?.sharedProjects ?? [];

  const handleNewProject = onNewProject ?? contextValue?.openCreateDialog;
  const handleRename = onRenameProject ?? contextValue?.openRenameDialog;
  const handleDelete = onDeleteProject ?? contextValue?.openDeleteDialog;

  return (
    <>
      {/* Mobile backdrop scrim */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

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

          {/* My Projects Tab */}
          <TabsContent
            value="my-projects"
            className="flex-1 overflow-y-auto px-3 py-2 outline-none"
          >
            {owned.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center mb-3 text-copy-muted">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-copy-secondary">No projects yet</p>
                <p className="text-xs text-copy-muted mt-1">
                  Create your first project to get started with Ghost AI.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {owned.map((project) => (
                  <li
                    key={project.id}
                    className={cn(
                      "group flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors select-none",
                      activeProjectId === project.id
                        ? "bg-elevated text-copy-primary border border-border-subtle"
                        : "text-copy-secondary hover:text-copy-primary hover:bg-subtle"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FolderKanban className="h-4 w-4 text-copy-muted shrink-0 group-hover:text-copy-secondary" />
                      <span className="truncate">{project.name}</span>
                    </div>

                    {/* Actions: Show only for owned projects */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename?.(project);
                        }}
                        aria-label={`Rename ${project.name}`}
                        title="Rename project"
                        className="text-copy-muted hover:text-copy-primary hover:bg-elevated"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete?.(project);
                        }}
                        aria-label={`Delete ${project.name}`}
                        title="Delete project"
                        className="text-copy-muted hover:text-state-error hover:bg-elevated"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* Shared Tab */}
          <TabsContent
            value="shared"
            className="flex-1 overflow-y-auto px-3 py-2 outline-none"
          >
            {shared.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center mb-3 text-copy-muted">
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-copy-secondary">No shared projects</p>
                <p className="text-xs text-copy-muted mt-1">
                  Projects shared with you will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {shared.map((project) => (
                  <li
                    key={project.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors select-none",
                      activeProjectId === project.id
                        ? "bg-elevated text-copy-primary border border-border-subtle"
                        : "text-copy-secondary hover:text-copy-primary hover:bg-subtle"
                    )}
                  >
                    <Users className="h-4 w-4 text-copy-muted shrink-0" />
                    <span className="truncate flex-1">{project.name}</span>
                    {/* Note: Actions are hidden for shared projects */}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        {/* Full-width New Project button at bottom with Plus icon */}
        <div className="p-4 border-t border-border-subtle mt-auto shrink-0">
          <Button
            className="w-full flex items-center justify-center gap-2"
            onClick={handleNewProject}
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
