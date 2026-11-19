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
  ViewportPortal,
  type Connection,
} from "@xyflow/react";
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow";
import {
  useUndo,
  useRedo,
  useUpdateMyPresence,
  useEventListener,
  useRoom,
  useStorage,
  useMutation,
} from "@liveblocks/react";
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
  NODE_SHAPES,
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

  const room = useRoom();
  const isInitialized = useStorage((root) => (root as Record<string, unknown>)?.isInitialized);
  const markInitialized = useMutation(({ storage }) => {
    (storage as unknown as { set: (k: string, v: unknown) => void }).set("isInitialized", true);
  }, []);

  const isRestoringRef = React.useRef(false);
  const hasCompletedRestoreRef = React.useRef(false);

  // If room already has nodes/edges, ensure it is marked as initialized
  React.useEffect(() => {
    if ((nodes && nodes.length > 0) || (edges && edges.length > 0)) {
      if (!isInitialized) {
        markInitialized();
      }
      hasCompletedRestoreRef.current = true;
    }
  }, [nodes, edges, isInitialized, markInitialized]);

  // Initial load: fetch saved canvas state only if room has never been initialized
  React.useEffect(() => {
    if (!projectId || hasCompletedRestoreRef.current || isRestoringRef.current) return;
    if (isInitialized) {
      hasCompletedRestoreRef.current = true;
      return;
    }

    let isCancelled = false;
    let retryTimer: NodeJS.Timeout | null = null;

    async function loadInitialSavedCanvas() {
      isRestoringRef.current = true;
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`);
        if (!res.ok) {
          // Leave recoverable load state and retry after bounded backoff
          isRestoringRef.current = false;
          if (!isCancelled) {
            retryTimer = setTimeout(() => {
              if (!isCancelled && !hasCompletedRestoreRef.current) {
                loadInitialSavedCanvas();
              }
            }, 3000);
          }
          return;
        }

        const data = await res.json();
        if (isCancelled) {
          isRestoringRef.current = false;
          return;
        }

        const savedNodes: CanvasNode[] = Array.isArray(data.nodes) ? data.nodes : [];
        const savedEdges: CanvasEdge[] = Array.isArray(data.edges) ? data.edges : [];

        // If saved canvas has elements, load them into the room
        if (savedNodes.length > 0 || savedEdges.length > 0) {
          if (reactFlow.getNodes().length > 0 || reactFlow.getEdges().length > 0) {
            isRestoringRef.current = false;
            hasCompletedRestoreRef.current = true;
            markInitialized();
            return;
          }

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

        hasCompletedRestoreRef.current = true;
        isRestoringRef.current = false;
        markInitialized();
      } catch (err) {
        console.error("Failed to load initial saved canvas:", err);
        isRestoringRef.current = false;
        if (!isCancelled) {
          retryTimer = setTimeout(() => {
            if (!isCancelled && !hasCompletedRestoreRef.current) {
              loadInitialSavedCanvas();
            }
          }, 4000);
        }
      }
    }

    loadInitialSavedCanvas();

    return () => {
      isCancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      isRestoringRef.current = false;
    };
  }, [projectId, isInitialized, markInitialized, onNodesChange, onEdgesChange, fitView, reactFlow]);

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

  // Handler to replace canvas content with a starter template in a single Liveblocks batch
  const handleImportTemplate = React.useCallback(
    (template: CanvasTemplate) => {
      room.batch(() => {
        // 1. Clear all existing nodes and edges first
        if ((nodes && nodes.length > 0) || (edges && edges.length > 0)) {
          onDelete({
            nodes: nodes || [],
            edges: edges || [],
          });
        }

        // 2. Add the selected template nodes and edges
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
      });

      // 3. Fit view with smooth animation after loading
      requestAnimationFrame(() => {
        setTimeout(() => {
          fitView({ duration: 400, padding: 0.2 });
        }, 80);
      });
    },
    [room, nodes, edges, onDelete, onNodesChange, onEdgesChange, fitView]
  );

  // Handle template imports triggered via props
  React.useEffect(() => {
    if (templateToImport) {
      handleImportTemplate(templateToImport);
      onTemplateImported?.();
    }
  }, [templateToImport, handleImportTemplate, onTemplateImported]);

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
        if (!payload || typeof payload !== "object") return;
        const { shape } = payload;
        if (!shape || !NODE_SHAPES.includes(shape)) return;

        let width = 160;
        let height = 80;
        if (
          typeof payload.width === "number" &&
          Number.isFinite(payload.width) &&
          payload.width > 0
        ) {
          width = payload.width;
        }
        if (
          typeof payload.height === "number" &&
          Number.isFinite(payload.height) &&
          payload.height > 0
        ) {
          height = payload.height;
        }

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

  // Keyboard and click placement for ShapePanel
  const handleShapeSelect = React.useCallback(
    (shapeDef: ShapeDefinition) => {
      if (!shapeDef || !NODE_SHAPES.includes(shapeDef.shape)) return;
      const width = shapeDef.defaultWidth;
      const height = shapeDef.defaultHeight;

      const flowBounds = containerRef.current?.getBoundingClientRect();
      const clientX = flowBounds
        ? flowBounds.left + flowBounds.width / 2
        : window.innerWidth / 2;
      const clientY = flowBounds
        ? flowBounds.top + flowBounds.height / 2
        : window.innerHeight / 2;

      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });
      nodeCounter += 1;
      const nodeId = `${shapeDef.shape}-${Date.now()}-${nodeCounter}`;

      const newNode: CanvasNode = {
        id: nodeId,
        type: CANVAS_NODE_TYPE,
        position: {
          x: Math.round(flowPosition.x - width / 2),
          y: Math.round(flowPosition.y - height / 2),
        },
        data: {
          label: "",
          shape: shapeDef.shape,
          color: DEFAULT_NODE_COLOR.fill,
          textColor: DEFAULT_NODE_COLOR.text,
        },
        style: {
          width,
          height,
        },
      };

      onNodesChange([{ type: "add", item: newNode }]);
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

          {/* Virtual AI cursor rendered in flow coordinates when AI background task is active */}
          {aiPresence?.cursor && (
            <ViewportPortal>
              <div
                className="pointer-events-none absolute z-50 select-none transition-all duration-150"
                style={{
                  transform: `translate(${aiPresence.cursor.x}px, ${aiPresence.cursor.y}px)`,
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
            </ViewportPortal>
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

        {/* Floating pill-shaped bottom toolbar for dragging or clicking shapes */}
        <ShapePanel
          onShapeDragStart={(shapeDef) => {
            activeDraggedShapeRef.current = shapeDef;
          }}
          onShapeDragEnd={() => {
            activeDraggedShapeRef.current = null;
            setGhostPreview(null);
          }}
          onShapeSelect={handleShapeSelect}
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
