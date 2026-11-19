import { z } from "zod";
import type { NodeShape } from "@/types/canvas";

/**
 * Feed message payload schema for ai-status-feed.
 * Supports optional text, status category, and timestamp.
 */
export const TaskFeedMessageSchema = z.object({
  text: z.string().optional(),
  status: z.enum(["start", "processing", "complete", "error"]).optional(),
  step: z.string().optional(),
  timestamp: z.number().optional(),
});

export type TaskFeedMessage = z.infer<typeof TaskFeedMessageSchema>;

/**
 * Validates any incoming feed message or room event against TaskFeedMessageSchema.
 */
export function validateTaskFeedMessage(data: unknown): TaskFeedMessage | null {
  const result = TaskFeedMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Zod schema for collaborative room messages in the `ai-chat` feed.
 * Conforms to 25-sidebar-chat-feed.md and 26-ai-chat-functional.md.
 */
export const ChatFeedMessageSchema = z.object({
  id: z.string().optional(),
  sender: z.string().default("Collaborator"),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number().default(() => Date.now()),
});

export type ChatFeedMessage = z.infer<typeof ChatFeedMessageSchema>;

/**
 * Validates any incoming chat message against ChatFeedMessageSchema.
 */
export function validateChatFeedMessage(data: unknown): ChatFeedMessage | null {
  const result = ChatFeedMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Supported design agent canvas manipulation action types.
 */
export type DesignActionType =
  | "add_node"
  | "move_node"
  | "resize_node"
  | "update_node_data"
  | "delete_node"
  | "add_edge"
  | "delete_edge";

export interface DesignActionNodeData {
  label?: string;
  description?: string;
  shape?: NodeShape;
  color?: string;
  textColor?: string;
}

export interface DesignAction {
  type: DesignActionType;
  id: string;
  label?: string;
  description?: string;
  shape?: NodeShape;
  color?: string;
  textColor?: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  data?: DesignActionNodeData;
  source?: string;
  target?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ArchitecturePlan {
  summary: string;
  actions: DesignAction[];
}

/**
 * Zod schema for GenerateSpecPayload conforming to 27-spec-generation-flow.md.
 */
export const GenerateSpecPayloadSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  roomId: z.string().min(1, "Room ID is required"),
  chatHistory: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
        sender: z.string().optional(),
        timestamp: z.number().optional(),
      })
    )
    .optional()
    .default([]),
  nodes: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  edges: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export type GenerateSpecPayload = z.infer<typeof GenerateSpecPayloadSchema>;

/**
 * Zod schema for POST /api/ai/spec request body.
 * Note: projectId is NOT accepted from client to prevent spoofing.
 */
export const SpecTriggerRequestSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  chatHistory: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
        sender: z.string().optional(),
        timestamp: z.number().optional(),
      })
    )
    .optional()
    .default([]),
  nodes: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  edges: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export type SpecTriggerRequest = z.infer<typeof SpecTriggerRequestSchema>;
