"use client";

import * as React from "react";
import type { CanvasNode, CanvasEdge } from "@/types/canvas";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseCanvasAutosaveOptions {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  debounceMs?: number;
  enabled?: boolean;
  onStatusChange?: (status: SaveStatus) => void;
  manualSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  markSavedRef?: React.MutableRefObject<((nodes: CanvasNode[], edges: CanvasEdge[]) => void) | null>;
}

/**
 * Creates a normalized comparison string from nodes and edges to avoid false-positive saves.
 */
function serializeCanvas(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  const cleanNodes = (nodes || []).map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
    style: n.style,
  }));

  const cleanEdges = (edges || []).map((e) => ({
    id: e.id,
    type: e.type,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    data: e.data,
  }));

  return JSON.stringify({ nodes: cleanNodes, edges: cleanEdges });
}

/**
 * Custom hook providing debounced autosave of collaborative canvas state to Vercel Blob and Prisma.
 * Conforms to 21-canvas-autosave.md:
 * - Watches canvas nodes and edges.
 * - Debounces writes to avoid network flooding.
 * - Saves via PUT /api/projects/[projectId]/canvas.
 * - Tracks save status: "idle" | "saving" | "saved" | "error".
 * - Supports manual immediate save trigger.
 */
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  debounceMs = 1800,
  enabled = true,
  onStatusChange,
  manualSaveRef,
  markSavedRef,
}: UseCanvasAutosaveOptions) {
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const lastSavedJsonRef = React.useRef<string>("");
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = React.useRef(false);

  // Notify parent component of status updates
  const updateStatus = React.useCallback(
    (nextStatus: SaveStatus) => {
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);
    },
    [onStatusChange]
  );

  // Core save function
  const performSave = React.useCallback(async () => {
    if (!projectId) return;

    // Clear any pending debounce timer to prevent redundant duplicate saves
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentJson = serializeCanvas(nodes, edges);

    // Skip redundant network writes if state matches previous save, but confirm saved state
    if (currentJson === lastSavedJsonRef.current) {
      updateStatus("saved");
      setTimeout(() => {
        setStatus((current) => (current === "saved" ? "idle" : current));
        onStatusChange?.("idle");
      }, 2000);
      return;
    }

    updateStatus("saving");

    try {
      const res = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });

      if (!res.ok) {
        throw new Error(`Save failed with HTTP ${res.status}`);
      }

      lastSavedJsonRef.current = currentJson;
      updateStatus("saved");

      // Reset status back to idle after 3 seconds of showing "Saved"
      setTimeout(() => {
        setStatus((current) => (current === "saved" ? "idle" : current));
        onStatusChange?.("idle");
      }, 3000);
    } catch (err) {
      console.error("Canvas autosave error:", err);
      updateStatus("error");
    }
  }, [projectId, nodes, edges, updateStatus, onStatusChange]);

  // Wire manual save handler into ref if provided
  React.useEffect(() => {
    if (manualSaveRef) {
      manualSaveRef.current = performSave;
    }
  }, [manualSaveRef, performSave]);

  // Wire markSaved handler into ref to allow initial load to sync without auto-saving
  React.useEffect(() => {
    if (markSavedRef) {
      markSavedRef.current = (loadedNodes: CanvasNode[], loadedEdges: CanvasEdge[]) => {
        lastSavedJsonRef.current = serializeCanvas(loadedNodes, loadedEdges);
      };
    }
  }, [markSavedRef]);

  // Debounced autosave effect
  React.useEffect(() => {
    if (!enabled || !projectId) return;

    // Skip on initial mount frame until nodes are ready
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      lastSavedJsonRef.current = serializeCanvas(nodes, edges);
      return;
    }

    const currentJson = serializeCanvas(nodes, edges);
    if (currentJson === lastSavedJsonRef.current) {
      return;
    }

    // Clear pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Schedule new save
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [nodes, edges, enabled, projectId, debounceMs, performSave]);

  return {
    status,
    saveNow: performSave,
  };
}
