import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { saveProjectSpec } from "@/lib/specs";
import {
  GenerateSpecPayloadSchema,
  type GenerateSpecPayload,
} from "@/types/tasks";
import type { ProjectSpec } from "@prisma/client";

function escapeCell(str: string): string {
  return str.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

/**
 * Robust fallback generator that synthesizes a structured Markdown technical spec
 * directly from graph nodes, edges, and collaborative chat context when
 * the external Gemini API is unreachable or unconfigured.
 */
export function createFallbackTechnicalSpec(payload: GenerateSpecPayload): string {
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
    return `| \`${escapeCell(source)}\` | \`${escapeCell(target)}\` | ${escapeCell(label)} |`;
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

This architecture specification outlines the technical design, distributed topology, and integration contracts for the system designed on the Ghost AI collaborative canvas.

### Core Requirements
${requirementsText}

---

## 2. System Topology & Components

The active canvas graph contains **${nodes.length} components** and **${edges.length} interconnections**.

| Component | Shape | Role & Responsibilities |
| :--- | :--- | :--- |
${nodeRows.length > 0 ? nodeRows.join("\n") : "| *No nodes present* | - | Empty canvas graph |"}

---

## 3. Communication & Data Flow

The following data streams and protocol connections exist between components:

| Source | Target | Protocol / Semantics |
| :--- | :--- | :--- |
${edgeRows.length > 0 ? edgeRows.join("\n") : "| *No direct connections* | - | Standalone components |"}

---

## 4. Operational Invariants & Security

1. **Authentication & Authorization:** All external ingress traffic must terminate at the API Gateway with JWT validation.
2. **Reliability & Redundancy:** Stateless compute services should be horizontally autoscaled.
3. **Data Protection:** Persistent storage tiers must enforce encryption at rest and in transit.
4. **Observability:** Distributed tracing and health probes must be standard across all services.
`;
}

export interface SpecGenerationResult {
  success: boolean;
  specId: string;
  projectId: string;
  title: string;
  spec: ProjectSpec;
}

/**
 * Executes the complete technical architecture specification synthesis autonomously:
 * 1. Validates payload
 * 2. Uses Gemini model (with fallback) to generate comprehensive Markdown spec
 * 3. Persists spec markdown to Vercel Blob and records metadata in Prisma
 * 4. Returns completed spec record
 */
export async function executeSpecGeneration(
  rawPayload: unknown
): Promise<SpecGenerationResult> {
  const parsed = GenerateSpecPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error(`Invalid spec generation payload: ${parsed.error.message}`);
  }

  const payload = parsed.data;
  const { projectId, roomId, chatHistory, nodes, edges } = payload;
  const targetProjectId = projectId || roomId;

  console.log(`[SpecService] Starting spec generation for project: ${targetProjectId}, nodes: ${nodes.length}, edges: ${edges.length}`);

  let specMarkdown: string;

  const googleApiKey =
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (googleApiKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

    const systemPrompt = `You are a principal enterprise architect producing an authoritative, comprehensive Technical Architecture Specification Markdown document based on a software system's visual topology and discussion history.`;

    const userPrompt = `
Generate an enterprise-grade Technical Architecture Specification for project "${targetProjectId}".

Topology Data:
- Number of Nodes: ${nodes.length}
- Nodes: ${JSON.stringify(
      nodes.map((n) => ({
        id: n.id,
        label: (n.data as Record<string, unknown>)?.label || n.id,
        description: (n.data as Record<string, unknown>)?.description || "",
        shape: (n.data as Record<string, unknown>)?.shape || "rectangle",
      })),
      null,
      2
    )}

- Number of Edges: ${edges.length}
- Edges: ${JSON.stringify(
      edges.map((e) => ({
        source: e.source,
        target: e.target,
        label: (e.data as Record<string, unknown>)?.label || "",
      })),
      null,
      2
    )}

Recent Discussion / Requirements:
${
  chatHistory.length > 0
    ? chatHistory.map((m) => `[${m.role}] ${m.sender || "User"}: ${m.content}`).join("\n")
    : "No prior chat discussion recorded."
}

Format Guidelines:
- Produce clean, well-structured GitHub-flavored Markdown.
- Include:
  1. Executive Summary
  2. System Architecture & Topology Table
  3. Component Responsibilities & Data Contracts
  4. Data Flow & Communication Patterns Table
  5. Scalability, Resilience & Security Posture
  6. Recommended Tech Stack & Deployment Strategy
- Do not output preamble or backtick fences around the entire document. Output raw markdown directly.
`;

    try {
      const result = await generateText({
        model: google("gemini-2.5-flash"),
        system: systemPrompt,
        prompt: userPrompt,
      });

      specMarkdown = result.text.trim();
    } catch (geminiErr) {
      console.warn("[SpecService] Gemini spec synthesis failed, using fallback generator:", geminiErr);
      specMarkdown = createFallbackTechnicalSpec(payload);
    }
  } else {
    console.log("[SpecService] GOOGLE_AI_API_KEY not configured, using structured fallback generator");
    specMarkdown = createFallbackTechnicalSpec(payload);
  }

  // Persist to Vercel Blob and Prisma
  const savedSpec = await saveProjectSpec(targetProjectId, specMarkdown);

  const titleMatch = specMarkdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "System Architecture Specification";

  console.log(`[SpecService] Spec persisted with ID: ${savedSpec.id}`);

  return {
    success: true,
    specId: savedSpec.id,
    projectId: targetProjectId,
    title,
    spec: savedSpec,
  };
}
