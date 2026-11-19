"use client";

import * as React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useCanvasFlow } from "@/components/canvas/canvas-context";
import { CanvasEdge } from "@/types/canvas";
import { cn } from "@/lib/utils";

/**
 * Custom canvas edge component rendered by React Flow.
 * Features:
 * - Clean smoothstep orthogonal routing with arrow markers.
 * - Invisible expanded 24px interaction path for easy clicking and hovering.
 * - Dimmed stroke at rest, brightening to cyan on selection and white on hover.
 * - Centered pill badge label positioned using getSmoothStepPath midpoint.
 * - Inline label editing on double-click with Enter, Escape, and blur handling.
 * - Live collaborative synchronization with Liveblocks.
 */
export function CanvasEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<CanvasEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const [isEditing, setIsEditing] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const canvasFlow = useCanvasFlow();

  const labelText = data?.label || "";

  React.useLayoutEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleUpdateLabel = React.useCallback(
    (nextLabel: string) => {
      if (canvasFlow?.updateEdgeLabel) {
        canvasFlow.updateEdgeLabel(id, nextLabel);
      }
    },
    [canvasFlow, id]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
      }
    },
    []
  );

  const handleBlur = React.useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdateLabel(e.target.value);
    },
    [handleUpdateLabel]
  );

  // Stroke color styling: Cyan if selected, brightened if hovered, dimmed slate at rest
  const strokeColor = selected ? "#00c8d4" : isHovered ? "#cbd5e1" : "#64748b";

  return (
    <>
      {/* Invisible wider interaction path making hover and selection easy */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      />

      {/* Visible styled edge path */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: selected ? 2 : 1.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          transition: "stroke 0.15s ease, stroke-width 0.15s ease",
        }}
      />

      {/* Centered Edge Label Renderer */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan z-20 select-none"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={labelText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="Add note..."
              maxLength={80}
              className="bg-[#18181b] border border-[#00c8d4] ring-1 ring-[#00c8d4]/50 text-[11px] font-medium text-[#EDEDED] px-2.5 py-0.5 rounded-full outline-none shadow-2xl text-center min-w-[80px] max-w-[200px]"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : labelText ? (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title={labelText}
              className={cn(
                "bg-[#18181b]/95 border text-[11px] font-medium px-2.5 py-0.5 rounded-full shadow-lg backdrop-blur-sm cursor-text transition-all max-w-[200px] truncate text-center",
                selected
                  ? "border-[#00c8d4] text-[#00c8d4] ring-1 ring-[#00c8d4]/30"
                  : isHovered
                  ? "border-slate-400 text-white"
                  : "border-[#2a2a30] text-[#cbd5e1]"
              )}
            >
              {labelText}
            </div>
          ) : (isHovered || selected) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="bg-[#18181b]/90 border border-dashed border-[#3a3a42] text-[10px] text-[#94a3b8] px-2 py-0.5 rounded-full hover:text-[#00c8d4] hover:border-[#00c8d4] shadow-md transition-all cursor-pointer animate-in fade-in duration-150"
            >
              + Note
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
