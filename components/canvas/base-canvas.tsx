"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionMode,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  SelectionMode,
  type Connection,
} from "@xyflow/react";
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow";
import { useUndo, useRedo, useUpdateMyPresence, useEventListener } from "@liveblocks/react";
import { Loader2 } from "lucide-react";
import { CanvasNodeComponent } from "@/components/canvas/canvas-node";
import { CanvasEdgeComponent } from "@/components/canvas/canvas-edge";
import { ShapePanel, type ShapeDefinition } from "@/components/canvas/shape-panel";
import { CanvasControlBar } from "@/components/canvas/canvas-control-bar";
import { NodeShapeView } from "@/components/canvas/node-shape-view";
import { PeerCursor } from "@/components/canvas/peer-cursor";
import { CanvasFlowContext } from "@/components/canvas/canvas-context";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCanvasAutosave, type SaveStatus } from "@/hooks/useCanvasAutosave";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import {
  CANVAS_NODE_TYPE,
  CANVAS_EDGE_TYPE,
  DEFAULT_NODE_COLOR,
  type CanvasNode,
  type CanvasEdge,
  type NodeShape,
} from "@/types/canvas";
import "@xyflow/react/dist/style.css";
import "@liveblocks/react-flow/styles.css";
import "@liveblocks/react-ui/styles.css";

const nodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNodeComponent,
};

const edgeTypes = {
  [CANVAS_EDGE_TYPE]: CanvasEdgeComponent,
};

const defaultEdgeOptions = {
  type: CANVAS_EDGE_TYPE,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#94a3b8",
    width: 16,
    height: 16,
  },
};

let nodeCounter = 0;

interface GhostPreviewState {
  shape: NodeShape;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface BaseCanvasProps {
  projectId?: string;
  templateToImport?: CanvasTemplate | null;
  onTemplateImported?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
  manualSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

/**
 * Inner canvas flow component that has access to ReactFlowProvider context.
 * Handles dragover, ghost preview tracking, and drop events to instantiate new nodes.
 */
function CanvasFlow({
  projectId,
  templateToImport,
  onTemplateImported,
  onSaveStatusChange,
  manualSaveRef,
}: BaseCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: {
        initial: [],
      },
      edges: {
        initial: [],
      },
    });

  const reactFlow = useReactFlow();
  const {
    screenToFlowPosition,
    getNode,
    getEdge,
    updateNodeData,
    updateEdgeData,
    fitView,
  } = reactFlow;
  const undo = useUndo();
  const redo = useRedo();
  const updateMyPresence = useUpdateMyPresence();

