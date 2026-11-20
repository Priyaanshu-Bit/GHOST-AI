import { mutateFlow } from "@liveblocks/react-flow/node";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { liveblocks } from "@/lib/liveblocks";
import {
  CANVAS_NODE_TYPE,
  CANVAS_EDGE_TYPE,
  NODE_SHAPES,
  NODE_COLORS,
  type CanvasNode,
  type CanvasEdge,
} from "@/types/canvas";
import type { TaskFeedMessage, ArchitecturePlan, DesignAction } from "@/types/tasks";

export interface DesignAgentParams {
  prompt: string;
  roomId: string;
  projectId?: string;
}

export interface DesignAgentResult {
  success: boolean;
  roomId: string;
  summary: string;
  actionCount: number;
}

/**
 * Zod schema for structured output from Gemini model.
 */
const DesignActionZodSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_node"),
    id: z.string().describe("Unique node identifier, e.g. node_gateway"),
    label: z.string().describe("Short component title, e.g. API Gateway"),
    description: z.string().optional().describe("Component role or description"),
    shape: z
      .enum(["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"])
      .default("rectangle")
      .describe("Visual node shape"),
    color: z.string().default("#1F1F1F").describe("Node background color hex"),
    textColor: z.string().default("#EDEDED").describe("Node text color hex"),
    position: z.object({
      x: z.number().describe("Horizontal coordinate on canvas"),
      y: z.number().describe("Vertical coordinate on canvas"),
    }),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    type: z.literal("move_node"),
    id: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
  }),
  z.object({
    type: z.literal("resize_node"),
    id: z.string(),
    width: z.number(),
    height: z.number(),
  }),
  z.object({
    type: z.literal("update_node_data"),
    id: z.string(),
    label: z.string().optional(),
    description: z.string().optional(),
    shape: z
      .enum(["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"])
      .optional(),
    color: z.string().optional(),
    textColor: z.string().optional(),
  }),
  z.object({
    type: z.literal("delete_node"),
    id: z.string(),
  }),
  z.object({
    type: z.literal("add_edge"),
    id: z.string().describe("Unique edge identifier, e.g. edge_1_2"),
    source: z.string().describe("Source node ID"),
    target: z.string().describe("Target node ID"),
    sourceHandle: z
      .enum(["top", "bottom", "left", "right"])
      .optional()
      .describe("Connection handle on source node"),
    targetHandle: z
      .enum(["top", "bottom", "left", "right"])
      .optional()
      .describe("Connection handle on target node"),
    label: z.string().optional().describe("Protocol label, e.g. HTTPS, gRPC, Pub/Sub"),
  }),
  z.object({
    type: z.literal("delete_edge"),
    id: z.string(),
  }),
]);

const ArchitecturePlanZodSchema = z.object({
  summary: z.string().describe("Concise 1-2 sentence overview of the generated system architecture"),
  actions: z.array(DesignActionZodSchema).describe("List of sequential actions to create or update the graph"),
});

/**
 * Publishes status updates to both the Liveblocks ai-status-feed and room event broadcast.
 */
async function publishStatus(roomId: string, message: TaskFeedMessage) {
  try {
    try {
      await liveblocks.createFeed({ roomId, feedId: "ai-status-feed" });
    } catch {
      // Feed may already exist
    }

    await liveblocks.createFeedMessage({
      roomId,
      feedId: "ai-status-feed",
      data: message,
    });
  } catch (feedErr) {
    console.debug("Liveblocks feed post skipped or unavailable", feedErr);
  }

  try {
    await liveblocks.broadcastEvent(roomId, {
      type: "ai-status",
      ...message,
      timestamp: Date.now(),
    });
  } catch (bcErr) {
    console.debug("Broadcast event error", bcErr);
  }
}

/**
 * Broadcasts AI cursor presence and thinking state to all collaborative participants.
 */
