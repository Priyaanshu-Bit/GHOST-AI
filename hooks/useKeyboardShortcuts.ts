"use client";

import * as React from "react";
import { useReactFlow } from "@xyflow/react";

export interface KeyboardShortcutsOptions {
  reactFlow?: ReturnType<typeof useReactFlow> | null;
  undo?: () => void;
  redo?: () => void;
}

function isInsideDialog(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest("[role='dialog'], dialog"));
}

/**
 * Checks whether the target element is an editable input, textarea, select, or contenteditable container.
 * In these elements, global canvas shortcuts must be ignored so normal typing, text deletion,
 * and text-field undo/redo work uninterrupted.
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }

  return false;
}

/**
 * Hook to listen for global canvas keyboard shortcuts:
 * - `+` or `=` to zoom in
 * - `-` to zoom out
 * - `Cmd/Ctrl + Z` to undo
 * - `Cmd/Ctrl + Shift + Z` to redo
 * - `Cmd/Ctrl + Y` to redo
 *
 * Automatically skips shortcut execution when user is typing in inputs, textareas,
 * or contenteditable elements.
 */
export function useKeyboardShortcuts(
  instanceOrOptions?:
    | ReturnType<typeof useReactFlow>
    | KeyboardShortcutsOptions
    | null,
  undoArg?: () => void,
  redoArg?: () => void
) {
  // Support either options object or positional arguments
  const isOptionsObject =
    instanceOrOptions &&
    typeof instanceOrOptions === "object" &&
    !("zoomIn" in instanceOrOptions);

  const options = isOptionsObject
    ? (instanceOrOptions as KeyboardShortcutsOptions)
    : undefined;

  const reactFlow = isOptionsObject
    ? options?.reactFlow
    : (instanceOrOptions as ReturnType<typeof useReactFlow> | null | undefined);

  const undo = isOptionsObject ? options?.undo : undoArg;
  const redo = isOptionsObject ? options?.redo : redoArg;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts while user is typing in inputs, textareas, or editable fields
      if (isEditableElement(e.target)) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // 1. Zoom In: `+` or `=`
      if (!isMod && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        reactFlow?.zoomIn({ duration: 300 });
        return;
      }

      // Also support Cmd/Ctrl + `+` or Cmd/Ctrl + `=`
      if (isMod && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        reactFlow?.zoomIn({ duration: 300 });
        return;
      }

      // 2. Zoom Out: `-`
      if (!isMod && e.key === "-") {
        e.preventDefault();
        reactFlow?.zoomOut({ duration: 300 });
        return;
      }

      // Also support Cmd/Ctrl + `-`
      if (isMod && e.key === "-") {
        e.preventDefault();
        reactFlow?.zoomOut({ duration: 300 });
        return;
      }

      // 3. Redo: `Cmd/Ctrl + Shift + Z` or `Cmd/Ctrl + Y`
      if (
        (isMod && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
        (isMod && !e.shiftKey && (e.key === "y" || e.key === "Y"))
      ) {
        if (isInsideDialog(e.target)) {
          return;
        }
        e.preventDefault();
        redo?.();
        return;
      }

      // 4. Undo: `Cmd/Ctrl + Z`
      if (isMod && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        if (isInsideDialog(e.target)) {
          return;
        }
        e.preventDefault();
        undo?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reactFlow, undo, redo]);
}