  // Provide synchronous access to current canvas nodes & edges for AI spec generation
  React.useEffect(() => {
    const handleGetState = (e: Event) => {
      const customEvent = e as CustomEvent<{
        callback?: (state: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => void;
      }>;
      if (typeof customEvent.detail?.callback === "function") {
        customEvent.detail.callback({ nodes, edges });
      }
    };

    window.addEventListener("ghost-ai:get-canvas-state", handleGetState);
    return () => {
      window.removeEventListener("ghost-ai:get-canvas-state", handleGetState);
    };
  }, [nodes, edges]);

  // Virtual AI presence cursor broadcast from background tasks
  const [aiPresence, setAiPresence] = React.useState<{
    cursor: { x: number; y: number } | null;
    thinking: boolean;
  } | null>(null);

  useEventListener(({ event }) => {
    if (event.type === "ai-presence") {
      setAiPresence({
        cursor: event.cursor,
        thinking: Boolean(event.thinking || event.isThinking),
      });
    }
  });

  // Ref to allow initial load to mark canvas snapshot as saved without autosave firing
  const markSavedRef = React.useRef<
    ((loadedNodes: CanvasNode[], loadedEdges: CanvasEdge[]) => void) | null
  >(null);

  // Debounced autosave hook persisting canvas state to Vercel Blob and Prisma
  useCanvasAutosave({
    projectId: projectId || "",
    nodes: nodes || [],
    edges: edges || [],
    onStatusChange: onSaveStatusChange,
    manualSaveRef,
    markSavedRef,
  });

  // Track whether we have checked and handled the initial load for this project
  const hasAttemptedInitialLoadRef = React.useRef(false);

  // Initial load: fetch saved canvas state if room is empty; skip if room already has elements
  React.useEffect(() => {
    if (!projectId || hasAttemptedInitialLoadRef.current) return;

    // If the room already has nodes or edges, skip the load entirely to avoid overwriting active collaboration
    if ((nodes && nodes.length > 0) || (edges && edges.length > 0)) {
      hasAttemptedInitialLoadRef.current = true;
      return;
    }

    hasAttemptedInitialLoadRef.current = true;
    let isCancelled = false;

    async function loadInitialSavedCanvas() {
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`);
        if (!res.ok) return;

        const data = await res.json();
        if (isCancelled) return;

        const savedNodes: CanvasNode[] = Array.isArray(data.nodes) ? data.nodes : [];
        const savedEdges: CanvasEdge[] = Array.isArray(data.edges) ? data.edges : [];

        // If saved canvas has elements, load them into the room
        if (savedNodes.length > 0 || savedEdges.length > 0) {
          // Double-check room elements haven't been added during fetch
          if (reactFlow.getNodes().length > 0 || reactFlow.getEdges().length > 0) {
            return;
          }

          // Pre-sync snapshot in autosave ref to avoid triggering an immediate autosave
          markSavedRef.current?.(savedNodes, savedEdges);

          const nodeAddChanges = savedNodes.map((n) => ({
            type: "add" as const,
            item: n,
          }));
          const edgeAddChanges = savedEdges.map((e) => ({
            type: "add" as const,
            item: e,
          }));

          onNodesChange(nodeAddChanges);
          onEdgesChange(edgeAddChanges);

          requestAnimationFrame(() => {
            setTimeout(() => {
              fitView({ duration: 400, padding: 0.2 });
            }, 80);
          });
        }
      } catch (err) {
        console.error("Failed to load initial saved canvas:", err);
      }
    }

    loadInitialSavedCanvas();

    return () => {
      isCancelled = true;
    };
  }, [projectId, nodes, edges, onNodesChange, onEdgesChange, fitView, reactFlow]);

  // Broadcast cursor position on React Flow mouse events
  const handleMouseMove = React.useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      updateMyPresence({ cursor: position });
    },
    [screenToFlowPosition, updateMyPresence]
  );

  // Clear cursor position to null on mouse leave
  const handleMouseLeave = React.useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  // Listen for canvas keyboard shortcuts (+/= zoom in, - zoom out, Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z/Y redo)
  useKeyboardShortcuts({
    reactFlow,
    undo,
    redo,
  });

  // Handler to replace canvas content with a starter template in collaborative state
  const handleImportTemplate = React.useCallback(
    (template: CanvasTemplate) => {
      // 1. Clear all existing nodes and edges first
      if ((nodes && nodes.length > 0) || (edges && edges.length > 0)) {
        onDelete({
          nodes: nodes || [],
          edges: edges || [],
        });
      }

      // 2. Add the selected template nodes and edges after canvas is cleared
      const nodeAddChanges = template.nodes.map((n) => ({
        type: "add" as const,
        item: n,
      }));
      const edgeAddChanges = template.edges.map((e) => ({
        type: "add" as const,
        item: e,
      }));

      onNodesChange(nodeAddChanges);
      onEdgesChange(edgeAddChanges);

      // 3. Fit view with smooth animation after loading
      requestAnimationFrame(() => {
        setTimeout(() => {
          fitView({ duration: 400, padding: 0.2 });
        }, 80);
      });
    },
    [nodes, edges, onDelete, onNodesChange, onEdgesChange, fitView]
  );

  // Handle template imports triggered via props
  React.useEffect(() => {
    if (templateToImport) {
      handleImportTemplate(templateToImport);
      onTemplateImported?.();
    }
  }, [templateToImport, handleImportTemplate, onTemplateImported]);

  // Handle template imports triggered via global window event
  React.useEffect(() => {
    const onCustomImport = (e: Event) => {
      const customEvent = e as CustomEvent<CanvasTemplate>;
      if (customEvent.detail) {
        handleImportTemplate(customEvent.detail);
      }
    };

    window.addEventListener("ghost-ai:import-template", onCustomImport);
    return () => {
      window.removeEventListener("ghost-ai:import-template", onCustomImport);
    };
  }, [handleImportTemplate]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync label updates through both local React Flow state and Liveblocks onNodesChange
  const updateNodeLabel = React.useCallback(
    (id: string, label: string) => {
      // 1. Immediately update local React Flow store
      updateNodeData(id, { label });

      // 2. Synchronize through Liveblocks onNodesChange flow
      const node = getNode(id);
      if (node) {
        onNodesChange([
          {
            type: "replace",
            id,
            item: {
              ...node,
              type: CANVAS_NODE_TYPE,
              data: {
                ...node.data,
                label,
              },
            } as CanvasNode,
          },
        ]);
      }
    },
    [getNode, updateNodeData, onNodesChange]
  );

  // Sync color updates through both local React Flow state and Liveblocks onNodesChange
  const updateNodeColor = React.useCallback(
    (id: string, color: string, textColor: string) => {
      // 1. Immediately update local React Flow store
      updateNodeData(id, { color, textColor });

      // 2. Synchronize through Liveblocks onNodesChange flow
      const node = getNode(id);
      if (node) {
        onNodesChange([
          {
            type: "replace",
            id,
            item: {
              ...node,
              type: CANVAS_NODE_TYPE,
              data: {
                ...node.data,
                color,
                textColor,
              },
            } as CanvasNode,
          },
        ]);
      }
    },
    [getNode, updateNodeData, onNodesChange]
  );

  // Sync edge label updates through both local React Flow state and Liveblocks onEdgesChange
  const updateEdgeLabel = React.useCallback(
    (id: string, label: string) => {
      // 1. Immediately update local React Flow store
      updateEdgeData(id, { label });

      // 2. Synchronize through Liveblocks onEdgesChange flow
      const edge = getEdge(id);
      if (edge) {
        onEdgesChange([
          {
            type: "replace",
            id,
            item: {
              ...edge,
              type: CANVAS_EDGE_TYPE,
              data: {
                ...edge.data,
                label,
              },
            } as CanvasEdge,
          },
        ]);
      }
    },
    [getEdge, updateEdgeData, onEdgesChange]
  );

  // Create new connections with directional arrows and default settings
  const onConnect = React.useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: CanvasEdge = {
        id: `edge-${connection.source}-${connection.sourceHandle || "default"}-${connection.target}-${connection.targetHandle || "default"}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: CANVAS_EDGE_TYPE,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#94a3b8",
          width: 16,
          height: 16,
        },
        data: {
          label: "",
        },
      };

      onEdgesChange([{ type: "add", item: newEdge }]);
    },
    [onEdgesChange]
  );

