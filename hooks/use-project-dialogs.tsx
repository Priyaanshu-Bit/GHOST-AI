"use client";

import * as React from "react";
import {
  Project,
  slugify,
  INITIAL_MOCK_OWNED_PROJECTS,
  INITIAL_MOCK_SHARED_PROJECTS,
} from "@/types/project";

export interface ProjectDialogsContextValue {
  // Dialog visibility states
  isCreateOpen: boolean;
  isRenameOpen: boolean;
  isDeleteOpen: boolean;

  // Selected project for rename / delete
  targetProject: Project | null;

  // Form input state
  projectName: string;
  setProjectName: (name: string) => void;
  slug: string;
  isLoading: boolean;

  // Project lists (mock data)
  ownedProjects: Project[];
  sharedProjects: Project[];

  // Dialog trigger actions
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openRenameDialog: (project: Project) => void;
  closeRenameDialog: () => void;
  openDeleteDialog: (project: Project) => void;
  closeDeleteDialog: () => void;

  // Form submit handlers
  handleCreateSubmit: (e?: React.FormEvent) => void;
  handleRenameSubmit: (e?: React.FormEvent) => void;
  handleDeleteSubmit: () => void;
}

const ProjectDialogsContext = React.createContext<ProjectDialogsContextValue | null>(null);

export function useProjectDialogs(): ProjectDialogsContextValue {
  const context = React.useContext(ProjectDialogsContext);
  if (!context) {
    throw new Error("useProjectDialogs must be used within a ProjectDialogsProvider");
  }
  return context;
}

export function useProjectDialogsSafe(): ProjectDialogsContextValue | null {
  return React.useContext(ProjectDialogsContext);
}

export function ProjectDialogsProvider({
  children,
  initialOwned = INITIAL_MOCK_OWNED_PROJECTS,
  initialShared = INITIAL_MOCK_SHARED_PROJECTS,
}: {
  children: React.ReactNode;
  initialOwned?: Project[];
  initialShared?: Project[];
}) {
  const [ownedProjects, setOwnedProjects] = React.useState<Project[]>(initialOwned);
  const [sharedProjects] = React.useState<Project[]>(initialShared);

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isRenameOpen, setIsRenameOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const [targetProject, setTargetProject] = React.useState<Project | null>(null);
  const [projectName, setProjectName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Live slug preview updates as user types
  const slug = React.useMemo(() => {
    return slugify(projectName);
  }, [projectName]);

  const openCreateDialog = React.useCallback(() => {
    setProjectName("");
    setIsCreateOpen(true);
  }, []);

  const closeCreateDialog = React.useCallback(() => {
    setIsCreateOpen(false);
    setProjectName("");
  }, []);

  const openRenameDialog = React.useCallback((project: Project) => {
    setTargetProject(project);
    setProjectName(project.name);
    setIsRenameOpen(true);
  }, []);

  const closeRenameDialog = React.useCallback(() => {
    setIsRenameOpen(false);
    setTargetProject(null);
    setProjectName("");
  }, []);

  const openDeleteDialog = React.useCallback((project: Project) => {
    setTargetProject(project);
    setIsDeleteOpen(true);
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    setIsDeleteOpen(false);
    setTargetProject(null);
  }, []);

  const handleCreateSubmit = React.useCallback(
    (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setIsLoading(true);

      const resolvedName = projectName.trim() || "Untitled Project";
      const resolvedSlug = slugify(resolvedName) || "untitled-project";
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: resolvedName,
        slug: resolvedSlug,
        isOwner: true,
        updatedAt: "Just now",
        createdAt: new Date().toISOString(),
      };

      setOwnedProjects((prev) => [newProject, ...prev]);
      setIsLoading(false);
      closeCreateDialog();
    },
    [projectName, closeCreateDialog]
  );

  const handleRenameSubmit = React.useCallback(
    (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (!targetProject) return;

      setIsLoading(true);
      const newName = projectName.trim() || targetProject.name;
      const newSlug = slugify(newName) || targetProject.slug;

      setOwnedProjects((prev) =>
        prev.map((p) =>
          p.id === targetProject.id
            ? { ...p, name: newName, slug: newSlug, updatedAt: "Just now" }
            : p
        )
      );

      setIsLoading(false);
      closeRenameDialog();
    },
    [targetProject, projectName, closeRenameDialog]
  );

  const handleDeleteSubmit = React.useCallback(() => {
    if (!targetProject) return;

    setIsLoading(true);
    setOwnedProjects((prev) => prev.filter((p) => p.id !== targetProject.id));
    setIsLoading(false);
    closeDeleteDialog();
  }, [targetProject, closeDeleteDialog]);

  const value = React.useMemo<ProjectDialogsContextValue>(
    () => ({
      isCreateOpen,
      isRenameOpen,
      isDeleteOpen,
      targetProject,
      projectName,
      setProjectName,
      slug,
      isLoading,
      ownedProjects,
      sharedProjects,
      openCreateDialog,
      closeCreateDialog,
      openRenameDialog,
      closeRenameDialog,
      openDeleteDialog,
      closeDeleteDialog,
      handleCreateSubmit,
      handleRenameSubmit,
      handleDeleteSubmit,
    }),
    [
      isCreateOpen,
      isRenameOpen,
      isDeleteOpen,
      targetProject,
      projectName,
      slug,
      isLoading,
      ownedProjects,
      sharedProjects,
      openCreateDialog,
      closeCreateDialog,
      openRenameDialog,
      closeRenameDialog,
      openDeleteDialog,
      closeDeleteDialog,
      handleCreateSubmit,
      handleRenameSubmit,
      handleDeleteSubmit,
    ]
  );

  return (
    <ProjectDialogsContext.Provider value={value}>
      {children}
    </ProjectDialogsContext.Provider>
  );
}
