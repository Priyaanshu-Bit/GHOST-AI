"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { NodeShape } from "@/types/canvas";

export interface NodeShapeViewProps {
  shape?: NodeShape;
  label?: React.ReactNode;
  color?: string;
  textColor?: string;
  selected?: boolean;
  isGhost?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * NodeShapeView renders the 6 visual shape variants defined in ui-context.md:
 * - CSS styled shapes: rectangle, pill, circle
 * - Scalable SVG shapes: diamond, hexagon, cylinder
 *
 * Supports regular node rendering, selection states, and semi-transparent ghost drag previews.
 */
export function NodeShapeView({
  shape = "rectangle",
  label = "",
  color = "#1F1F1F",
  textColor = "#EDEDED",
  selected = false,
  isGhost = false,
  className,
  children,
}: NodeShapeViewProps) {
  const strokeColor = selected || isGhost ? "#00c8d4" : "#3a3a42";

  // Label element centered in the middle of each shape
  const labelContent = React.isValidElement(label) ? (
    label
  ) : (
    <span
      className="text-xs font-medium text-center truncate px-1 select-none z-10 pointer-events-none"
      style={{ color: textColor }}
    >
      {label || <span className="opacity-40 italic whitespace-nowrap">{shape}</span>}
    </span>
  );

  // 1. CSS Shapes: Rectangle, Pill, Circle
  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    const shapeRadiusClass =
      shape === "rectangle"
        ? "rounded-2xl"
        : shape === "pill"
        ? "rounded-full px-3 py-1"
        : "rounded-full p-2"; // circle

    return (
      <div
        className={cn(
          "group relative flex flex-col items-center justify-center w-full h-full select-none transition-all",
          shapeRadiusClass,
          isGhost
            ? "border-2 border-dashed border-accent-primary bg-accent-dim/40 opacity-70"
            : cn(
                "border shadow-md",
                selected
                  ? "border-accent-primary ring-2 ring-accent-primary/30"
                  : "border-border-subtle"
              ),
          className
        )}
        style={{
          backgroundColor: isGhost ? undefined : color,
        }}
      >
        {labelContent}
        {children}
      </div>
    );
  }

  // 2. SVG Shapes: Diamond
  if (shape === "diamond") {
    return (
      <div
        className={cn(
          "group relative flex items-center justify-center w-full h-full select-none",
          isGhost && "opacity-70",
          selected && "drop-shadow-[0_0_8px_rgba(0,200,212,0.35)]",
          className
        )}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points="50,2 98,50 50,98 2,50"
            fill={isGhost ? "rgba(0, 200, 212, 0.15)" : color}
            stroke={strokeColor}
            strokeWidth={selected ? 2 : 1.5}
            strokeDasharray={isGhost ? "4 3" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center justify-center max-w-[70%] max-h-[70%] text-center">
          {labelContent}
        </div>

        {children}
      </div>
    );
  }

  // 3. SVG Shapes: Hexagon
  if (shape === "hexagon") {
    return (
      <div
        className={cn(
          "group relative flex items-center justify-center w-full h-full select-none",
          isGhost && "opacity-70",
          selected && "drop-shadow-[0_0_8px_rgba(0,200,212,0.35)]",
          className
        )}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points="22,2 78,2 98,50 78,98 22,98 2,50"
            fill={isGhost ? "rgba(0, 200, 212, 0.15)" : color}
            stroke={strokeColor}
            strokeWidth={selected ? 2 : 1.5}
            strokeDasharray={isGhost ? "4 3" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center justify-center max-w-[74%] max-h-[74%] text-center">
          {labelContent}
        </div>

        {children}
      </div>
    );
  }

  // 4. SVG Shapes: Cylinder (Database / Storage)
  if (shape === "cylinder") {
    return (
      <div
        className={cn(
          "group relative flex items-center justify-center w-full h-full select-none pt-4 pb-2 px-2",
          isGhost && "opacity-70",
          selected && "drop-shadow-[0_0_8px_rgba(0,200,212,0.35)]",
          className
        )}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Cylinder body and bottom curved base */}
          <path
            d="M 2,16 A 48,14 0 0,1 98,16 L 98,84 A 48,14 0 0,1 2,84 Z"
            fill={isGhost ? "rgba(0, 200, 212, 0.15)" : color}
            stroke={strokeColor}
            strokeWidth={selected ? 2 : 1.5}
            strokeDasharray={isGhost ? "4 3" : undefined}
            vectorEffect="non-scaling-stroke"
          />
          {/* Cylinder top curved rim */}
          <path
            d="M 2,16 A 48,14 0 0,0 98,16"
            fill="none"
            stroke={strokeColor}
            strokeWidth={selected ? 2 : 1.5}
            strokeDasharray={isGhost ? "4 3" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center justify-center max-w-[85%] max-h-[68%] w-full text-center">
          {labelContent}
        </div>

        {children}
      </div>
    );
  }

  // Fallback to rectangle
  return (
    <div
      className={cn(
        "group relative flex items-center justify-center w-full h-full rounded-xl border select-none",
        selected ? "border-accent-primary ring-2 ring-accent-primary/30" : "border-border-subtle",
        className
      )}
      style={{ backgroundColor: color }}
    >
      {labelContent}
      {children}
    </div>
  );
}
