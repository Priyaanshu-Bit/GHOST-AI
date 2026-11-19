"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeftOpen, LayoutTemplate } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EditorNavbarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenTemplates?: () => void;
  presenceSlot?: React.ReactNode;
  centerSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Renders editor navigation with a sidebar toggle and center/right content.
 * The caller controls sidebar state through `isSidebarOpen` (false by default)
 * and handles toggle clicks through `onToggleSidebar`.
 * Uses `children` as center content when `centerSection` is falsy.
 * Includes Clerk UserButton in the right section for profile and session management.
 * Provides starter templates entry point via `onOpenTemplates`.
 * Optionally accepts `presenceSlot` for rendering canvas room collaborator avatars.
 */
export function EditorNavbar({
  isSidebarOpen = false,
  onToggleSidebar,
  onOpenTemplates,
  presenceSlot,
  centerSection,
  rightSection,
  children,
  className,
}: EditorNavbarProps) {
  return (
    <header
      className={cn(
        "h-12 w-full bg-surface border-b border-border-subtle px-4 flex items-center justify-between select-none shrink-0 z-30",
        className
      )}
    >
      {/* Left section: contains sidebar toggle button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="text-copy-secondary hover:text-copy-primary hover:bg-subtle"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Center section */}
      <div className="flex items-center justify-center">
        {centerSection || children}
      </div>

      {/* Right section: template entry point + custom actions + Clerk UserButton */}
      <div className="flex items-center justify-end gap-2">
        {onOpenTemplates && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 text-xs text-copy-secondary hover:text-copy-primary hover:bg-subtle cursor-pointer"
            title="Starter Architecture Templates"
            aria-label="Open starter templates"
          >
            <LayoutTemplate className="h-3.5 w-3.5 text-accent-primary" />
            <span className="hidden sm:inline font-medium">Templates</span>
          </Button>
        )}
        {rightSection}
        {presenceSlot ? (
          <div className="flex items-center pl-1">{presenceSlot}</div>
        ) : (
          <UserButton />
        )}
      </div>
    </header>
  );
}