  // Active shape being dragged from the panel
  const activeDraggedShapeRef = React.useRef<ShapeDefinition | null>(null);

  // Ghost preview state positioned relative to the canvas container
  const [ghostPreview, setGhostPreview] =
    React.useState<GhostPreviewState | null>(null);

  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const shapeDef = activeDraggedShapeRef.current;
    if (shapeDef && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setGhostPreview({
        shape: shapeDef.shape,
        width: shapeDef.defaultWidth,
        height: shapeDef.defaultHeight,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  }, []);

  const onDragLeave = React.useCallback((event: React.DragEvent) => {
    // Only dismiss preview if cursor leaves the canvas container
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setGhostPreview(null);
    }
  }, []);

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setGhostPreview(null);
      activeDraggedShapeRef.current = null;

      const rawData =
        event.dataTransfer.getData("application/reactflow") ||
        event.dataTransfer.getData("application/json");

      if (!rawData) return;

      try {
        const payload = JSON.parse(rawData);
        const { shape, width = 160, height = 80 } = payload;

        if (!shape) return;

        // Convert screen drop coordinates to React Flow canvas coordinates
        const flowPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        nodeCounter += 1;
        const nodeId = `${shape}-${Date.now()}-${nodeCounter}`;

        const newNode: CanvasNode = {
          id: nodeId,
          type: CANVAS_NODE_TYPE,
          position: {
            x: Math.round(flowPosition.x - width / 2),
            y: Math.round(flowPosition.y - height / 2),
          },
          data: {
            label: "",
            shape,
            color: DEFAULT_NODE_COLOR.fill,
            textColor: DEFAULT_NODE_COLOR.text,
          },
          style: {
            width,
            height,
          },
        };

        // Sync new node creation to Liveblocks and connected peers
        onNodesChange([{ type: "add", item: newNode }]);
      } catch (err) {
        console.error("Failed to parse dragged shape payload:", err);
      }
    },
    [screenToFlowPosition, onNodesChange]
  );

  return (
    <CanvasFlowContext.Provider
      value={{ updateNodeLabel, updateNodeColor, updateEdgeLabel }}
    >
      <div
        ref={containerRef}
        className="w-full h-full relative select-none"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDelete={onDelete}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={["Backspace", "Delete"]}
          selectionOnDrag={true}
          selectionMode={SelectionMode.Partial}
          panOnDrag={[1, 2]}
          panActivationKeyCode="Space"
          fitView
          className="bg-base"
          proOptions={{ hideAttribution: true }}
        >
          {/* Dot-pattern background matching dark technical canvas design */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#2a2a30"
            className="bg-base"
          />

          {/* MiniMap in lower right corner */}
          <MiniMap
            zoomable
            pannable
            className="!bg-surface !border-border-subtle !rounded-xl !border overflow-hidden shadow-2xl"
            maskColor="rgba(8, 8, 9, 0.75)"
            nodeColor="#2a2a30"
          />

          {/* Liveblocks collaborative peer cursors */}
          <Cursors components={{ Cursor: PeerCursor }} />

          {/* Virtual AI cursor rendered when AI background task is active */}
          {aiPresence?.cursor && (
            <div
              className="pointer-events-none absolute z-50 select-none transition-all duration-150"
              style={{
                left: aiPresence.cursor.x,
                top: aiPresence.cursor.y,
              }}
            >
              <svg
                className="w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transform -translate-x-[1px] -translate-y-[1px]"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.5 0.5L6.5 15.5L9.5 9.5L15.5 6.5L0.5 0.5Z"
                  fill="#6457F9"
                  stroke="#080809"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute left-3 top-3 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-xl flex items-center gap-1.5 bg-[#6457F9]">
                {aiPresence.thinking && (
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-white shrink-0" />
                )}
                <span>Ghost AI (Architect)</span>
              </div>
            </div>
          )}
        </ReactFlow>

        {/* Ghost preview attached to cursor while dragging a shape onto the canvas */}
        {ghostPreview && (
          <div
            className="pointer-events-none absolute z-30 transition-none"
            style={{
              left: ghostPreview.x - ghostPreview.width / 2,
              top: ghostPreview.y - ghostPreview.height / 2,
              width: ghostPreview.width,
              height: ghostPreview.height,
            }}
          >
            <NodeShapeView
              shape={ghostPreview.shape}
              label=""
              isGhost
            />
          </div>
        )}

        {/* Floating pill-shaped control bar at bottom-left for zoom and history */}
        <CanvasControlBar />

        {/* Floating pill-shaped bottom toolbar for dragging shapes */}
        <ShapePanel
          onShapeDragStart={(shapeDef) => {
            activeDraggedShapeRef.current = shapeDef;
          }}
          onShapeDragEnd={() => {
            activeDraggedShapeRef.current = null;
            setGhostPreview(null);
          }}
        />
      </div>
    </CanvasFlowContext.Provider>
  );
}

/**
 * Base collaborative canvas component wrapped in ReactFlowProvider.
 */
export function BaseCanvas({
  projectId,
  templateToImport,
  onTemplateImported,
  onSaveStatusChange,
  manualSaveRef,
}: BaseCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasFlow
        projectId={projectId}
        templateToImport={templateToImport}
        onTemplateImported={onTemplateImported}
        onSaveStatusChange={onSaveStatusChange}
        manualSaveRef={manualSaveRef}
      />
    </ReactFlowProvider>
  );
}
