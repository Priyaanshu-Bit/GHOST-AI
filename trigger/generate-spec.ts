import { task, logger, metadata } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { saveProjectSpec } from "@/lib/specs";
import {
  GenerateSpecPayloadSchema,
  type GenerateSpecPayload,
} from "@/types/tasks";

function escapeCell(str: string): string {
  return str.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

/**
 * Robust fallback generator that synthesizes a structured Markdown technical spec
 * directly from graph nodes, edges, and collaborative chat context when
 * the external Gemini API is unreachable or unconfigured.
 */
function createFallbackTechnicalSpec(payload: GenerateSpecPayload): string {
  const { roomId, chatHistory, nodes, edges } = payload;
  const now = new Date().toISOString();

  // Extract node summaries
  const nodeRows = nodes.map((n, idx) => {
    const data = (n.data as Record<string, unknown>) || {};
    const label = (data.label as string) || (n.id as string) || `Component ${idx + 1}`;
    const description = (data.description as string) || "Core system component";
    const shape = (data.shape as string) || "rectangle";
    return `| \`${escapeCell(label)}\` | ${escapeCell(shape)} | ${escapeCell(description)} |`;
  });

  // Extract edge connections
  const edgeRows = edges.map((e) => {
    const data = (e.data as Record<string, unknown>) || {};
    const label = (data.label as string) || "Direct Connection";
    const source = (e.source as string) || "Source";
    const target = (e.target as string) || "Target";
    return `| \`${escapeCell(source)}\` | \`${escapeCell(target)}\` | \`${escapeCell(label)}\` |`;
  });

  // Extract recent prompt requirements from chat
  const recentUserPrompts = chatHistory
    .filter((m) => m.role === "user")
    .map((m) => `- "${m.content}"`)
    .slice(-5);

  const requirementsText =
    recentUserPrompts.length > 0
      ? recentUserPrompts.join("\n")
      : "- High availability, modular design, and reliable data persistence.";

  return `# System Architecture Specification

**Project Workspace:** \`${roomId}\`  
**Generated At:** ${now}  
**Status:** Draft Architecture Specification  

---

## 1. Executive Summary

This document describes the high-level system architecture and operational topology derived from the collaborative canvas design.

### Key Requirements & Constraints
${requirementsText}

---

## 2. Architecture & Service Topology

The observed system topology consists of ${nodes.length > 0 ? `${nodes.length} component(s)` : "no defined components"}:

| Component Name | Shape / Type | Role & Responsibility |
| :--- | :--- | :--- |
${nodeRows.length > 0 ? nodeRows.join("\n") : "| `Unspecified` | none | No components defined in canvas |"}

---

## 3. Communication Protocols & Data Flow

Inter-service communication observed in the design:

| Source Component | Destination Component | Protocol / Transport |
| :--- | :--- | :--- |
${edgeRows.length > 0 ? edgeRows.join("\n") : "| `Unspecified` | `Unspecified` | No inter-service connections defined in canvas |"}

---

## 4. Data Storage & Persistence Model (Recommendations)

- **Transactional Storage:** State management should be segregated between cache and persistent tiers based on domain workload.
- **Caching Layer:** High-frequency read queries can utilize in-memory key-value caching with TTL expiration.
- **Data Durability:** Relational transactional data should be backed up with automated replication and point-in-time recovery.

---

## 5. Security & Authentication Boundaries (Recommendations)

1. **Edge Security:** TLS termination, DDoS mitigation, and request throttling at the ingress boundary.
2. **Identity Verification:** JWT validation and role-based access control (RBAC) recommended on sensitive routes.
3. **Internal Zero-Trust:** Microservice-to-microservice traffic should be authenticated via mutual TLS (mTLS) or private VPC subnets.

---

## 6. Scalability & Resilience (Recommendations)

- **Horizontal Scaling:** Stateless compute nodes should auto-scale based on CPU utilization and request concurrency.
- **Failure Isolation:** Asynchronous queues decouple spike processing to prevent cascading failures.
- **Circuit Breakers:** Outgoing third-party requests should employ retry backoff and circuit breaker patterns.

---

## 7. Implementation Roadmap

1. Refine and approve architecture topology and service boundaries.
2. Provision cloud infrastructure and networking VPCs.
3. Deploy core services and configure ingress gateway routes.
4. Establish distributed tracing, synthetic health-checks, and metrics dashboards.
`;
}

/**
 * Background AI spec generation task conforming to 27-spec-generation-flow.md.
 * Synthesizes canvas nodes, edges, and conversation context into a structured Markdown specification.
 */
export const generateSpec = task({
  id: "generate-spec",
  run: async (payload: GenerateSpecPayload, { ctx }) => {
    logger.info("Spec generation task started", {
      runId: ctx.run.id,
      projectId: payload.projectId,
      roomId: payload.roomId,
      nodeCount: payload.nodes?.length ?? 0,
      edgeCount: payload.edges?.length ?? 0,
    });

    // Step 1: Validate payload schema with Zod
    const validated = GenerateSpecPayloadSchema.parse(payload);
    const { projectId, roomId, chatHistory, nodes, edges } = validated;

    // Step 2: Update realtime run metadata
    metadata.set("status", "analyzing");
    metadata.set("step", "Analyzing canvas topology and conversation context");

    let markdown: string;

    try {
      const googleApiKey =
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY;

      if (googleApiKey) {
        metadata.set("status", "generating");
        metadata.set("step", "Generating technical Markdown specification with Gemini AI");

        const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

        const prompt = `
You are a Principal Cloud Solutions Architect. Your mission is to generate a comprehensive, publication-grade Technical Architecture Specification in Markdown based on the provided system design diagram and conversation context.

## Workspace Context
- Project ID: ${projectId}
- Room ID: ${roomId}

## System Design Components (${nodes.length} nodes):
${JSON.stringify(nodes, null, 2)}

## Communication Connections (${edges.length} edges):
${JSON.stringify(edges, null, 2)}

## Collaborative Chat History:
${chatHistory.map((m) => `[${m.role.toUpperCase()} - ${m.sender || "User"}]: ${m.content}`).join("\n")}

## Required Technical Specification Format:
Generate a thorough, clean, highly structured Markdown document with the following sections:
# System Architecture Specification: [System Title]

## 1. Executive Summary & Architecture Overview
- System mission and purpose
- Key architectural patterns (e.g. Microservices, Event-Driven, Serverless)
- Business & functional requirements derived from the design

## 2. Component & Service Inventory
- Table of all components: Name, Shape/Category, Tech Stack Recommendation, Role & Responsibility
- In-depth breakdown of each core service

## 3. Communication Architecture & Data Flow
- Table of connections: Source, Target, Protocol/Pattern (e.g. gRPC, WSS, REST, Pub/Sub), Payload/Data Type
- Step-by-step end-to-end request lifecycle walk-through

## 4. Data Persistence & Storage Architecture
- Primary data stores, schemas, partitioning, and caching strategies
- Consistency models (ACID vs. Eventual Consistency)

## 5. Security, Ingress & Identity Architecture
- Ingress gateway, TLS termination, Authentication & Authorization (OAuth2/JWT/mTLS)
- Data at rest and data in transit encryption standards

## 6. Resilience, Scalability & Failure Modes
- High availability, redundancy, and auto-scaling triggers
- Circuit breakers, backpressure, dead-letter queues, and disaster recovery plan

## 7. Operational Observability & Implementation Checklist
- Metrics, distributed logging, tracing (OpenTelemetry)
- Step-by-step phased rollout roadmap

Keep the output as pure, professional Markdown without any surrounding JSON wrappers or conversational preamble.
`;

        try {
          const result = await generateText({
            model: google("gemini-2.5-flash"),
            prompt,
          });

          markdown = result.text.trim();
        } catch (geminiErr) {
          logger.warn("Gemini spec generation encountered an issue, falling back to structured spec", {
            error: String(geminiErr),
          });
          markdown = createFallbackTechnicalSpec(validated);
        }
      } else {
        logger.info("GOOGLE_AI_API_KEY not configured, using structured fallback spec generator");
        markdown = createFallbackTechnicalSpec(validated);
      }

      // Step 3: Persist spec in Vercel Blob and save ProjectSpec record in Prisma (28-spec-persistence-download.md)
      try {
        const savedSpec = await saveProjectSpec(projectId, markdown);
        metadata.set("specId", savedSpec.id);
        metadata.set("specUrl", savedSpec.filePath);
        logger.info("Persisted generated spec to Vercel Blob and Prisma", {
          specId: savedSpec.id,
          filePath: savedSpec.filePath,
        });
      } catch (saveErr) {
        logger.error("Failed to persist spec to Vercel Blob and database", {
          error: String(saveErr),
        });
        throw saveErr;
      }

      // Step 4: Complete run metadata
      metadata.set("status", "complete");
      metadata.set("step", "Technical specification generated successfully");
      metadata.set("wordCount", markdown.split(/\s+/).length);

      logger.info("Spec generation task completed successfully", {
        runId: ctx.run.id,
        charCount: markdown.length,
      });

      // Return plain Markdown string as specified in 27-spec-generation-flow.md
      return markdown;
    } catch (err) {
      logger.error("Spec generation failed", { error: String(err) });
      metadata.set("status", "error");
      metadata.set("step", `Error: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  },
});
