"use client";

import * as React from "react";
import {
  Square,
  Diamond,
  Circle,
  Pill,
  Database,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeShape } from "@/types/canvas";

export interface ShapeDefinition {
  shape: NodeShape;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultWidth: number;
  defaultHeight: number;
}

/**
 * Shape definitions for the floating bottom shape panel.
 * Uses sensible default dimensions:
 * - rectangles are wider than tall
 * - circles are square
 * - diamonds are slightly larger so labels have room
 */
export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
  {
    shape: "rectangle",
    label: "Rectangle",
    icon: Square,
    defaultWidth: 160,
    defaultHeight: 80,
  },
  {
    shape: "diamond",
    label: "Diamond",
    icon: Diamond,
    defaultWidth: 120,
    defaultHeight: 120,
  },
  {
    shape: "circle",
    label: "Circle",
    icon: Circle,
    defaultWidth: 90,
    defaultHeight: 90,
  },
  {
    shape: "pill",
    label: "Pill",
    icon: Pill,
    defaultWidth: 140,
    defaultHeight: 60,
  },
  {
    shape: "cylinder",
    label: "Cylinder",
    icon: Database,
    defaultWidth: 120,
    defaultHeight: 100,
  },
  {
    shape: "hexagon",
    label: "Hexagon",
    icon: Hexagon,
    defaultWidth: 120,
    defaultHeight: 90,
  },
];

export interface ShapePanelProps {
  className?: string;
  onShapeDragStart?: (shape: ShapeDefinition) => void;
  onShapeDragEnd?: () => void;
  onShapeSelect?: (shape: ShapeDefinition) => void;
}

/**
 * Floating pill-shaped toolbar at the bottom-center of the canvas.
 * Allows users to drag shapes directly onto the canvas to create new nodes,
 * or click/press Enter/Space on any shape to place it at the viewport center.
 */
export function ShapePanel({
  className,
  onShapeDragStart,
  onShapeDragEnd,
  onShapeSelect,
}: ShapePanelProps) {
  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    shapeDef: ShapeDefinition
  ) => {
    const payload = JSON.stringify({
      shape: shapeDef.shape,
      width: shapeDef.defaultWidth,
      height: shapeDef.defaultHeight,
    });
    event.dataTransfer.setData("application/reactflow", payload);
    event.dataTransfer.setData("application/json", payload);
    event.dataTransfer.effectAllowed = "move";

    onShapeDragStart?.(shapeDef);
  };

  const handleDragEnd = () => {
    onShapeDragEnd?.();
  };

  return (
    <div
      className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface/95 backdrop-blur-md border border-border-subtle shadow-2xl select-none",
        className
      )}
      role="toolbar"
      aria-label="Shapes palette"
    >
      {SHAPE_DEFINITIONS.map((def) => {
        const Icon = def.icon;
        return (
          <button
            key={def.shape}
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, def)}
            onDragEnd={handleDragEnd}
            onClick={() => onShapeSelect?.(def)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onShapeSelect?.(def);
              }
            }}
            title={`Click or drag ${def.label} to canvas`}
            aria-label={`${def.label} (click or press Enter to add)`}
            className="flex items-center justify-center h-9 w-9 rounded-full text-copy-secondary hover:text-copy-primary hover:bg-subtle active:scale-95 transition-all cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
