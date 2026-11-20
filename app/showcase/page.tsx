"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Sparkles,
  LayoutTemplate,
  Cloud,
  Check,
  Share2,
  FileText,
  Download,
  Loader2,
  ArrowRight,
  Database,
  Server,
  Zap,
  Globe,
  Lock,
  ChevronRight,
  ExternalLink,
  Bot,
  Layers,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Custom node component for showcase canvas
function ShowcaseNode({ data, selected }: NodeProps) {
  const shape = (data?.shape as string) || "rectangle";
  const label = (data?.label as string) || "Node";
  const color = (data?.color as string) || "#1A1A1E";
  const textColor = (data?.textColor as string) || "#EDEDED";
  const subtitle = (data?.subtitle as string) || "";
  const iconType = (data?.iconType as string) || "";

  const strokeColor = selected ? "#62C073" : "#2E2E36";

  const renderIcon = () => {
    switch (iconType) {
      case "globe":
        return <Globe className="w-3.5 h-3.5 text-[#52A8FF]" />;
      case "server":
        return <Server className="w-3.5 h-3.5 text-[#BF7AF0]" />;
      case "db":
        return <Database className="w-3.5 h-3.5 text-[#62C073]" />;
      case "zap":
        return <Zap className="w-3.5 h-3.5 text-[#FF990A]" />;
      case "lock":
        return <Lock className="w-3.5 h-3.5 text-[#FF6166]" />;
      default:
        return null;
    }
  };

  const isCylinder = shape === "cylinder";
  const isPill = shape === "pill";
  const isHexagon = shape === "hexagon";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center transition-all duration-300 shadow-xl group",
        isPill ? "rounded-full px-5 py-3" : isCylinder ? "rounded-xl py-3 px-4" : "rounded-xl p-3.5",
        selected && "ring-2 ring-[#62C073] ring-offset-2 ring-offset-[#080809]"
      )}
      style={{
        backgroundColor: color,
        border: `1.5px solid ${strokeColor}`,
        minWidth: isPill ? 140 : 160,
        boxShadow: selected
          ? "0 0 25px rgba(98, 192, 115, 0.25)"
          : "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-[#52A8FF] !border-none transition-transform group-hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-[#52A8FF] !border-none transition-transform group-hover:scale-125"
      />

      <div className="flex items-center gap-2 mb-0.5">
        {renderIcon()}
        <span
          className="text-xs font-semibold tracking-wide"
          style={{ color: textColor }}
        >
          {label}
        </span>
      </div>

      {subtitle && (
        <span className="text-[10px] text-[#888891] font-mono tracking-tight">
          {subtitle}
        </span>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-[#62C073] !border-none transition-transform group-hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-[#62C073] !border-none transition-transform group-hover:scale-125"
      />
    </div>
  );
}

const nodeTypes = {
  showcaseNode: ShowcaseNode,
};

// Initial template architecture
const INITIAL_NODES: Node[] = [
  {
    id: "clients",
    type: "showcaseNode",
    position: { x: 60, y: 160 },
    data: {
      label: "Web & Mobile Clients",
      subtitle: "Next.js 16 + iOS + Android",
      shape: "pill",
      iconType: "globe",
      color: "#121824",
      textColor: "#52A8FF",
    },
  },
  {
    id: "cdn",
    type: "showcaseNode",
    position: { x: 300, y: 160 },
    data: {
      label: "Edge CDN & WAF",
      subtitle: "Cloudflare Global Anycast",
      shape: "rectangle",
      iconType: "lock",
      color: "#181424",
      textColor: "#BF7AF0",
    },
  },
  {
    id: "gateway",
    type: "showcaseNode",
    position: { x: 550, y: 160 },
    data: {
      label: "API Gateway",
      subtitle: "Reverse Proxy & Rate Limiting",
      shape: "rectangle",
      iconType: "server",
      color: "#181424",
      textColor: "#BF7AF0",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "e-clients-cdn",
    source: "clients",
    target: "cdn",
    label: "HTTPS / TLS 1.3",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#52A8FF", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#52A8FF" },
  },
  {
    id: "e-cdn-gateway",
    source: "cdn",
    target: "gateway",
    label: "Anycast Route",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#BF7AF0", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#BF7AF0" },
  },
];

// Expanded microservices architecture populated via Templates
const TEMPLATE_NODES: Node[] = [
  ...INITIAL_NODES,
  {
    id: "auth-svc",
    type: "showcaseNode",
    position: { x: 800, y: 60 },
    data: {
      label: "Auth Service",
      subtitle: "JWT + Clerk Sessions",
      shape: "rectangle",
      iconType: "lock",
      color: "#1E1812",
      textColor: "#FF990A",
    },
  },
  {
    id: "order-svc",
    type: "showcaseNode",
    position: { x: 800, y: 160 },
    data: {
      label: "Order Service",
      subtitle: "Checkout & Inventory gRPC",
      shape: "rectangle",
      iconType: "server",
      color: "#121A16",
      textColor: "#62C073",
    },
  },
  {
    id: "user-svc",
    type: "showcaseNode",
    position: { x: 800, y: 260 },
    data: {
      label: "User Profile Service",
      subtitle: "Graph Data & Preferences",
      shape: "rectangle",
      iconType: "server",
      color: "#181424",
      textColor: "#BF7AF0",
    },
  },
  {
    id: "redis-cache",
    type: "showcaseNode",
    position: { x: 1060, y: 60 },
    data: {
      label: "Redis Cluster",
      subtitle: "Sub-millisecond Cache",
      shape: "cylinder",
      iconType: "zap",
      color: "#1E1214",
      textColor: "#FF6166",
    },
  },
  {
    id: "postgres-primary",
    type: "showcaseNode",
    position: { x: 1060, y: 210 },
    data: {
      label: "PostgreSQL Primary",
      subtitle: "Neon Serverless DB",
      shape: "cylinder",
      iconType: "db",
      color: "#121A16",
      textColor: "#62C073",
    },
  },
];

const TEMPLATE_EDGES: Edge[] = [
  ...INITIAL_EDGES,
  {
    id: "e-gw-auth",
    source: "gateway",
    target: "auth-svc",
    label: "Verify Token",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#FF990A", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#FF990A" },
  },
  {
    id: "e-gw-order",
    source: "gateway",
    target: "order-svc",
    label: "gRPC",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#62C073", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#62C073" },
  },
  {
    id: "e-gw-user",
    source: "gateway",
    target: "user-svc",
    label: "REST",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#BF7AF0", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#BF7AF0" },
  },
  {
    id: "e-auth-redis",
    source: "auth-svc",
    target: "redis-cache",
    label: "Session Hit (<1ms)",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#FF6166", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#FF6166" },
  },
  {
    id: "e-order-pg",
    source: "order-svc",
    target: "postgres-primary",
    label: "ACID Commit",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#62C073", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#62C073" },
  },
  {
    id: "e-user-pg",
    source: "user-svc",
    target: "postgres-primary",
    label: "Read / Write",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#52A8FF", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#52A8FF" },
  },
];

// Dynamically added nodes from AI Architect prompt
const AI_GENERATED_NODES: Node[] = [
  ...TEMPLATE_NODES,
  {
    id: "stripe-gateway",
    type: "showcaseNode",
    position: { x: 800, y: 370 },
    data: {
      label: "Stripe Payment Gateway",
      subtitle: "Webhooks & Subscriptions",
      shape: "rectangle",
      iconType: "lock",
      color: "#181424",
      textColor: "#BF7AF0",
    },
  },
  {
    id: "kafka-bus",
    type: "showcaseNode",
    position: { x: 1060, y: 370 },
    data: {
      label: "Apache Kafka Stream",
      subtitle: "Transactional Outbox Bus",
      shape: "rectangle",
      iconType: "zap",
      color: "#1E1812",
      textColor: "#FF990A",
    },
  },
  {
    id: "fraud-worker",
    type: "showcaseNode",
    position: { x: 1300, y: 370 },
    data: {
      label: "Fraud ML Worker",
      subtitle: "Real-time Risk Scoring",
      shape: "rectangle",
      iconType: "server",
      color: "#1E1214",
      textColor: "#FF6166",
    },
  },
];

const AI_GENERATED_EDGES: Edge[] = [
  ...TEMPLATE_EDGES,
  {
    id: "e-order-stripe",
    source: "order-svc",
    target: "stripe-gateway",
    label: "Process Charge",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#BF7AF0", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#BF7AF0" },
  },
  {
    id: "e-stripe-kafka",
    source: "stripe-gateway",
    target: "kafka-bus",
    label: "payment.succeeded",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#FF990A", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#FF990A" },
  },
  {
    id: "e-kafka-fraud",
    source: "kafka-bus",
    target: "fraud-worker",
    label: "Event Consumer",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#FF6166", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#FF6166" },
  },
];

const SAMPLE_GENERATED_SPEC = `# System Architecture Specification
## Project: Global Distributed E-Commerce Architecture
**Date:** March 2026 | **Generated by:** Ghost AI Architect (Gemini 2.5 Flash)

---

### 1. Executive Summary & Topology
The system design implements an event-driven, high-throughput microservices architecture supporting multi-region client traffic with sub-10ms response latencies, multi-tier caching, and guaranteed idempotency.

| Layer | Service / Technology | Protocol / Port | SLA / Throughput |
|---|---|---|---|
| **Edge Ingress** | Cloudflare Anycast + WAF | TLS 1.3 / HTTP/3 | 99.999% Availability |
| **API Gateway** | Envoy Proxy Gateway | gRPC / HTTP/2 | 45,000 req/sec |
| **Domain Services** | Auth, Order, User Profiles | Go / Node.js 24 | <15ms p99 Latency |
| **Payment & Risk** | Stripe Engine + Fraud ML | Webhook & Kafka | Zero Double-Charge Guarantee |
| **Message Broker** | Apache Kafka | Event Streaming | 100k events/sec |
| **Persistence** | PostgreSQL (Neon) + Redis | ACID / In-Memory | Multi-AZ Failover |

---

### 2. Transaction Flow & Idempotency
1. **Client Checkout Request:** Initiated from Web/Mobile client through Edge CDN with zero-trust token inspection.
2. **Order Processing:** Order Service reserves inventory and issues an idempotent charge request to Stripe Gateway.
3. **Event Stream Publication:** Upon successful charge capture, an atomic transaction writes to the Transactional Outbox table and publishes \`payment.succeeded\` to Apache Kafka.
4. **Fraud Worker & Auditing:** The asynchronous ML consumer validates scoring without blocking client checkout latency.

---

### 3. High Availability & Fault Tolerance
- **Read-Replica Sharding:** Database queries are automatically offloaded to read replicas, scaling read capacity by 10x.
- **Circuit Breaking:** API Gateway enforces aggressive 500ms timeouts with automatic circuit breaker fallback to cached catalog responses.
- **Dead Letter Queue (DLQ):** Unprocessed Kafka events route to isolated DLQ topics for automated replay.`;

export default function ShowcasePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  // UI state
  const [isTemplatesOpen, setIsTemplatesOpen] = React.useState(false);
  const [isAiOpen, setIsAiOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"design" | "specs">("design");
  const [promptInput, setPromptInput] = React.useState("");
  const [isGeneratingDesign, setIsGeneratingDesign] = React.useState(false);
  const [isGeneratingSpec, setIsGeneratingSpec] = React.useState(false);
  const [generatedSpec, setGeneratedSpec] = React.useState<string | null>(null);
  const [aiStatusMessage, setAiStatusMessage] = React.useState<string | null>(null);

  // Feature badge step
  const [featureStep, setFeatureStep] = React.useState(1);

  // Simulated peer cursor position
  const [peerCursor, setPeerCursor] = React.useState({ x: 420, y: 260, visible: true });

  // Autoplay director for recording
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldAutoplay = params.get("autoplay") === "true";

    if (!shouldAutoplay) return;

    let mounted = true;

    async function runShowcaseScript() {
      // Step 1: Real-time Canvas Exploration (0s - 7s)
      setFeatureStep(1);
      await new Promise((r) => setTimeout(r, 1500));
      if (!mounted) return;

      // Move peer cursor smoothly
      setPeerCursor({ x: 580, y: 190, visible: true });
      await new Promise((r) => setTimeout(r, 2000));
      if (!mounted) return;

      setPeerCursor({ x: 320, y: 180, visible: true });
      await new Promise((r) => setTimeout(r, 2500));
      if (!mounted) return;

      // Step 2: Open Starter Templates (7s - 16s)
      setFeatureStep(2);
      setIsTemplatesOpen(true);
      await new Promise((r) => setTimeout(r, 3000));
      if (!mounted) return;

      // Import Microservices template
      setIsTemplatesOpen(false);
      setNodes(TEMPLATE_NODES);
      setEdges(TEMPLATE_EDGES);
      await new Promise((r) => setTimeout(r, 2500));
      if (!mounted) return;

      // Step 3: Ghost AI Natural Language Generation (16s - 32s)
      setFeatureStep(3);
      setIsAiOpen(true);
      setActiveTab("design");
      await new Promise((r) => setTimeout(r, 1200));
      if (!mounted) return;

      // Type prompt into AI Architect
      const targetPrompt =
        "Extend with Stripe Payment Gateway, Apache Kafka event stream, and Fraud ML worker";
      for (let i = 0; i <= targetPrompt.length; i += 3) {
        setPromptInput(targetPrompt.slice(0, i));
        await new Promise((r) => setTimeout(r, 45));
        if (!mounted) return;
      }
      await new Promise((r) => setTimeout(r, 800));
      if (!mounted) return;

      // Click Generate Architecture
      setIsGeneratingDesign(true);
      setAiStatusMessage("Synthesizing microservices topology with Google Gemini...");
      await new Promise((r) => setTimeout(r, 2000));
      if (!mounted) return;

      setAiStatusMessage("Plotting 3 new services & connecting Kafka event bus...");
      await new Promise((r) => setTimeout(r, 1800));
      if (!mounted) return;

      setIsGeneratingDesign(false);
      setAiStatusMessage("Architecture graph successfully deployed to canvas!");
      setNodes(AI_GENERATED_NODES);
      setEdges(AI_GENERATED_EDGES);
      await new Promise((r) => setTimeout(r, 2500));
      if (!mounted) return;

      // Step 4: Spec Generation Engine (32s - 48s)
      setFeatureStep(4);
      setActiveTab("specs");
      await new Promise((r) => setTimeout(r, 1500));
      if (!mounted) return;

      setIsGeneratingSpec(true);
      setAiStatusMessage("Analyzing canvas topology and generating technical PRD...");
      await new Promise((r) => setTimeout(r, 2200));
      if (!mounted) return;

      setIsGeneratingSpec(false);
      setGeneratedSpec(SAMPLE_GENERATED_SPEC);
      setAiStatusMessage(null);
      await new Promise((r) => setTimeout(r, 5000));
      if (!mounted) return;

      // Step 5: Final Overview Card (48s - 55s)
      setFeatureStep(5);
    }

    runShowcaseScript();

    return () => {
      mounted = false;
    };
  }, [setNodes, setEdges]);

  // Actions for manual interaction
  const handleApplyTemplate = (type: "microservices" | "event" | "cicd") => {
    setIsTemplatesOpen(false);
    if (type === "microservices") {
      setNodes(TEMPLATE_NODES);
      setEdges(TEMPLATE_EDGES);
    }
  };

  const handleGenerateDesign = () => {
    setIsGeneratingDesign(true);
    setAiStatusMessage("Synthesizing microservices topology with Google Gemini...");
    setTimeout(() => {
      setAiStatusMessage("Deploying nodes to collaborative canvas...");
      setTimeout(() => {
        setIsGeneratingDesign(false);
        setAiStatusMessage("Architecture graph updated!");
        setNodes(AI_GENERATED_NODES);
        setEdges(AI_GENERATED_EDGES);
      }, 1500);
    }, 1500);
  };

  const handleGenerateSpec = () => {
    setIsGeneratingSpec(true);
    setTimeout(() => {
      setIsGeneratingSpec(false);
      setGeneratedSpec(SAMPLE_GENERATED_SPEC);
    }, 2000);
  };

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-[#080809] text-[#EDEDED] font-sans select-none">
      {/* Top Header Navbar */}
      <header className="h-14 border-b border-[#1E1E24] bg-[#0E0E12]/90 backdrop-blur-md flex items-center justify-between px-5 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#62C073] via-[#00C8D4] to-[#BF7AF0] flex items-center justify-center shadow-lg shadow-[#62C073]/20">
              <Bot className="h-4.5 w-4.5 text-[#080809] stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Ghost AI
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded-full bg-[#62C073]/15 text-[#62C073] border border-[#62C073]/30">
                  v1.0 Live
                </span>
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#2E2E36]" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#D1D1DB]">
              Global Distributed E-Commerce Architecture
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#121A16] border border-[#62C073]/30 text-[#62C073] text-[11px] font-medium">
              <Check className="h-3 w-3 stroke-[2.5]" />
              <span>Saved to cloud</span>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplatesOpen(true)}
            className="h-8 gap-2 bg-[#14141A] hover:bg-[#1E1E26] border-[#2E2E38] text-xs text-[#D1D1DB] hover:text-white"
          >
            <LayoutTemplate className="h-3.5 w-3.5 text-[#52A8FF]" />
            <span>Templates</span>
          </Button>

          {/* Collaborator Avatars */}
          <div className="flex items-center -space-x-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#62C073] to-[#0AC7B4] border-2 border-[#080809] flex items-center justify-center text-[11px] font-bold text-black" title="You (Lead Architect)">
              PG
            </div>
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#BF7AF0] to-[#52A8FF] border-2 border-[#080809] flex items-center justify-center text-[11px] font-bold text-black" title="Elena R. (Distributed Systems)">
              ER
            </div>
            <div className="h-7 w-7 rounded-full bg-[#1F1F28] border-2 border-[#080809] flex items-center justify-center text-[10px] font-mono text-[#62C073] border-[#62C073]/40" title="Ghost AI Agent">
              AI
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 bg-[#14141A] hover:bg-[#1E1E26] border-[#2E2E38] text-xs text-[#D1D1DB]"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAiOpen(!isAiOpen)}
            className={cn(
              "h-8 gap-2 px-3.5 text-xs font-semibold transition-all shadow-lg",
              isAiOpen
                ? "bg-[#62C073] hover:bg-[#52ab62] text-[#080809] shadow-[#62C073]/25"
                : "bg-gradient-to-r from-[#62C073] to-[#00C8D4] hover:opacity-95 text-[#080809]"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 fill-current" />
            <span>AI Architect</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Toolbar / Shape Palette */}
        <div className="absolute left-4 top-4 z-20 flex flex-col gap-1.5 p-1.5 rounded-xl bg-[#121217]/90 border border-[#23232C] backdrop-blur-md shadow-2xl">
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[#888891] hover:text-white hover:bg-[#1E1E26] transition-colors" title="Select / Pan">
            <MousePointer2 className="h-4 w-4" />
          </button>
          <div className="h-[1px] w-full bg-[#23232C]" />
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[#52A8FF] hover:bg-[#1E1E26] transition-colors" title="Add Service Node">
            <Server className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[#62C073] hover:bg-[#1E1E26] transition-colors" title="Add Database Node">
            <Database className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[#FF990A] hover:bg-[#1E1E26] transition-colors" title="Add Event Bus / Queue">
            <Zap className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[#BF7AF0] hover:bg-[#1E1E26] transition-colors" title="Add Edge Gateway">
            <Globe className="h-4 w-4" />
          </button>
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 h-full w-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[#080809]"
            minZoom={0.2}
            maxZoom={1.8}
            defaultViewport={{ x: 50, y: 100, zoom: 0.95 }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="#22222B"
            />
            <Controls className="!bg-[#121217] !border-[#23232C] !shadow-2xl fill-white" />
            <MiniMap
              nodeColor={(n) => {
                if (n.id.includes("pg") || n.id.includes("order")) return "#62C073";
                if (n.id.includes("redis") || n.id.includes("fraud")) return "#FF6166";
                if (n.id.includes("kafka") || n.id.includes("auth")) return "#FF990A";
                return "#52A8FF";
              }}
              maskColor="rgba(8, 8, 9, 0.75)"
              className="!bg-[#121217] !border-[#23232C] !rounded-xl !overflow-hidden"
            />
          </ReactFlow>

          {/* Simulated Peer Cursor */}
          {peerCursor.visible && (
            <div
              className="absolute pointer-events-none transition-all duration-700 ease-out z-20"
              style={{
                left: peerCursor.x,
                top: peerCursor.y,
              }}
            >
              <MousePointer2 className="h-4 w-4 text-[#BF7AF0] fill-[#BF7AF0] -rotate-45" />
              <div className="ml-3 -mt-1 px-2 py-0.5 rounded-md bg-[#BF7AF0] text-[#080809] text-[10px] font-bold whitespace-nowrap shadow-md">
                Elena R.
              </div>
            </div>
          )}
        </div>

        {/* Right AI Drawer Panel */}
        {isAiOpen && (
          <aside className="w-[420px] h-full border-l border-[#1E1E24] bg-[#0E0E12]/95 backdrop-blur-xl flex flex-col z-20 shadow-2xl transition-all duration-300">
            {/* Drawer Tabs */}
            <div className="flex items-center justify-between border-b border-[#1E1E24] px-4 py-2.5">
              <div className="flex items-center gap-1 bg-[#14141A] p-0.5 rounded-lg border border-[#23232C]">
                <button
                  onClick={() => setActiveTab("design")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                    activeTab === "design"
                      ? "bg-[#62C073] text-[#080809]"
                      : "text-[#888891] hover:text-white"
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>AI Architect</span>
                </button>
                <button
                  onClick={() => setActiveTab("specs")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                    activeTab === "specs"
                      ? "bg-[#62C073] text-[#080809]"
                      : "text-[#888891] hover:text-white"
                  )}
                >
                  <FileText className="h-3 w-3" />
                  <span>Technical Specs</span>
                </button>
              </div>

              <button
                onClick={() => setIsAiOpen(false)}
                className="h-7 w-7 rounded-md flex items-center justify-center text-[#888891] hover:text-white hover:bg-[#1E1E26]"
              >
                ✕
              </button>
            </div>

            {/* AI Architect Tab */}
            {activeTab === "design" && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-md bg-[#62C073]/15 text-[#62C073] flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A0A0AB]">
                    Autonomous Topology Synthesizer
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-[#14141A] border border-[#23232C] mb-3">
                  <p className="text-xs text-[#A0A0AB] leading-relaxed">
                    Describe any system, queue, microservice, or database in plain English. Ghost AI plots the graph directly onto your shared canvas.
                  </p>
                </div>

                {/* Prompt Textarea */}
                <div className="flex flex-col gap-2 mb-3">
                  <label className="text-[11px] font-medium text-[#888891]">
                    System Architecture Prompt
                  </label>
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="e.g. Design a high-throughput video transcoding pipeline with S3, SQS, and Redis..."
                    rows={4}
                    className="w-full resize-none rounded-xl bg-[#14141A] border border-[#2E2E38] p-3 text-xs text-white placeholder-[#555562] focus:outline-none focus:border-[#62C073]"
                  />
                </div>

                {/* Quick Prompts */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {[
                    "Stripe Checkout + Kafka Bus",
                    "Add Redis Session Cache",
                    "Sharded Postgres Read Replicas",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setPromptInput(`Add ${chip} to the architecture`)}
                      className="px-2.5 py-1 rounded-full bg-[#181820] hover:bg-[#22222E] border border-[#2E2E38] text-[11px] text-[#A0A0AB] hover:text-white transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateDesign}
                  disabled={isGeneratingDesign}
                  className="w-full gap-2 bg-[#62C073] hover:bg-[#52ab62] text-[#080809] font-bold text-xs h-9 shadow-lg shadow-[#62C073]/20"
                >
                  {isGeneratingDesign ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Synthesizing Architecture...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Generate Architecture</span>
                    </>
                  )}
                </Button>

                {/* Status Updates */}
                {aiStatusMessage && (
                  <div className="mt-4 p-3 rounded-xl bg-[#121A16] border border-[#62C073]/30 flex items-start gap-2.5 animate-fadeIn">
                    <Loader2 className="h-4 w-4 text-[#62C073] animate-spin shrink-0 mt-0.5" />
                    <span className="text-xs text-[#62C073] font-medium leading-tight">
                      {aiStatusMessage}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Technical Specs Tab */}
            {activeTab === "specs" && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-[#52A8FF]/15 text-[#52A8FF] flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A0A0AB]">
                      Automated PRD & Specs
                    </h3>
                  </div>

                  {generatedSpec && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-[11px] bg-[#14141A] border-[#2E2E38] text-[#52A8FF]"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download .md</span>
                    </Button>
                  )}
                </div>

                {!generatedSpec && (
                  <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[#14141A] border border-[#23232C] my-auto">
                    <Layers className="h-10 w-10 text-[#555562] mb-3 stroke-1" />
                    <h4 className="text-xs font-bold text-white mb-1">
                      Convert Canvas Graph to PRD
                    </h4>
                    <p className="text-[11px] text-[#888891] mb-4 max-w-[240px]">
                      Ghost AI inspects every node, edge, and protocol to generate a production-ready system architecture specification.
                    </p>
                    <Button
                      onClick={handleGenerateSpec}
                      disabled={isGeneratingSpec}
                      className="w-full gap-2 bg-[#52A8FF] hover:bg-[#4395e8] text-[#080809] font-bold text-xs h-8"
                    >
                      {isGeneratingSpec ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Synthesizing Technical Spec...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5" />
                          <span>Generate Specification</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {generatedSpec && (
                  <div className="flex-1 overflow-y-auto rounded-xl bg-[#09090C] border border-[#1E1E24] p-3 text-[11px] text-[#C4C4CF] font-mono leading-relaxed space-y-2 select-text">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E1E24]">
                      <span className="text-[10px] text-[#62C073] font-bold uppercase tracking-wider">
                        ✓ Architecture PRD Ready
                      </span>
                      <span className="text-[10px] text-[#888891]">1,240 tokens</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-[#D8D8E2]">
                      {generatedSpec}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Starter Templates Modal */}
      {isTemplatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0E0E12] border border-[#2E2E38] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E1E24] mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-[#52A8FF]" />
                  Starter System Design Templates
                </h3>
                <p className="text-xs text-[#888891] mt-0.5">
                  Load production architecture blueprints directly into your active collaborative room.
                </p>
              </div>
              <button
                onClick={() => setIsTemplatesOpen(false)}
                className="text-[#888891] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div
                onClick={() => handleApplyTemplate("microservices")}
                className="group cursor-pointer rounded-xl bg-[#14141A] hover:bg-[#1A1A22] border border-[#23232C] hover:border-[#62C073] p-4 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white group-hover:text-[#62C073] flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-[#62C073]" />
                    Microservices Architecture
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#62C073]/15 text-[#62C073] font-mono">
                    7 Nodes
                  </span>
                </div>
                <p className="text-[11px] text-[#888891] leading-relaxed mb-3">
                  API Gateway, Auth, Domain Services, Redis Cache, and PostgreSQL persistence with gRPC inter-service comms.
                </p>
                <div className="flex items-center text-[11px] font-semibold text-[#62C073] gap-1">
                  <span>Import Template</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>

              <div
                onClick={() => handleApplyTemplate("event")}
                className="group cursor-pointer rounded-xl bg-[#14141A] hover:bg-[#1A1A22] border border-[#23232C] hover:border-[#FF990A] p-4 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white group-hover:text-[#FF990A] flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-[#FF990A]" />
                    Event-Driven Streaming
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FF990A]/15 text-[#FF990A] font-mono">
                    6 Nodes
                  </span>
                </div>
                <p className="text-[11px] text-[#888891] leading-relaxed mb-3">
                  Telemetry emitters, Ingest API, Kafka topic partitions, Flink stream workers, TimescaleDB, and DLQ.
                </p>
                <div className="flex items-center text-[11px] font-semibold text-[#FF990A] gap-1">
                  <span>Import Template</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTemplatesOpen(false)}
                className="bg-[#14141A] border-[#2E2E38] text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Feature HUD Overlay */}
      <div className="absolute bottom-5 left-5 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0E0E12]/95 border border-[#23232C] backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[#62C073] animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-[#888891] uppercase tracking-wider">
            FEATURE 0{featureStep <= 4 ? featureStep : 4} OF 04
          </span>
        </div>

        <div className="h-3.5 w-[1px] bg-[#2E2E36]" />

        <div className="text-xs font-bold text-white flex items-center gap-2">
          {featureStep === 1 && (
            <>
              <span className="text-[#52A8FF]">REAL-TIME COLLABORATIVE CANVAS</span>
              <span className="text-[11px] text-[#888891] font-normal hidden sm:inline">
                • Multi-user Liveblocks presence & React Flow
              </span>
            </>
          )}
          {featureStep === 2 && (
            <>
              <span className="text-[#62C073]">1-CLICK ARCHITECTURE TEMPLATES</span>
              <span className="text-[11px] text-[#888891] font-normal hidden sm:inline">
                • Microservices, Event-Driven & CI/CD Pipelines
              </span>
            </>
          )}
          {featureStep === 3 && (
            <>
              <span className="text-[#BF7AF0]">GHOST AI TOPOLOGY ENGINE</span>
              <span className="text-[11px] text-[#888891] font-normal hidden sm:inline">
                • Natural language to distributed system graphs
              </span>
            </>
          )}
          {featureStep >= 4 && (
            <>
              <span className="text-[#FF990A]">TECHNICAL SPEC (PRD) SYNTHESIS</span>
              <span className="text-[11px] text-[#888891] font-normal hidden sm:inline">
                • Instant production Markdown documentation
              </span>
            </>
          )}
        </div>
      </div>

      {/* Outro Modal Card if Step 5 */}
      {featureStep === 5 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-[#0E0E12] border border-[#2E2E38] p-8 text-center shadow-2xl flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#62C073] via-[#00C8D4] to-[#BF7AF0] flex items-center justify-center shadow-2xl shadow-[#62C073]/30 mb-4">
              <Bot className="h-9 w-9 text-[#080809] stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
              Ghost AI
            </h2>
            <p className="text-sm text-[#A0A0AB] mb-6">
              Collaborative System Design. Powered by AI.
            </p>

            <div className="w-full space-y-2 mb-6 text-left">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#14141A] border border-[#23232C] text-xs text-[#D1D1DB]">
                <Check className="h-4 w-4 text-[#62C073] shrink-0" />
                <span>Real-Time Liveblocks & React Flow Canvas</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#14141A] border border-[#23232C] text-xs text-[#D1D1DB]">
                <Check className="h-4 w-4 text-[#62C073] shrink-0" />
                <span>Instant 1-Click System Templates</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#14141A] border border-[#23232C] text-xs text-[#D1D1DB]">
                <Check className="h-4 w-4 text-[#62C073] shrink-0" />
                <span>Autonomous AI Topology Generation</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#14141A] border border-[#23232C] text-xs text-[#D1D1DB]">
                <Check className="h-4 w-4 text-[#62C073] shrink-0" />
                <span>Automated PRD & Spec Synthesis</span>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-[#121A16] border border-[#62C073]/30 text-xs font-mono text-[#62C073] mb-4">
              https://ghost-ai-v1.vercel.app
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
