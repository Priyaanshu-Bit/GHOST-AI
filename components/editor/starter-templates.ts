import {
  CANVAS_NODE_TYPE,
  CANVAS_EDGE_TYPE,
  NODE_COLORS,
  type CanvasNode,
  type CanvasEdge,
  type NodeShape,
} from "@/types/canvas";
import { MarkerType } from "@xyflow/react";

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/**
 * Helper to build a clean CanvasNode for starter templates.
 */
function createNode(
  id: string,
  label: string,
  shape: NodeShape,
  colorIndex: number,
  x: number,
  y: number,
  width: number,
  height: number
): CanvasNode {
  const palette = NODE_COLORS[colorIndex] || NODE_COLORS[0];
  return {
    id,
    type: CANVAS_NODE_TYPE,
    position: { x, y },
    data: {
      label,
      shape,
      color: palette.fill,
      textColor: palette.text,
    },
    style: {
      width,
      height,
    },
  };
}

/**
 * Helper to build a clean CanvasEdge with directional arrows for starter templates.
 */
function createEdge(
  id: string,
  source: string,
  target: string,
  label?: string,
  sourceHandle: string = "right",
  targetHandle: string = "left"
): CanvasEdge {
  return {
    id,
    type: CANVAS_EDGE_TYPE,
    source,
    target,
    sourceHandle,
    targetHandle,
    data: {
      label: label || "",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
      width: 16,
      height: 16,
    },
  };
}

/**
 * Predefined starter templates for Ghost AI architecture diagrams:
 * 1. Microservices Architecture
 * 2. CI/CD Deployment Pipeline
 * 3. Event-Driven System
 */
export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices Architecture",
    description:
      "Distributed backend system with an API gateway, authentication service, domain services, caching layer, and database.",
    nodes: [
      createNode("client", "Web & Mobile Clients", "pill", 1, 60, 180, 160, 65), // Blue
      createNode("gateway", "API Gateway", "hexagon", 2, 280, 160, 140, 105), // Purple
      createNode("auth-service", "Auth Service", "rectangle", 3, 490, 60, 145, 75), // Orange
      createNode("user-service", "User Service", "rectangle", 7, 490, 175, 145, 75), // Teal
      createNode("order-service", "Order Service", "rectangle", 5, 490, 290, 145, 75), // Pink
      createNode("redis-cache", "Redis Cache", "cylinder", 4, 710, 50, 125, 95), // Red
      createNode("postgres-db", "Postgres DB", "cylinder", 6, 710, 230, 125, 95), // Green
    ],
    edges: [
      createEdge("e-client-gateway", "client", "gateway", "HTTPS / REST", "right", "left"),
      createEdge("e-gateway-auth", "gateway", "auth-service", "Verify Token", "top", "left"),
      createEdge("e-gateway-user", "gateway", "user-service", "gRPC", "right", "left"),
      createEdge("e-gateway-order", "gateway", "order-service", "gRPC", "bottom", "left"),
      createEdge("e-auth-cache", "auth-service", "redis-cache", "Session Hit", "right", "left"),
      createEdge("e-user-db", "user-service", "postgres-db", "Read / Write", "right", "left"),
      createEdge("e-order-db", "order-service", "postgres-db", "Transactions", "right", "left"),
    ],
  },
  {
    id: "cicd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "Modern automated deployment workflow from code commits through automated testing, containerization, security scans, and deployment.",
    nodes: [
      createNode("git-repo", "Git Repo", "circle", 3, 60, 150, 90, 90), // Orange
      createNode("ci-runner", "Lint & Test", "rectangle", 1, 210, 160, 140, 70), // Blue
      createNode("docker-build", "Build Container", "rectangle", 2, 410, 160, 145, 70), // Purple
      createNode("security-scan", "Security Scan", "diamond", 5, 615, 140, 110, 110), // Pink
      createNode("registry", "Container Registry", "cylinder", 7, 785, 55, 125, 95), // Teal
      createNode("staging-env", "Staging Cluster", "hexagon", 0, 780, 230, 135, 95), // Neutral Dark
      createNode("production", "Production", "hexagon", 6, 980, 230, 135, 95), // Green
    ],
    edges: [
      createEdge("e-git-ci", "git-repo", "ci-runner", "Git Push", "right", "left"),
      createEdge("e-ci-build", "ci-runner", "docker-build", "Tests Pass", "right", "left"),
      createEdge("e-build-scan", "docker-build", "security-scan", "Artifact", "right", "left"),
      createEdge("e-scan-registry", "security-scan", "registry", "Zero CVEs", "top", "left"),
      createEdge("e-registry-staging", "registry", "staging-env", "Pull Image", "bottom", "top"),
      createEdge("e-staging-prod", "staging-env", "production", "Promote Release", "right", "left"),
    ],
  },
  {
    id: "event-driven",
    name: "Event-Driven System",
    description:
      "High-throughput real-time messaging architecture with event streams, parallel consumers, analytical stores, and fault tolerance.",
    nodes: [
      createNode("producer", "Telemetry Events", "circle", 1, 60, 155, 90, 90), // Blue
      createNode("ingest-api", "Ingestion API", "rectangle", 2, 210, 165, 140, 70), // Purple
      createNode("kafka-bus", "Kafka Message Bus", "hexagon", 3, 410, 150, 145, 100), // Orange
      createNode("stream-worker", "Flink Processor", "rectangle", 5, 620, 65, 145, 70), // Pink
      createNode("alert-worker", "Alert Dispatcher", "pill", 7, 620, 260, 145, 65), // Teal
      createNode("timescale-db", "TimescaleDB", "cylinder", 6, 830, 50, 125, 95), // Green
      createNode("dlq", "Dead Letter Queue", "cylinder", 4, 830, 245, 125, 95), // Red
    ],
    edges: [
      createEdge("e-producer-ingest", "producer", "ingest-api", "Emit Events", "right", "left"),
      createEdge("e-ingest-kafka", "ingest-api", "kafka-bus", "Publish Topic", "right", "left"),
      createEdge("e-kafka-stream", "kafka-bus", "stream-worker", "Consume Stream", "top", "left"),
      createEdge("e-kafka-alert", "kafka-bus", "alert-worker", "Filter Alerts", "bottom", "left"),
      createEdge("e-stream-db", "stream-worker", "timescale-db", "Aggregated Metrics", "right", "left"),
      createEdge("e-stream-dlq", "stream-worker", "dlq", "Failed Records", "bottom", "left"),
    ],
  },
];
