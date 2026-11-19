import type { Node, Edge } from "@xyflow/react";

/**
 * 6 supported node shapes defined in ui-context.md.
 */
export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const;

export type NodeShape = (typeof NODE_SHAPES)[number];

export interface NodeColor {
  fill: string;
  text: string;
  name: string;
}

/**
 * 8 defined node color pairs from ui-context.md.
 * Each specifies a dark node fill and a vivid contrasting text color.
 */
export const NODE_COLORS: NodeColor[] = [
  { fill: "#1F1F1F", text: "#EDEDED", name: "Neutral Dark" },
  { fill: "#10233D", text: "#52A8FF", name: "Blue" },
  { fill: "#2E1938", text: "#BF7AF0", name: "Purple" },
  { fill: "#331B00", text: "#FF990A", name: "Orange" },
  { fill: "#3C1618", text: "#FF6166", name: "Red" },
  { fill: "#3A1726", text: "#F75F8F", name: "Pink" },
  { fill: "#0F2E18", text: "#62C073", name: "Green" },
  { fill: "#062822", text: "#0AC7B4", name: "Teal" },
];

export const DEFAULT_NODE_COLOR = NODE_COLORS[0];
export const DEFAULT_NODE_SHAPE: NodeShape = "rectangle";

/**
 * Data payload stored inside every CanvasNode.
 */
export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color?: string;
  textColor?: string;
  shape?: NodeShape;
  description?: string;
}

/**
 * Data payload stored inside every CanvasEdge.
 */
export interface CanvasEdgeData extends Record<string, unknown> {
  label?: string;
}

/**
 * Custom node and edge type identifiers.
 */
export const CANVAS_NODE_TYPE = "canvasNode" as const;
export const CANVAS_EDGE_TYPE = "canvasEdge" as const;

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>;
