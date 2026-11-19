"use client";

import * as React from "react";
import { useUpdateMyPresence, useOthers } from "@liveblocks/react";
import {
  Handle,
  Position,
  NodeResizer,
  NodeResizeControl,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { NodeShapeView } from "@/components/canvas/node-shape-view";
import { NodeColorToolbar } from "@/components/canvas/node-color-toolbar";
import { useCanvasFlow } from "@/components/canvas/canvas-context";
import { CanvasNode } from "@/types/canvas";
import { cn } from "@/lib/utils";

/**
 * Custom canvas node component (`canvasNode`) rendered by React Flow.
 * Features:
 * - 8 resize handles (4 corners + 4 sides) with generous hit areas and line-drag support.
 * - Aspect ratio freedom on width/length for rectangular/polygon shapes (circle retains 1:1).
 * - 4 bidirectional connection handles (top, bottom, left, right) with unique IDs.
 * - Floating dark-theme color toolbar above selected nodes with 8 curated swatches.
 * - Inline label editing via double-click with zero layout shifts.
 * - Liveblocks collaborative synchronization.
 */
export function CanvasNodeComponent({ id, data, selected }: NodeProps<CanvasNode>) {
  const [isEditing, setIsEditing] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const canvasFlow = useCanvasFlow();
  const { updateNodeData } = useReactFlow();
  const updateMyPresence = useUpdateMyPresence();

  // Find if any peer collaborator is currently editing this node
  const editingPeer = useOthers((others) => {
    for (const other of others) {
      if (other.presence?.editingNodeId === id) {
        return {
          name: other.info?.name || "Collaborator",
          color: other.info?.color || "#00c8d4",
        };
      }
    }
    return null;
  });

  // Broadcast editing presence to all peers in the room only when this node is/was actively being edited
  React.useEffect(() => {
    if (isEditing) {
      updateMyPresence({ editingNodeId: id });
      return () => {
        updateMyPresence({ editingNodeId: null });
      };
    }
  }, [isEditing, id, updateMyPresence]);

  // Focus and select textarea text when entering edit mode
  React.useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.select();
      // Auto-fit height to text content to prevent layout shifts
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [isEditing]);

  // Sync label updates through canvasFlow and local React Flow state
  const handleUpdateLabel = React.useCallback(
    (nextLabel: string) => {
      if (canvasFlow?.updateNodeLabel) {
        canvasFlow.updateNodeLabel(id, nextLabel);
      } else {
        updateNodeData(id, { label: nextLabel });
      }
    },
    [canvasFlow, id, updateNodeData]
  );

  // Sync color updates through canvasFlow and local React Flow state
  const handleUpdateColor = React.useCallback(
    (color: string, textColor: string) => {
      if (canvasFlow?.updateNodeColor) {
        canvasFlow.updateNodeColor(id, color, textColor);
      } else {
        updateNodeData(id, { color, textColor });
      }
    },
    [canvasFlow, id, updateNodeData]
  );

  const handleDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
    },
    []
  );

  const handleTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      handleUpdateLabel(el.value);
    },
    [handleUpdateLabel]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Prevent React Flow from handling keys (e.g., Delete/Backspace deleting the node)
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
      }
    },
    []
  );

  const handleBlur = React.useCallback(() => {
    setIsEditing(false);
  }, []);

  // Centered label rendering: either the inline textarea or the read-only span
  const labelElement = isEditing ? (
    <div
      className="flex items-center justify-center w-full px-1"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={data.label || ""}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={data.shape}
        rows={1}
        className="nodrag nopan w-full bg-transparent resize-none border-0 outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 text-xs font-semibold text-center leading-tight p-0 m-0 placeholder:opacity-40 placeholder:italic select-text z-30"
        style={{
          color: data.textColor || "#EDEDED",
        }}
      />
    </div>
  ) : (
    <div
      role="button"
      tabIndex={0}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      className="flex flex-col items-center justify-center w-full px-2 cursor-text select-none text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00c8d4] rounded"
      title="Double-click or press Enter to edit label"
      aria-label={`Node label: ${data.label || data.shape}. Press Enter to edit.`}
    >
      <span
        className="text-xs font-semibold text-center break-words leading-tight pointer-events-none max-w-full"
        style={{ color: data.textColor || "#EDEDED" }}
      >
        {data.label || (
          <span className="opacity-40 italic whitespace-nowrap">{data.shape}</span>
        )}
      </span>
      {data.description && (
        <span
          className="text-[10px] leading-tight mt-1 opacity-70 font-normal max-w-full line-clamp-2 px-1 pointer-events-none"
          style={{ color: data.textColor || "#EDEDED" }}
        >
          {data.description}
        </span>
      )}
    </div>
  );

  const isCircle = data.shape === "circle";
  const isSelected = Boolean(selected);

  return (
    <div
      className={cn(
        "group relative w-full h-full min-w-[80px] min-h-[50px] transition-all",
        editingPeer && "ring-2 ring-offset-2 ring-offset-[#080809]"
      )}
      style={{
        // @ts-expect-error Tailwind custom ring color via CSS variable
        "--tw-ring-color": editingPeer?.color || "transparent",
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Realtime peer collaborator editing badge */}
      {editingPeer && (
        <div
          className="absolute -top-3.5 left-2 px-2 py-0.5 rounded-full text-[9px] font-semibold text-white shadow-xl flex items-center gap-1.5 z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{ backgroundColor: editingPeer.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>{editingPeer.name} is editing</span>
        </div>
      )}

      {/* Floating color toolbar above selected node */}
      <NodeColorToolbar
        nodeId={id}
        currentColor={data.color}
        onColorSelect={handleUpdateColor}
        isVisible={isSelected}
      />

      {/* Corner resize controls + draggable bounding border lines with expanded grab targets */}
      <NodeResizer
        isVisible={isSelected}
        minWidth={80}
        minHeight={50}
        keepAspectRatio={isCircle}
        color="#00c8d4"
        handleClassName="!w-3 !h-3 !bg-[#00c8d4] !border !border-[#080809] !rounded-xs shadow-sm hover:!scale-125 transition-transform after:content-[''] after:absolute after:-inset-2 after:cursor-inherit"
        lineClassName="!border-[#00c8d4]/40 hover:!border-[#00c8d4] hover:!border-2 transition-colors after:content-[''] after:absolute after:-inset-1.5 after:cursor-inherit"
      />

      {/* 4 side edge resize handles for independent width/height resizing (non-circle) */}
      {isSelected && !isCircle && (
        <>
          <NodeResizeControl
            position="top"
            minWidth={80}
            minHeight={50}
            className="!w-3 !h-3 !bg-[#00c8d4] !border !border-[#080809] !rounded-xs shadow-sm hover:!scale-125 transition-transform after:content-[''] after:absolute after:-inset-2 after:cursor-ns-resize"
          />
          <NodeResizeControl
            position="bottom"
            minWidth={80}
            minHeight={50}
            className="!w-3 !h-3 !bg-[#00c8d4] !border !border-[#080809] !rounded-xs shadow-sm hover:!scale-125 transition-transform after:content-[''] after:absolute after:-inset-2 after:cursor-ns-resize"
          />
          <NodeResizeControl
            position="left"
            minWidth={80}
            minHeight={50}
            className="!w-3 !h-3 !bg-[#00c8d4] !border !border-[#080809] !rounded-xs shadow-sm hover:!scale-125 transition-transform after:content-[''] after:absolute after:-inset-2 after:cursor-ew-resize"
          />
          <NodeResizeControl
            position="right"
            minWidth={80}
            minHeight={50}
            className="!w-3 !h-3 !bg-[#00c8d4] !border !border-[#080809] !rounded-xs shadow-sm hover:!scale-125 transition-transform after:content-[''] after:absolute after:-inset-2 after:cursor-ew-resize"
          />
        </>
      )}

      <NodeShapeView
        shape={data.shape}
        label={labelElement}
        color={data.color}
        textColor={data.textColor}
        selected={selected}
      >
        {/* 4 bidirectional connection handles (top, bottom, left, right) with distinct IDs */}
        <Handle
          id="top"
          type="source"
          position={Position.Top}
          className="!w-3 !h-3 !bg-white !border-2 !border-[#080809] !rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 z-20 after:content-[''] after:absolute after:-inset-2.5 after:cursor-crosshair"
        />
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-white !border-2 !border-[#080809] !rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 z-20 after:content-[''] after:absolute after:-inset-2.5 after:cursor-crosshair"
        />
        <Handle
          id="left"
          type="source"
          position={Position.Left}
          className="!w-3 !h-3 !bg-white !border-2 !border-[#080809] !rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 z-20 after:content-[''] after:absolute after:-inset-2.5 after:cursor-crosshair"
        />
        <Handle
          id="right"
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-white !border-2 !border-[#080809] !rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-125 z-20 after:content-[''] after:absolute after:-inset-2.5 after:cursor-crosshair"
        />
      </NodeShapeView>
    </div>
  );
}
