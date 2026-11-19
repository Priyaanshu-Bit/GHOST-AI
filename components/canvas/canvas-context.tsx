"use client";

import * as React from "react";

export interface CanvasFlowContextValue {
  /**
   * Updates a node's label and syncs the mutation to Liveblocks and remote peers.
   */
  updateNodeLabel: (id: string, label: string) => void;

  /**
   * Updates a node's color and textColor and syncs the mutation to Liveblocks and remote peers.
   */
  updateNodeColor: (id: string, color: string, textColor: string) => void;

  /**
   * Updates an edge's label and syncs the mutation to Liveblocks and remote peers.
   */
  updateEdgeLabel: (id: string, label: string) => void;
}

export const CanvasFlowContext =
  React.createContext<CanvasFlowContextValue | null>(null);

/**
 * Hook to access canvas flow mutation actions from within custom node components.
 */
export function useCanvasFlow() {
  return React.useContext(CanvasFlowContext);
}
