"use client";

import * as React from "react";
import { Share2, Sparkles, Cloud, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { CreateProjectDialog } from "@/components/editor/create-project-dialog";
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog";
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog";
import { ShareDialog } from "@/components/editor/share-dialog";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { ParticipantAvatars } from "@/components/editor/participant-avatars";
import { AiSidebar } from "@/components/editor/ai-sidebar";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import { CanvasRoom } from "@/components/canvas/canvas-room";
import { ProjectActionsProvider } from "@/hooks/use-project-actions";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import type { SaveStatus } from "@/hooks/useCanvasAutosave";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";

export interface WorkspaceViewProps {
  project: Project;
  ownedProjects: Project[];
  sharedProjects: Project[];
  isOwner?: boolean;
}

/**
 * WorkspaceView renders the full-viewport /editor/[roomId] shell:
 * - Top navbar showing project name, share action, and AI sidebar toggle.
 * - ProjectSidebar on the left with current room highlighted.
 * - Central canvas placeholder with dark background and centered message.
 * - Right sidebar placeholder for future AI chat.
 * - Dialogs for creating, renaming, deleting, and sharing projects.
 */
export function WorkspaceView({
  project,
  ownedProjects,
  sharedProjects,
  isOwner = false,
}: WorkspaceViewProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isAiOpen, setIsAiOpen] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const manualSaveRef = React.useRef<(() => Promise<void>) | null>(null);
  const [templateToImport, setTemplateToImport] =
    React.useState<CanvasTemplate | null>(null);

  const toggleSidebar = React.useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = React.useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const toggleAi = React.useCallback(() => {
    setIsAiOpen((prev) => !prev);
  }, []);

  const handleImportTemplate = React.useCallback(
    (template: CanvasTemplate) => {
      setTemplateToImport(template);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ghost-ai:import-template", { detail: template })
        );
      }
    },
    []
  );

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={project.id}
        initialPresence={{
          cursor: null,
          thinking: false,
          isThinking: false,
          editingNodeId: null,
        }}
      >
        <ProjectActionsProvider activeProjectId={project.id}>
          <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-base text-copy-primary">
            {/* Top Navbar with starter templates entry point & live collaborator presence avatars */}
            <EditorNavbar
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={toggleSidebar}
              onOpenTemplates={() => setIsTemplatesOpen(true)}
              presenceSlot={<ParticipantAvatars />}
              rightSection={
            <div className="flex items-center gap-2">
              {/* Save status button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => manualSaveRef.current?.()}
                disabled={saveStatus === "saving"}
                aria-label={`Save canvas state (${saveStatus})`}
                title={
                  saveStatus === "saving"
                    ? "Saving canvas changes..."
                    : saveStatus === "saved"
                    ? "All canvas changes saved"
                    : saveStatus === "error"
                    ? "Failed to save canvas. Click to retry."
                    : "Save canvas changes now"
                }
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors cursor-pointer",
                  saveStatus === "idle" &&
                    "text-copy-secondary hover:text-copy-primary hover:bg-subtle",
                  saveStatus === "saving" &&
                    "text-accent-primary bg-subtle/60 cursor-wait",
                  saveStatus === "saved" &&
                    "text-state-success bg-state-success/10 hover:bg-state-success/15",
                  saveStatus === "error" &&
                    "text-state-error bg-state-error/10 hover:bg-state-error/15"
                )}
              >
                {saveStatus === "saving" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />
                )}
                {saveStatus === "saved" && (
                  <Check className="h-3.5 w-3.5 text-state-success" />
                )}
                {saveStatus === "error" && (
                  <AlertCircle className="h-3.5 w-3.5 text-state-error" />
                )}
                {saveStatus === "idle" && (
                  <Cloud className="h-3.5 w-3.5 text-copy-muted group-hover:text-copy-primary" />
                )}
                <span className="hidden sm:inline font-medium">
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "saved"
                    ? "Saved"
                    : saveStatus === "error"
                    ? "Save Error"
                    : "Save"}
                </span>
              </Button>

              {/* Share button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsShareOpen(true)}
                className="flex items-center gap-1.5 text-xs text-copy-secondary hover:text-copy-primary hover:bg-subtle"
                title="Share project"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>

              {/* AI sidebar toggle */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleAi}
                aria-label={isAiOpen ? "Close AI assistant" : "Open AI assistant"}
                title={isAiOpen ? "Close AI assistant" : "Open AI assistant"}
                className={cn(
                  "text-copy-secondary hover:text-copy-primary hover:bg-subtle",
                  isAiOpen && "bg-subtle text-accent-ai-text"
                )}
              >
                <Sparkles className="h-4 w-4 text-accent-ai" />
              </Button>
            </div>
          }
        />

        {/* Workspace body: Left Sidebar + Center Canvas + Right AI Sidebar */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* Left Project Sidebar overlay */}
          <ProjectSidebar
            isOpen={isSidebarOpen}
            onClose={closeSidebar}
            ownedProjects={ownedProjects}
            sharedProjects={sharedProjects}
            activeProjectId={project.id}
          />

          {/* Central Liveblocks React Flow Canvas (fills remaining space) */}
          <main className="relative flex-1 flex flex-col overflow-hidden bg-base">
            <CanvasRoom
              projectId={project.id}
              templateToImport={templateToImport}
              onTemplateImported={() => setTemplateToImport(null)}
              onSaveStatusChange={setSaveStatus}
              manualSaveRef={manualSaveRef}
            />
          </main>

          {/* Right AI Sidebar Component */}
          <AiSidebar
            isOpen={isAiOpen}
            onClose={() => setIsAiOpen(false)}
            projectId={project.id}
            roomId={project.id}
          />
        </div>

        {/* Project & Canvas Dialogs */}
        <CreateProjectDialog />
        <RenameProjectDialog />
        <DeleteProjectDialog />
        <ShareDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          projectId={project.id}
          projectName={project.name}
          isOwner={isOwner}
        />
        <StarterTemplatesModal
          open={isTemplatesOpen}
          onOpenChange={setIsTemplatesOpen}
          onImport={handleImportTemplate}
        />
          </div>
        </ProjectActionsProvider>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