async function broadcastAiPresence(
  roomId: string,
  cursor: { x: number; y: number } | null,
  thinking: boolean
) {
  try {
    await liveblocks.broadcastEvent(roomId, {
      type: "ai-presence",
      cursor,
      thinking,
      isThinking: thinking,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.debug("Broadcast presence error", err);
  }
}

/**
 * Default balanced dimensions tuned for readable architecture nodes and geometric shapes.
 */
export function getDefaultNodeDimensions(shape?: string): { width: number; height: number } {
  switch (shape) {
    case "circle":
      return { width: 90, height: 90 };
    case "diamond":
      return { width: 160, height: 100 };
    case "cylinder":
      return { width: 140, height: 86 };
    case "hexagon":
      return { width: 160, height: 86 };
    case "pill":
      return { width: 160, height: 56 };
    case "rectangle":
    default:
      return { width: 180, height: 76 };
  }
}

/**
 * Intelligent architectural template fallback when external Gemini API is unreachable or unconfigured.
 */
export function createFallbackArchitecturePlan(prompt: string): ArchitecturePlan {
  const lower = prompt.toLowerCase();

  if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("shop") || lower.includes("store")) {
    return {
      summary: "Modern e-commerce platform architecture with edge API gateway, decoupled microservices, relational catalog, and distributed cache.",
      actions: [
        {
          type: "add_node",
          id: "node_clients",
          label: "Web & Mobile Storefront",
          shape: "circle",
          color: "#0F2E18",
          textColor: "#62C073",
          description: "Next.js & React Native apps",
          width: 90,
          height: 90,
          position: { x: 80, y: 195 },
        },
        {
          type: "add_node",
          id: "node_gateway",
          label: "API Gateway",
          shape: "diamond",
          color: "#2E1938",
          textColor: "#BF7AF0",
          description: "TLS, auth & rate limiting",
          width: 160,
          height: 100,
          position: { x: 320, y: 190 },
        },
        {
          type: "add_node",
          id: "node_order_service",
          label: "Order & Checkout Service",
          shape: "rectangle",
          color: "#10233D",
          textColor: "#52A8FF",
          description: "Stripe & cart transactions",
          width: 180,
          height: 76,
          position: { x: 620, y: 100 },
        },
        {
          type: "add_node",
          id: "node_catalog_service",
          label: "Product Catalog Service",
          shape: "rectangle",
          color: "#1F1F1F",
          textColor: "#EDEDED",
          description: "Inventory & product metadata",
          width: 180,
          height: 76,
          position: { x: 620, y: 280 },
        },
        {
          type: "add_node",
          id: "node_redis_cache",
          label: "Redis Cache",
          shape: "pill",
          color: "#3A1726",
          textColor: "#F75F8F",
          description: "Session & catalog cache",
          width: 160,
          height: 56,
          position: { x: 920, y: 100 },
        },
        {
          type: "add_node",
          id: "node_postgres_db",
          label: "PostgreSQL Database",
          shape: "cylinder",
          color: "#332211",
          textColor: "#FF990A",
          description: "ACID order & customer records",
          width: 140,
          height: 86,
          position: { x: 920, y: 275 },
        },
        {
          type: "add_node",
          id: "node_stripe_api",
          label: "Stripe Payments API",
          shape: "hexagon",
          color: "#2E1938",
          textColor: "#BF7AF0",
          description: "PCI-DSS compliant payment gateway",
          width: 160,
          height: 86,
          position: { x: 1200, y: 100 },
        },
        {
          type: "add_edge",
          id: "e_client_gw",
          source: "node_clients",
          target: "node_gateway",
          sourceHandle: "right",
          targetHandle: "left",
          label: "HTTPS / REST",
        },
        {
          type: "add_edge",
          id: "e_gw_order",
          source: "node_gateway",
          target: "node_order_service",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Route /orders",
        },
        {
          type: "add_edge",
          id: "e_gw_catalog",
          source: "node_gateway",
          target: "node_catalog_service",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Route /products",
        },
        {
          type: "add_edge",
          id: "e_order_stripe",
          source: "node_order_service",
          target: "node_stripe_api",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Authorize Charge",
        },
        {
          type: "add_edge",
          id: "e_order_db",
          source: "node_order_service",
          target: "node_postgres_db",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Save Orders",
        },
        {
          type: "add_edge",
          id: "e_catalog_cache",
          source: "node_catalog_service",
          target: "node_redis_cache",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Query / Invalidate",
        },
      ],
    };
  }

  if (lower.includes("chat") || lower.includes("messaging") || lower.includes("socket")) {
    return {
      summary: "Real-time chat architecture with WebSocket gateway, message queues, and distributed databases.",
      actions: [
        {
          type: "add_node",
          id: "node_clients",
          label: "Web & Mobile Clients",
          shape: "circle",
          color: "#0F2E18",
          textColor: "#62C073",
          description: "End-user apps & browsers",
          width: 90,
          height: 90,
          position: { x: 80, y: 195 },
        },
        {
          type: "add_node",
          id: "node_gateway",
          label: "API & WS Gateway",
          shape: "diamond",
          color: "#2E1938",
          textColor: "#BF7AF0",
          description: "TLS, auth & connection pool",
          width: 160,
          height: 100,
          position: { x: 320, y: 190 },
        },
        {
          type: "add_node",
          id: "node_chat_service",
          label: "Chat Service",
          shape: "rectangle",
          color: "#10233D",
          textColor: "#52A8FF",
          description: "Rooms & message routing",
          width: 180,
          height: 76,
          position: { x: 620, y: 100 },
        },
        {
          type: "add_node",
          id: "node_presence_service",
          label: "Presence Service",
          shape: "rectangle",
          color: "#1F1F1F",
          textColor: "#EDEDED",
          description: "Heartbeats & user status",
          width: 180,
          height: 76,
          position: { x: 620, y: 280 },
        },
        {
          type: "add_node",
          id: "node_redis",
          label: "Redis Pub/Sub",
          shape: "pill",
          color: "#3A1726",
          textColor: "#F75F8F",
          description: "In-memory message broker",
          width: 160,
          height: 56,
          position: { x: 920, y: 100 },
        },
        {
          type: "add_node",
          id: "node_db",
          label: "PostgreSQL Messages",
          shape: "cylinder",
          color: "#332211",
          textColor: "#FF990A",
          description: "Persistent message history",
          width: 140,
          height: 86,
          position: { x: 920, y: 275 },
        },
        {
          type: "add_edge",
          id: "e_c_gw",
          source: "node_clients",
          target: "node_gateway",
          sourceHandle: "right",
          targetHandle: "left",
          label: "WebSocket / TLS",
        },
        {
          type: "add_edge",
          id: "e_gw_chat",
          source: "node_gateway",
          target: "node_chat_service",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Dispatch Message",
        },
        {
          type: "add_edge",
          id: "e_gw_presence",
          source: "node_gateway",
          target: "node_presence_service",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Heartbeat",
        },
        {
          type: "add_edge",
          id: "e_chat_redis",
          source: "node_chat_service",
          target: "node_redis",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Publish",
        },
        {
          type: "add_edge",
          id: "e_chat_db",
          source: "node_chat_service",
          target: "node_db",
          sourceHandle: "bottom",
          targetHandle: "left",
          label: "Archive",
        },
      ],
    };
  }

  // Default scalable microservices backend
  return {
    summary: `Scalable cloud architecture customized for: "${prompt.slice(0, 60)}"`,
    actions: [
      {
        type: "add_node",
        id: "node_client",
        label: "Client App",
        shape: "circle",
        color: "#0F2E18",
        textColor: "#62C073",
        description: "Web & Mobile applications",
        width: 90,
        height: 90,
        position: { x: 80, y: 195 },
      },
      {
        type: "add_node",
        id: "node_gateway",
        label: "API Gateway",
        shape: "diamond",
        color: "#2E1938",
        textColor: "#BF7AF0",
        description: "Ingress & Authentication",
        width: 160,
        height: 100,
        position: { x: 320, y: 190 },
      },
      {
        type: "add_node",
        id: "node_core_service",
        label: "Core API Service",
        shape: "rectangle",
        color: "#10233D",
        textColor: "#52A8FF",
        description: "Business logic engine",
        width: 180,
        height: 76,
        position: { x: 620, y: 100 },
      },
      {
        type: "add_node",
        id: "node_worker_service",
        label: "Background Worker",
        shape: "rectangle",
        color: "#1F1F1F",
        textColor: "#EDEDED",
        description: "Async event processors",
        width: 180,
        height: 76,
        position: { x: 620, y: 280 },
      },
      {
        type: "add_node",
        id: "node_db",
        label: "Primary Database",
        shape: "cylinder",
        color: "#332211",
        textColor: "#FF990A",
        description: "Relational persistence",
        width: 140,
        height: 86,
        position: { x: 920, y: 100 },
      },
      {
        type: "add_node",
        id: "node_cache",
        label: "Distributed Cache",
        shape: "pill",
        color: "#3A1726",
        textColor: "#F75F8F",
        description: "In-memory key/value store",
        width: 160,
        height: 56,
        position: { x: 920, y: 285 },
      },
      {
        type: "add_edge",
        id: "e_cl_gw",
        source: "node_client",
        target: "node_gateway",
        sourceHandle: "right",
        targetHandle: "left",
        label: "HTTPS / REST",
      },
      {
        type: "add_edge",
        id: "e_gw_cs",
        source: "node_gateway",
        target: "node_core_service",
        sourceHandle: "right",
        targetHandle: "left",
        label: "gRPC",
      },
      {
        type: "add_edge",
        id: "e_gw_ws",
        source: "node_gateway",
        target: "node_worker_service",
        sourceHandle: "right",
        targetHandle: "left",
        label: "Queue",
      },
      {
        type: "add_edge",
        id: "e_cs_db",
        source: "node_core_service",
        target: "node_db",
        sourceHandle: "right",
        targetHandle: "left",
        label: "Read/Write",
      },
      {
        type: "add_edge",
        id: "e_cs_c",
        source: "node_core_service",
        target: "node_cache",
        sourceHandle: "bottom",
        targetHandle: "left",
        label: "Cache",
      },
    ],
  };
}

/**
 * Executes the complete AI design generation process autonomously:
 * 1. Broadcasts start status & AI presence to Liveblocks room
 * 2. Uses Gemini model (with fallback) to synthesize topology
 * 3. Applies nodes and edges to Liveblocks canvas via mutateFlow
 * 4. Broadcasts completion status & returns summary
 */
export async function executeDesignAgent(
  params: DesignAgentParams
): Promise<DesignAgentResult> {
  const { prompt, roomId, projectId } = params;
  const resolvedProjectId = projectId || roomId;

  console.log(`[DesignService] Starting execution for room: ${roomId}, project: ${resolvedProjectId}, prompt: "${prompt}"`);

  // Step 1: Initialize status & AI presence
  await publishStatus(roomId, {
    status: "start",
    step: "analyzing",
    text: `Analyzing architecture requirements: "${prompt.slice(0, 50)}..."`,
    timestamp: Date.now(),
  });
  await broadcastAiPresence(roomId, { x: 200, y: 150 }, true);

  let plan: ArchitecturePlan;

  try {
    // Step 2: Generate architecture plan using Gemini
    const googleApiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (googleApiKey) {
      await publishStatus(roomId, {
        status: "processing",
        step: "generating",
        text: "Generating system components and layout with Gemini AI...",
        timestamp: Date.now(),
      });

      const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

      const promptText = `
You are a principal software architect. The user wants you to design a system architecture for:
"${prompt}"

Canvas Design Standards:
- Allowed node shapes: ${NODE_SHAPES.join(", ")}
- Node semantics and standard dimensions:
  * circle: Client Apps, Browser/Mobile (width: 90, height: 90)
  * diamond: API Gateway, Load Balancer, Router (width: 160, height: 100)
  * rectangle: Core Services, Microservices, Worker Services (width: 180, height: 76)
  * pill: Streaming Processors, Message Brokers, Serverless (width: 160, height: 56)
  * cylinder: Relational DB, NoSQL, Cache, File Store (width: 140, height: 86)
  * hexagon: External Third-Party APIs, SaaS, Cloud Services (width: 160, height: 86)
- Always provide a concise 3-5 word subtitle in the description field (e.g. "TLS & Auth Ingress", "Transactional Store").
- Allowed node colors (fill, text):
${NODE_COLORS.map((c) => `  * ${c.name}: fill "${c.fill}", text "${c.text}"`).join("\n")}
- Layout: Arrange nodes in a logical left-to-right flow with generous spacing:
  * Tier 1 (Clients/Input): X: 80 - 100
  * Tier 2 (Gateways/Balancers/Ingress): X: 320 - 360
  * Tier 3 (Microservices/Processing): X: 620 - 660
  * Tier 4 (Brokers/Queues/Databases): X: 920 - 960
  * Tier 5 (Caches/Third-party/Storage): X: 1180 - 1220
  * Vertical spacing: parallel components in the same tier should be 160px - 190px apart vertically so connection paths do not collide.
- Edges:
  * Connect components logically with descriptive labels (e.g. "HTTPS", "gRPC", "Pub/Sub", "SQL").
  * For standard horizontal left-to-right flow, set sourceHandle: "right" and targetHandle: "left".
  * When connecting downwards to a database or cache below, set sourceHandle: "bottom" and targetHandle: "left" or "top" to prevent overlapping edge badges.
`;

      try {
        const result = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: ArchitecturePlanZodSchema,
          prompt: promptText,
        });

        plan = {
          summary: result.object.summary,
          actions: result.object.actions as DesignAction[],
        };
      } catch (geminiErr) {
        console.warn("Gemini generation failed, falling back to heuristic planner", geminiErr);
        plan = createFallbackArchitecturePlan(prompt);
      }
    } else {
      console.log("GOOGLE_AI_API_KEY not configured, using structured architecture planner");
      plan = createFallbackArchitecturePlan(prompt);
    }

    // Step 3: Apply actions to collaborative canvas via Liveblocks mutateFlow
    await publishStatus(roomId, {
      status: "processing",
      step: "mutating_canvas",
      text: `Applying ${plan.actions.length} architecture components to canvas...`,
      timestamp: Date.now(),
    });

    await mutateFlow<CanvasNode, CanvasEdge>(
      { client: liveblocks, roomId },
      async (flow) => {
        const idMap = new Map<string, string>();
        const addedNodeIds: string[] = [];
        const addedEdgeIds: string[] = [];

        try {
          for (const action of plan.actions) {
            switch (action.type) {
              case "add_node": {
                let targetId = action.id;
                if (flow.getNode(targetId)) {
                  targetId = `${action.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                  idMap.set(action.id, targetId);
                }

                const defaultDims = getDefaultNodeDimensions(action.shape);
                const width = action.width || defaultDims.width;
                const height = action.height || defaultDims.height;
                const node: CanvasNode = {
                  id: targetId,
                  type: CANVAS_NODE_TYPE,
                  position: action.position || { x: 200, y: 200 },
                  data: {
                    label: action.label || "Service",
                    description: action.description || "",
                    shape: action.shape || "rectangle",
                    color: action.color || "#1F1F1F",
                    textColor: action.textColor || "#EDEDED",
                  },
                  style: {
                    width,
                    height,
                  },
                };
                flow.addNode(node);
                addedNodeIds.push(targetId);

                // Move virtual AI cursor to the newly added node
                if (action.position) {
                  await broadcastAiPresence(roomId, action.position, true);
                }
                break;
              }

              case "move_node": {
                const targetId = idMap.get(action.id) || action.id;
                if (action.position) {
                  flow.updateNode(targetId, { position: action.position });
                  await broadcastAiPresence(roomId, action.position, true);
                }
                break;
              }

              case "resize_node": {
                const targetId = idMap.get(action.id) || action.id;
                if (action.width && action.height) {
                  flow.updateNode(targetId, {
                    style: { width: action.width, height: action.height },
                  });
                }
                break;
              }

              case "update_node_data": {
                const targetId = idMap.get(action.id) || action.id;
                flow.updateNodeData(targetId, (prevData) => ({
                  ...prevData,
                  ...(action.label !== undefined ? { label: action.label } : {}),
                  ...(action.description !== undefined ? { description: action.description } : {}),
                  ...(action.shape !== undefined ? { shape: action.shape } : {}),
                  ...(action.color !== undefined ? { color: action.color } : {}),
                  ...(action.textColor !== undefined ? { textColor: action.textColor } : {}),
                }));
                break;
              }

              case "delete_node": {
                const targetId = idMap.get(action.id) || action.id;
                flow.removeNode(targetId);
                break;
              }

              case "add_edge": {
                if (action.source && action.target) {
                  const source = idMap.get(action.source) || action.source;
                  const target = idMap.get(action.target) || action.target;
                  let edgeId = action.id;
                  if (flow.getEdge(edgeId)) {
                    edgeId = `${action.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                  }
                  const edge: CanvasEdge = {
                    id: edgeId,
                    type: CANVAS_EDGE_TYPE,
                    source,
                    target,
                    sourceHandle: action.sourceHandle || "right",
                    targetHandle: action.targetHandle || "left",
                    data: {
                      label: action.label,
                    },
                  };
                  flow.addEdge(edge);
                  addedEdgeIds.push(edgeId);
                }
                break;
              }

              case "delete_edge": {
                flow.removeEdge(action.id);
                break;
              }
            }
          }
        } catch (mutationErr) {
          // Clean up partially applied nodes and edges on error to avoid orphaned items across retries
          for (const edgeId of addedEdgeIds) {
            try { flow.removeEdge(edgeId); } catch {}
          }
          for (const nodeId of addedNodeIds) {
            try { flow.removeNode(nodeId); } catch {}
          }
          throw mutationErr;
        }
      }
    );

    // Step 4: Completion status & clear AI presence
    await publishStatus(roomId, {
      status: "complete",
      step: "done",
      text: plan.summary || "System architecture successfully generated on canvas.",
      timestamp: Date.now(),
    });
    await broadcastAiPresence(roomId, null, false);

    console.log(`[DesignService] Execution completed successfully with ${plan.actions.length} actions.`);

    return {
      success: true,
      roomId,
      summary: plan.summary,
      actionCount: plan.actions.length,
    };
  } catch (err) {
    console.error("[DesignService] Execution failed:", err);

    await publishStatus(roomId, {
      status: "error",
      step: "failed",
      text: `Error generating architecture: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: Date.now(),
    });
    await broadcastAiPresence(roomId, null, false);

    throw err;
  }
}
