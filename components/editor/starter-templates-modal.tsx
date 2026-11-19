"use client";

import * as React from "react";
import { LayoutTemplate, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates";
import { cn } from "@/lib/utils";

export interface StarterTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (template: CanvasTemplate) => void;
}

/**
 * Lightweight SVG diagram preview for template cards.
 * Computes bounding box from template nodes and scales to fit viewport without React Flow overhead.
 */
function TemplateDiagramPreview({ template }: { template: CanvasTemplate }) {
  // 1. Calculate bounding box of all nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const nodeMap = new Map<
    string,
    {
      cx: number;
      cy: number;
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      textColor: string;
      shape: string;
      label: string;
    }
  >();

  for (const node of template.nodes) {
    const w = (node.style?.width as number) || 120;
    const h = (node.style?.height as number) || 75;
    const x = node.position.x;
    const y = node.position.y;
    const cx = x + w / 2;
    const cy = y + h / 2;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);

    nodeMap.set(node.id, {
      cx,
      cy,
      x,
      y,
      w,
      h,
      color: (node.data.color as string) || "#1F1F1F",
      textColor: (node.data.textColor as string) || "#EDEDED",
      shape: (node.data.shape as string) || "rectangle",
      label: (node.data.label as string) || "",
    });
  }

  const padding = 20;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxW = Math.max(maxX - minX + padding * 2, 100);
  const viewBoxH = Math.max(maxY - minY + padding * 2, 80);

  return (
    <div className="w-full h-36 bg-[#080809] rounded-xl border border-border-subtle/70 p-2 flex items-center justify-center overflow-hidden select-none">
      <svg
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full pointer-events-none"
      >
        {/* Draw edges as simple connecting lines */}
        {template.edges.map((edge) => {
          const s = nodeMap.get(edge.source);
          const t = nodeMap.get(edge.target);
          if (!s || !t) return null;

          return (
            <line
              key={edge.id}
              x1={s.cx}
              y1={s.cy}
              x2={t.cx}
              y2={t.cy}
              stroke="#475569"
              strokeWidth="2.5"
              strokeDasharray="4 3"
            />
          );
        })}

        {/* Draw nodes using their shape and color */}
        {Array.from(nodeMap.entries()).map(([id, n]) => {
          let shapeElement = null;

          if (n.shape === "circle") {
            const r = Math.min(n.w, n.h) / 2;
            shapeElement = (
              <circle
                cx={n.cx}
                cy={n.cy}
                r={r}
                fill={n.color}
                stroke="#3a3a42"
                strokeWidth="2"
              />
            );
          } else if (n.shape === "pill") {
            shapeElement = (
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={n.h / 2}
                fill={n.color}
                stroke="#3a3a42"
                strokeWidth="2"
              />
            );
          } else if (n.shape === "diamond") {
            shapeElement = (
              <polygon
                points={`${n.cx},${n.y} ${n.x + n.w},${n.cy} ${n.cx},${n.y + n.h} ${n.x},${n.cy}`}
                fill={n.color}
                stroke="#3a3a42"
                strokeWidth="2"
              />
            );
          } else if (n.shape === "hexagon") {
            shapeElement = (
              <polygon
                points={`${n.x + n.w * 0.22},${n.y} ${n.x + n.w * 0.78},${n.y} ${n.x + n.w},${n.cy} ${n.x + n.w * 0.78},${n.y + n.h} ${n.x + n.w * 0.22},${n.y + n.h} ${n.x},${n.cy}`}
                fill={n.color}
                stroke="#3a3a42"
                strokeWidth="2"
              />
            );
          } else if (n.shape === "cylinder") {
            shapeElement = (
              <g>
                <path
                  d={`M ${n.x},${n.y + 12} A ${n.w / 2},10 0 0,1 ${n.x + n.w},${n.y + 12} L ${n.x + n.w},${n.y + n.h - 10} A ${n.w / 2},10 0 0,1 ${n.x},${n.y + n.h - 10} Z`}
                  fill={n.color}
                  stroke="#3a3a42"
                  strokeWidth="2"
                />
                <ellipse
                  cx={n.cx}
                  cy={n.y + 12}
                  rx={n.w / 2}
                  ry={10}
                  fill="none"
                  stroke="#3a3a42"
                  strokeWidth="2"
                />
              </g>
            );
          } else {
            // rectangle
            shapeElement = (
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx="8"
                fill={n.color}
                stroke="#3a3a42"
                strokeWidth="2"
              />
            );
          }

          return (
            <g key={id}>
              {shapeElement}
              <text
                x={n.cx}
                y={n.cy}
                fill={n.textColor}
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Modal dialog displaying the starter architecture templates in a responsive grid.
 * Allows users to preview and load pre-built diagrams onto their collaborative canvas.
 */
export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-w-5xl max-h-[90vh] bg-surface text-copy-primary border border-border-subtle rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        <DialogHeader className="gap-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
              <LayoutTemplate className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-semibold text-copy-primary">
              Starter Architecture Templates
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-copy-muted leading-relaxed">
            Choose a pre-built architecture template to instantly bootstrap your canvas.
            Importing a template will replace all current canvas nodes and edges.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Template Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto max-h-[62vh] pr-1 py-1">
          {CANVAS_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="bg-elevated border border-border-subtle rounded-2xl p-4 flex flex-col justify-between hover:border-accent-primary/50 transition-all group"
            >
              <div>
                <h4 className="text-sm font-semibold text-copy-primary group-hover:text-accent-primary transition-colors">
                  {template.name}
                </h4>
                <p className="text-xs text-copy-muted line-clamp-2 mt-1 mb-3 leading-relaxed">
                  {template.description}
                </p>

                {/* SVG Visual Preview */}
                <TemplateDiagramPreview template={template} />
              </div>

              {/* Import Action Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onImport(template);
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full mt-4 gap-1.5 text-xs font-medium border-border-subtle bg-surface/60 hover:bg-accent-primary hover:text-[#080809] hover:border-accent-primary transition-all cursor-pointer"
                )}
              >
                <span>Use Template</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
