import { task, logger } from "@trigger.dev/sdk";
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

export interface DesignAgentPayload {
  prompt: string;
  roomId: string;
  projectId?: string;
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
    logger.debug("Liveblocks feed post skipped or unavailable", { error: String(feedErr) });
  }

  try {
    await liveblocks.broadcastEvent(roomId, {
      type: "ai-status",
      ...message,
      timestamp: Date.now(),
    });
  } catch (bcErr) {
    logger.debug("Broadcast event error", { error: String(bcErr) });
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
    logger.debug("Broadcast presence error", { error: String(err) });
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
function createFallbackArchitecturePlan(prompt: string): ArchitecturePlan {
  const lower = prompt.toLowerCase();

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
          position: { x: 920, y: 110 },
        },
        {
          type: "add_node",
          id: "node_postgres",
          label: "PostgreSQL Database",
          shape: "cylinder",
          color: "#062822",
          textColor: "#0AC7B4",
          description: "Message archive & user store",
          width: 140,
          height: 86,
          position: { x: 930, y: 275 },
        },
        {
          type: "add_edge",
          id: "e_c_g",
          source: "node_clients",
          target: "node_gateway",
          sourceHandle: "right",
          targetHandle: "left",
          label: "WSS / HTTPS",
        },
        {
          type: "add_edge",
          id: "e_g_cs",
          source: "node_gateway",
          target: "node_chat_service",
          sourceHandle: "right",
          targetHandle: "left",
          label: "gRPC",
        },
        {
          type: "add_edge",
          id: "e_g_ps",
          source: "node_gateway",
          target: "node_presence_service",
          sourceHandle: "right",
          targetHandle: "left",
          label: "gRPC",
        },
        {
          type: "add_edge",
          id: "e_cs_r",
          source: "node_chat_service",
          target: "node_redis",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Pub/Sub",
        },
        {
          type: "add_edge",
          id: "e_cs_pg",
          source: "node_chat_service",
          target: "node_postgres",
          sourceHandle: "bottom",
          targetHandle: "left",
          label: "SQL",
        },
      ],
    };
  }

  if (lower.includes("ci") || lower.includes("cd") || lower.includes("pipeline") || lower.includes("deploy")) {
    return {
      summary: "Automated CI/CD deployment pipeline with testing, container builds, and staging environments.",
      actions: [
        {
          type: "add_node",
          id: "node_git",
          label: "Git Repository",
          shape: "circle",
          color: "#1F1F1F",
          textColor: "#EDEDED",
          description: "Source code repository",
          width: 90,
          height: 90,
          position: { x: 80, y: 195 },
        },
        {
          type: "add_node",
          id: "node_runner",
          label: "CI Pipeline Runner",
          shape: "diamond",
          color: "#331B00",
          textColor: "#FF990A",
          description: "Automated trigger & matrix",
          width: 160,
          height: 100,
          position: { x: 320, y: 190 },
        },
        {
          type: "add_node",
          id: "node_tests",
          label: "Test & Lint Suite",
          shape: "rectangle",
          color: "#0F2E18",
          textColor: "#62C073",
          description: "Unit, integration & audit",
          width: 180,
          height: 76,
          position: { x: 620, y: 100 },
        },
        {
          type: "add_node",
          id: "node_builder",
          label: "Container Build",
          shape: "rectangle",
          color: "#10233D",
          textColor: "#52A8FF",
          description: "Docker image compilation",
          width: 180,
          height: 76,
          position: { x: 620, y: 280 },
        },
        {
          type: "add_node",
          id: "node_registry",
          label: "Container Registry",
          shape: "cylinder",
          color: "#062822",
          textColor: "#0AC7B4",
          description: "Artifact & image store",
          width: 140,
          height: 86,
          position: { x: 930, y: 275 },
        },
        {
          type: "add_node",
          id: "node_deploy",
          label: "Kubernetes Cluster",
          shape: "hexagon",
          color: "#2E1938",
          textColor: "#BF7AF0",
          description: "Production zero-downtime",
          width: 160,
          height: 86,
          position: { x: 1200, y: 275 },
        },
        {
          type: "add_edge",
          id: "e_g_r",
          source: "node_git",
          target: "node_runner",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Push Webhook",
        },
        {
          type: "add_edge",
          id: "e_r_t",
          source: "node_runner",
          target: "node_tests",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Run",
        },
        {
          type: "add_edge",
          id: "e_r_b",
          source: "node_runner",
          target: "node_builder",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Build",
        },
        {
          type: "add_edge",
          id: "e_b_reg",
          source: "node_builder",
          target: "node_registry",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Push Image",
        },
        {
          type: "add_edge",
          id: "e_reg_k8s",
          source: "node_registry",
          target: "node_deploy",
          sourceHandle: "right",
          targetHandle: "left",
          label: "Deploy",
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
        description: "Routing, rate limits & auth",
        width: 160,
        height: 100,
        position: { x: 320, y: 190 },
      },
      {
        type: "add_node",
        id: "node_core_service",
        label: "Core Service",
        shape: "rectangle",
        color: "#10233D",
        textColor: "#52A8FF",
        description: "Domain business logic",
        width: 180,
        height: 76,
        position: { x: 620, y: 100 },
      },
      {
        type: "add_node",
        id: "node_worker_service",
        label: "Async Worker",
        shape: "pill",
        color: "#331B00",
        textColor: "#FF990A",
        description: "Background jobs & events",
        width: 160,
        height: 56,
        position: { x: 620, y: 280 },
      },
      {
        type: "add_node",
        id: "node_db",
        label: "Primary Database",
        shape: "cylinder",
        color: "#062822",
        textColor: "#0AC7B4",
        description: "Transactional relational store",
        width: 140,
        height: 86,
        position: { x: 930, y: 95 },
      },
      {
        type: "add_node",
        id: "node_cache",
        label: "Redis Cache",
        shape: "cylinder",
        color: "#3A1726",
        textColor: "#F75F8F",
        description: "Distributed cache & sessions",
        width: 140,
        height: 86,
        position: { x: 930, y: 275 },
      },
      {
        type: "add_edge",
        id: "e_c_gw",
        source: "node_client",
        target: "node_gateway",
        sourceHandle: "right",
        targetHandle: "left",
        label: "HTTPS",
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
 * Core design agent Trigger.dev task.
 * Interprets user prompts via Gemini AI, updates canvas nodes and edges
 * in realtime via Liveblocks mutateFlow, and reports progress.
 */
export const designAgent = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload, { ctx }) => {
    const { prompt, roomId, projectId } = payload;
    const resolvedProjectId = projectId || roomId;

    logger.info("Design agent task started", {
      runId: ctx.run.id,
      roomId,
      projectId: resolvedProjectId,
      prompt,
    });

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
          logger.warn("Gemini generation failed, falling back to heuristic planner", {
            error: String(geminiErr),
          });
          plan = createFallbackArchitecturePlan(prompt);
        }
      } else {
        logger.info("GOOGLE_AI_API_KEY not configured, using structured architecture planner");
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
          for (const action of plan.actions) {
            switch (action.type) {
              case "add_node": {
                const defaultDims = getDefaultNodeDimensions(action.shape);
                const width = action.width || defaultDims.width;
                const height = action.height || defaultDims.height;
                const node: CanvasNode = {
                  id: action.id,
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

                // Move virtual AI cursor to the newly added node
                if (action.position) {
                  await broadcastAiPresence(roomId, action.position, true);
                }
                break;
              }

              case "move_node": {
                if (action.position) {
                  flow.updateNode(action.id, { position: action.position });
                  await broadcastAiPresence(roomId, action.position, true);
                }
                break;
              }

              case "resize_node": {
                if (action.width && action.height) {
                  flow.updateNode(action.id, {
                    style: { width: action.width, height: action.height },
                  });
                }
                break;
              }

              case "update_node_data": {
                flow.updateNodeData(action.id, (prevData) => ({
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
                flow.removeNode(action.id);
                break;
              }

              case "add_edge": {
                if (action.source && action.target) {
                  const edge: CanvasEdge = {
                    id: action.id,
                    type: CANVAS_EDGE_TYPE,
                    source: action.source,
                    target: action.target,
                    sourceHandle: action.sourceHandle || "right",
                    targetHandle: action.targetHandle || "left",
                    data: {
                      label: action.label,
                    },
                  };
                  flow.addEdge(edge);
                }
                break;
              }

              case "delete_edge": {
                flow.removeEdge(action.id);
                break;
              }
            }
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

      logger.info("Design agent task completed successfully", {
        runId: ctx.run.id,
        actionCount: plan.actions.length,
      });

      return {
        success: true,
        roomId,
        summary: plan.summary,
        actionCount: plan.actions.length,
      };
    } catch (err) {
      logger.error("Design agent execution failed", { error: String(err) });

      await publishStatus(roomId, {
        status: "error",
        step: "failed",
        text: `Error generating architecture: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      });
      await broadcastAiPresence(roomId, null, false);

      throw err;
    }
  },
});
