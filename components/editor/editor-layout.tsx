"use client";

import * as React from "react";
import { EditorNavbar } from "./editor-navbar";
import { ProjectSidebar } from "./project-sidebar";
import { ProjectDialogsProvider } from "@/hooks/use-project-dialogs";
import { CreateProjectDialog } from "./create-project-dialog";
import { RenameProjectDialog } from "./rename-project-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";

export interface EditorLayoutProps {
  children: React.ReactNode;
  centerSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  defaultSidebarOpen?: boolean;
}

function EditorLayoutContent({
  children,
  centerSection,
  rightSection,
  defaultSidebarOpen = false,
}: EditorLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(defaultSidebarOpen);

  const toggleSidebar = React.useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = React.useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        centerSection={centerSection}
        rightSection={rightSection}
      />
      <div className="relative flex-1 flex overflow-hidden">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />
        <main className="relative flex-1 flex flex-col overflow-hidden bg-base">
          {children}
        </main>
      </div>

      {/* Project dialogs */}
      <CreateProjectDialog />
      <RenameProjectDialog />
      <DeleteProjectDialog />
    </div>
  );
}

export function EditorLayout(props: EditorLayoutProps) {
  return (
    <ProjectDialogsProvider>
      <EditorLayoutContent {...props} />
    </ProjectDialogsProvider>
  );
}
