"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Project, slugify } from "@/types/project";

export interface ProjectActionsContextValue {
  // Dialog visibility states
  isCreateOpen: boolean;
  isRenameOpen: boolean;
  isDeleteOpen: boolean;

  // Selected project for rename / delete
  targetProject: Project | null;

  // Form input state
  projectName: string;
  setProjectName: (name: string) => void;
  suffix: string;
  roomId: string;
  isLoading: boolean;
  error: string | null;

  // Dialog trigger actions
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openRenameDialog: (project: Project) => void;
  closeRenameDialog: () => void;
  openDeleteDialog: (project: Project) => void;
  closeDeleteDialog: () => void;

  // Mutation handlers
  handleCreateProject: (e?: React.FormEvent) => Promise<void>;
  handleRenameProject: (e?: React.FormEvent) => Promise<void>;
  handleDeleteProject: () => Promise<void>;
}

const ProjectActionsContext = React.createContext<ProjectActionsContextValue | null>(null);

export function useProjectActions(): ProjectActionsContextValue {
  const context = React.useContext(ProjectActionsContext);
  if (!context) {
    throw new Error("useProjectActions must be used within a ProjectActionsProvider");
  }
  return context;
}

export function useProjectActionsSafe(): ProjectActionsContextValue | null {
  return React.useContext(ProjectActionsContext);
}

export function ProjectActionsProvider({
  children,
  activeProjectId,
}: {
  children: React.ReactNode;
  activeProjectId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isRenameOpen, setIsRenameOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const [targetProject, setTargetProject] = React.useState<Project | null>(null);
  const [projectName, setProjectName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Compute live room ID preview directly from clean slugified project name (no random suffix)
  const roomId = React.useMemo(() => {
    return slugify(projectName) || "untitled-project";
  }, [projectName]);

  const openCreateDialog = React.useCallback(() => {
    setProjectName("");
    setError(null);
    setIsCreateOpen(true);
  }, []);

  const closeCreateDialog = React.useCallback(() => {
    setIsCreateOpen(false);
    setProjectName("");
    setError(null);
  }, []);

  const openRenameDialog = React.useCallback((project: Project) => {
    setTargetProject(project);
    setProjectName(project.name);
    setError(null);
    setIsRenameOpen(true);
  }, []);

  const closeRenameDialog = React.useCallback(() => {
    setIsRenameOpen(false);
    setTargetProject(null);
    setProjectName("");
    setError(null);
  }, []);

  const openDeleteDialog = React.useCallback((project: Project) => {
    setTargetProject(project);
    setError(null);
    setIsDeleteOpen(true);
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    setIsDeleteOpen(false);
    setTargetProject(null);
    setError(null);
  }, []);

  const handleCreateProject = React.useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setIsLoading(true);
      setError(null);

      try {
        const resolvedName = projectName.trim() || "Untitled Project";

        const res = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: roomId,
            name: resolvedName,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create project");
        }

        const project = await res.json();
        closeCreateDialog();
        router.push(`/editor/${project.id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create project";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [projectName, roomId, closeCreateDialog, router]
  );

  const handleRenameProject = React.useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (!targetProject) return;

      setIsLoading(true);
      setError(null);

      try {
        const newName = projectName.trim() || targetProject.name;

        const res = await fetch(`/api/projects/${targetProject.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newName,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to rename project");
        }

        closeRenameDialog();
        router.refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to rename project";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [targetProject, projectName, closeRenameDialog, router]
  );

  const handleDeleteProject = React.useCallback(async () => {
    if (!targetProject) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${targetProject.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete project");
      }

      const isCurrentWorkspace =
        pathname === `/editor/${targetProject.id}` ||
        activeProjectId === targetProject.id;

      closeDeleteDialog();

      if (isCurrentWorkspace) {
        router.push("/editor");
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete project";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [targetProject, pathname, activeProjectId, closeDeleteDialog, router]);

  const value = React.useMemo<ProjectActionsContextValue>(
    () => ({
      isCreateOpen,
      isRenameOpen,
      isDeleteOpen,
      targetProject,
      projectName,
      setProjectName,
      suffix: "",
      roomId,
      isLoading,
      error,
      openCreateDialog,
      closeCreateDialog,
      openRenameDialog,
      closeRenameDialog,
      openDeleteDialog,
      closeDeleteDialog,
      handleCreateProject,
      handleRenameProject,
      handleDeleteProject,
    }),
    [
      isCreateOpen,
      isRenameOpen,
      isDeleteOpen,
      targetProject,
      projectName,
      roomId,
      isLoading,
      error,
      openCreateDialog,
      closeCreateDialog,
      openRenameDialog,
      closeRenameDialog,
      openDeleteDialog,
      closeDeleteDialog,
      handleCreateProject,
      handleRenameProject,
      handleDeleteProject,
    ]
  );

  return (
    <ProjectActionsContext.Provider value={value}>
      {children}
    </ProjectActionsContext.Provider>
  );
}
