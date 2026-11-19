"use client";

import * as React from "react";
import { Minus, Plus, Maximize2, Undo2, Redo2 } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@liveblocks/react";
import { cn } from "@/lib/utils";

export interface CanvasControlBarProps {
  className?: string;
}

/**
 * Floating pill-shaped control bar at the bottom-left of the canvas.
 * Features:
 * - Zoom controls: zoom out, fit view, zoom in (with smooth 300ms animation).
 * - History controls: Liveblocks undo and redo (with disabled & dimmed states).
 * - Separated by a thin vertical divider.
 */
export function CanvasControlBar({ className }: CanvasControlBarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    zoomOut({ duration: 300 });
  };

  const handleFitView = (e: React.MouseEvent) => {
    e.stopPropagation();
    fitView({ duration: 300 });
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    zoomIn({ duration: 300 });
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canUndo) {
      undo();
    }
  };

  const handleRedo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canRedo) {
      redo();
    }
  };

  const buttonClass =
    "flex items-center justify-center h-8 w-8 rounded-full text-copy-secondary hover:text-copy-primary hover:bg-subtle active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-copy-secondary disabled:cursor-not-allowed disabled:active:scale-100 shrink-0";

  return (
    <div
      className={cn(
        "absolute bottom-6 left-6 z-20 flex items-center gap-1 p-1.5 rounded-full bg-surface/95 backdrop-blur-md border border-border-subtle shadow-2xl select-none nodrag nopan",
        className
      )}
      role="toolbar"
      aria-label="Canvas zoom and history controls"
    >
      {/* Zoom Controls: zoom out, fit view, zoom in */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom out (-)"
          aria-label="Zoom out"
          className={buttonClass}
        >
          <Minus className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleFitView}
          title="Fit view"
          aria-label="Fit view"
          className={buttonClass}
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom in (+)"
          aria-label="Zoom in"
          className={buttonClass}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Thin divider */}
      <div className="w-px h-4 bg-border-subtle mx-0.5" aria-hidden="true" />

      {/* History Controls: undo, redo */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z / ⌘Z)"
          aria-label="Undo"
          className={buttonClass}
        >
          <Undo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z / ⌘Shift+Z / Ctrl+Y)"
          aria-label="Redo"
          className={buttonClass}
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
