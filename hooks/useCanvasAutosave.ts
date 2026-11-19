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
 * - Queues follow-up saves if state changes or reverts while a save is in-flight.
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
  // Null represents an unknown baseline before any Blob snapshot has been committed or verified
  const lastSavedJsonRef = React.useRef<string | null>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const statusResetTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = React.useRef(false);
  const hasQueuedSaveRef = React.useRef(false);
  const isMountedRef = React.useRef(false);

  // Keep ref to latest nodes and edges for in-flight comparison
  const latestDataRef = React.useRef({ nodes, edges });
  React.useEffect(() => {
    latestDataRef.current = { nodes, edges };
  }, [nodes, edges]);

  // Cancel any active status-reset timer
  const clearStatusResetTimer = React.useCallback(() => {
    if (statusResetTimerRef.current) {
      clearTimeout(statusResetTimerRef.current);
      statusResetTimerRef.current = null;
    }
  }, []);

  // Update status with timer management
  const updateStatus = React.useCallback(
    (nextStatus: SaveStatus) => {
      clearStatusResetTimer();
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);

      if (nextStatus === "saved") {
        statusResetTimerRef.current = setTimeout(() => {
          statusResetTimerRef.current = null;
          setStatus((cur) => (cur === "saved" ? "idle" : cur));
          onStatusChange?.("idle");
        }, 3000);
      }
    },
    [clearStatusResetTimer, onStatusChange]
  );

  const performSaveRef = React.useRef<() => Promise<void>>(async () => {});

  // Core save function
  const performSave = React.useCallback(async () => {
    if (!projectId) return;

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // If already saving, queue a follow-up and return
    if (isSavingRef.current) {
      hasQueuedSaveRef.current = true;
      return;
    }

    const { nodes: currentNodes, edges: currentEdges } = latestDataRef.current;
    const currentJson = serializeCanvas(currentNodes, currentEdges);

    // If current state matches committed baseline, confirm saved
    if (lastSavedJsonRef.current !== null && currentJson === lastSavedJsonRef.current) {
      updateStatus("saved");
      return;
    }

    isSavingRef.current = true;
    updateStatus("saving");

    try {
      const res = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: currentNodes, edges: currentEdges }),
      });

      if (!res.ok) {
        throw new Error(`Save failed with HTTP ${res.status}`);
      }

      lastSavedJsonRef.current = currentJson;
      updateStatus("saved");
    } catch (err) {
      console.error("Canvas autosave error:", err);
      updateStatus("error");
    } finally {
      isSavingRef.current = false;

      // Check if another change occurred while the write was in flight
      const latestJson = serializeCanvas(
        latestDataRef.current.nodes,
        latestDataRef.current.edges
      );

      if (hasQueuedSaveRef.current || latestJson !== lastSavedJsonRef.current) {
        hasQueuedSaveRef.current = false;
        // Schedule immediate follow-up write
        performSaveRef.current();
      }
    }
  }, [projectId, updateStatus]);

  React.useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  // Wire manual save handler into ref with cleanup
  React.useEffect(() => {
    if (manualSaveRef) {
      manualSaveRef.current = performSave;
      return () => {
        if (manualSaveRef.current === performSave) {
          manualSaveRef.current = null;
        }
      };
    }
  }, [manualSaveRef, performSave]);

  // Wire markSaved handler into ref to record committed Blob baseline without triggering PUT
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

    // Skip on initial mount frame
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    const currentJson = serializeCanvas(nodes, edges);
    if (lastSavedJsonRef.current !== null && currentJson === lastSavedJsonRef.current) {
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

  // Hook cleanup
  React.useEffect(() => {
    return () => {
      clearStatusResetTimer();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [clearStatusResetTimer]);

  return {
    status,
    saveNow: performSave,
  };
}
