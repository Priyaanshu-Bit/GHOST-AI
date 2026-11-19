"use client";

import * as React from "react";
import { NodeToolbar, Position } from "@xyflow/react";
import { NODE_COLORS, type NodeColor } from "@/types/canvas";
import { cn } from "@/lib/utils";

export interface NodeColorToolbarProps {
  nodeId: string;
  currentColor?: string;
  onColorSelect: (color: string, textColor: string) => void;
  isVisible?: boolean;
}

interface SwatchButtonProps {
  item: NodeColor;
  isSelected: boolean;
  onSelect: (color: string, textColor: string) => void;
}

/**
 * Individual color swatch with tight, controlled hover glow matching its paired text color.
 */
function SwatchButton({ item, isSelected, onSelect }: SwatchButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      type="button"
      title={item.name}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.fill, item.text);
      }}
      className={cn(
        "w-5 h-5 rounded-full border border-white/15 transition-all cursor-pointer relative shrink-0",
        isSelected
          ? "ring-2 ring-[#00c8d4] ring-offset-2 ring-offset-[#131316] scale-110 opacity-100"
          : isHovered
          ? "scale-115 opacity-100"
          : "opacity-80 hover:opacity-100"
      )}
      style={{
        backgroundColor: item.fill,
        boxShadow: isHovered
          ? `0 0 8px ${item.text}88, inset 0 0 2px ${item.text}55`
          : isSelected
          ? `0 0 8px ${item.text}55`
          : undefined,
      }}
    >
      <span className="sr-only">{item.name}</span>
    </button>
  );
}

/**
 * Floating color toolbar displayed directly above selected nodes.
 * Features 8 curated dark palette color options matching Ghost AI theme tokens.
 * Swatch selection updates both node background and paired text color collaboratively.
 */
export function NodeColorToolbar({
  nodeId,
  currentColor,
  onColorSelect,
  isVisible,
}: NodeColorToolbarProps) {
  return (
    <NodeToolbar
      nodeId={nodeId}
      position={Position.Top}
      offset={12}
      align="center"
      isVisible={isVisible}
      className="nodrag nopan z-30"
    >
      <div className="flex items-center gap-1.5 p-1.5 bg-[#131316]/95 backdrop-blur-md border border-[#2a2a30] rounded-full shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
        {NODE_COLORS.map((item) => {
          const isSelected =
            (currentColor || NODE_COLORS[0].fill).toLowerCase() ===
            item.fill.toLowerCase();

          return (
            <SwatchButton
              key={item.fill}
              item={item}
              isSelected={isSelected}
              onSelect={onColorSelect}
            />
          );
        })}
      </div>
    </NodeToolbar>
  );
}
