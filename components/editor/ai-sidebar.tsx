"use client";

import * as React from "react";
import {
  Bot,
  X,
  Send,
  FileText,
  FileCode2,
  Download,
  Sparkles,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  useFeedMessages,
  useCreateFeedMessage,
  useCreateFeed,
  useEventListener,
  useOthers,
} from "@liveblocks/react";
import { useUser } from "@clerk/nextjs";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  validateTaskFeedMessage,
  validateChatFeedMessage,
  type TaskFeedMessage,
  type ChatFeedMessage,
} from "@/types/tasks";
import type { ProjectSpec } from "@prisma/client";
import { SpecPreviewDialog } from "@/components/editor/spec-preview-dialog";
import { cn } from "@/lib/utils";

export interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  roomId?: string;
  className?: string;
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

/**
 * Collaborative AI Workspace chat sidebar conforming to:
 * - 20-ai-sidebar-shell.md (shell layout, tabs, specs)
 * - 24-ai-presence-state.md (presence, live status updates)
 * - 25-sidebar-chat-feed.md (collaborative ai-chat feed & validation)
 * - 26-ai-chat-functional.md (Trigger.dev integration & run tracking)
 */
export function AiSidebar({
  isOpen,
  onClose,
  projectId,
  roomId,
  className,
}: AiSidebarProps) {
  const { user } = useUser();
  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Collaborator";

  const resolvedRoomId = roomId || projectId;

  // 1. Subscribe to Liveblocks feeds
  // - ai-chat: collaborative user-agent chat history
  // - ai-status-feed: step-by-step agent progress updates
  const chatFeed = useFeedMessages("ai-chat");
  const statusFeed = useFeedMessages("ai-status-feed");
  const createFeedMessage = useCreateFeedMessage();
  const createFeed = useCreateFeed();

  // Proactively ensure room feeds exist if accessed before server provisioning
  React.useEffect(() => {
    try {
      createFeed("ai-chat").catch(() => {});
      createFeed("ai-status-feed").catch(() => {});
    } catch {
      // ignore
    }
  }, [createFeed]);

  // 2. Real-time sub-millisecond room event listening
  const [realtimeStatus, setRealtimeStatus] =
    React.useState<TaskFeedMessage | null>(null);

  useEventListener(({ event }) => {
    if (event.type === "ai-status") {
      const validated = validateTaskFeedMessage(event);
      if (validated) {
        setRealtimeStatus(validated);
      }
    }
  });

  // 3. Monitor live peer presence for thinking state
  const isAnyOtherThinking = useOthers((others) =>
    others.some((u) => Boolean(u.presence?.thinking || u.presence?.isThinking))
  );

  // 4. Resolve latest status message
  const latestFeedMessage = React.useMemo(() => {
    if (!statusFeed.messages || statusFeed.messages.length === 0) return null;
    for (let i = statusFeed.messages.length - 1; i >= 0; i--) {
      const item = statusFeed.messages[i];
      if (item && item.data) {
        const validated = validateTaskFeedMessage(item.data);
        if (validated) return validated;
      }
    }
    return null;
  }, [statusFeed.messages]);

  const currentStatus = React.useMemo(() => {
    if (!realtimeStatus && !latestFeedMessage) return null;
    if (!realtimeStatus) return latestFeedMessage;
    if (!latestFeedMessage) return realtimeStatus;
    const timeR = realtimeStatus.timestamp || 0;
    const timeF = latestFeedMessage.timestamp || 0;
    return timeR >= timeF ? realtimeStatus : latestFeedMessage;
  }, [realtimeStatus, latestFeedMessage]);

  // 5. Trigger.dev Active Run State
  const [activeRunId, setActiveRunId] = React.useState<string | null>(null);
  const [publicToken, setPublicToken] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  // Optimistic local messages state for instant feedback
  const [optimisticMessages, setOptimisticMessages] = React.useState<
    ChatFeedMessage[]
  >([]);

  // 6. Handle Trigger.dev Run Completion / Error Callback
  const handleRunComplete = React.useCallback(
    (
      completedRun: { status: string; output?: unknown },
      err?: Error
    ) => {
      if (completedRun.status === "COMPLETED") {
        const summary =
          (completedRun.output as { summary?: string })?.summary ||
          currentStatus?.text ||
          "System architecture successfully generated on canvas.";

        const now = Date.now();
        const assistantMsg: ChatFeedMessage = {
          id: `ai-${now}`,
          sender: "Ghost AI",
          role: "assistant",
          content: summary,
          timestamp: now,
        };

        try {
          createFeedMessage("ai-chat", assistantMsg);
        } catch (feedErr) {
          console.warn("Could not post completion to ai-chat feed:", feedErr);
        }

        setOptimisticMessages((prev) => [...prev, assistantMsg]);
      } else if (
        completedRun.status === "FAILED" ||
        completedRun.status === "CRASHED" ||
        completedRun.status === "SYSTEM_FAILURE" ||
        err
      ) {
        const errorText =
          (completedRun.output as { error?: string })?.error ||
          err?.message ||
          "Design agent task encountered an unexpected error.";

        const now = Date.now();
        const errorMsg: ChatFeedMessage = {
          id: `err-${now}`,
          sender: "Ghost AI",
          role: "assistant",
          content: `Error: ${errorText}`,
          timestamp: now,
        };

        try {
          createFeedMessage("ai-chat", errorMsg);
        } catch {
          // ignore
        }

        setOptimisticMessages((prev) => [...prev, errorMsg]);
        setSendError(errorText);
      }

      setActiveRunId(null);
      setPublicToken(null);
    },
    [currentStatus?.text, createFeedMessage]
  );

  // Subscribe to Trigger.dev run status using public accessToken
  const { run } = useRealtimeRun(activeRunId || undefined, {
    accessToken: publicToken || undefined,
    enabled: Boolean(activeRunId && publicToken),
    onComplete: handleRunComplete,
  });

  // Check whether the background run is actively in-flight
  const isRunActive = Boolean(
    activeRunId &&
      run &&
      (run.status === "QUEUED" ||
        run.status === "DEQUEUED" ||
        run.status === "EXECUTING" ||
        run.status === "WAITING" ||
        run.status === "PENDING_VERSION" ||
        run.status === "DELAYED")
  );

  const isAiWorking =
    isSubmitting ||
    isRunActive ||
    isAnyOtherThinking ||
    currentStatus?.status === "start" ||
    currentStatus?.status === "processing";

  // 7. Parse and Validate collaborative chat messages
  const validatedFeedMessages = React.useMemo(() => {
    if (chatFeed.error || !chatFeed.messages || chatFeed.messages.length === 0)
      return [];
    const list: ChatFeedMessage[] = [];
    for (const item of chatFeed.messages) {
      if (item && item.data) {
        const validated = validateChatFeedMessage(item.data);
        if (validated) {
          list.push({
            ...validated,
            id: item.id || validated.id,
            timestamp: validated.timestamp || item.createdAt || 0,
          });
        }
      }
    }
    return list;
  }, [chatFeed.messages, chatFeed.error]);

  // Combined messages list: feed messages + local pending optimistic messages
  const allMessages = React.useMemo(() => {
    if (validatedFeedMessages.length === 0) {
      return optimisticMessages;
    }
    const combined = [...validatedFeedMessages];
    for (const opt of optimisticMessages) {
      const exists = combined.some(
        (m) =>
          (opt.id && m.id === opt.id) ||
          (m.content === opt.content &&
            Math.abs((m.timestamp || 0) - (opt.timestamp || 0)) < 4000)
      );
      if (!exists) {
        combined.push(opt);
      }
    }
    return combined.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [validatedFeedMessages, optimisticMessages]);

  const [input, setInput] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, isAiWorking]);

  // 8. Submit Handler: Push to ai-chat feed and dispatch Trigger.dev task
  const handleSendMessage = React.useCallback(
    async (textToSend?: string) => {
      if (isAiWorking || isSubmitting) return;

      const text = (textToSend !== undefined ? textToSend : input).trim();
      if (!text) return;

      if (!resolvedRoomId) {
        setSendError("Room context is missing. Please refresh the editor.");
        return;
      }

      setSendError(null);
      setIsSubmitting(true);
      setInput("");

      const timestamp = Date.now();
      const userMessage: ChatFeedMessage = {
        id: `user-${timestamp}`,
        sender: displayName,
        role: "user",
        content: text,
        timestamp,
      };

      // 1. Optimistically display user message
      setOptimisticMessages((prev) => [...prev, userMessage]);

      // 2. Broadcast message to collaborative Liveblocks ai-chat feed
      try {
        await createFeedMessage("ai-chat", {
          sender: displayName,
          role: "user",
          content: text,
          timestamp,
        });
      } catch (feedErr) {
        console.warn("Note: Liveblocks chat feed dispatch:", feedErr);
      }

      // 3. Call POST /api/ai/design to trigger background task
      try {
        const response = await fetch("/api/ai/design", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: text,
            roomId: resolvedRoomId,
            projectId: projectId || resolvedRoomId,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `Design request failed with HTTP ${response.status}`
          );
        }

        const data = await response.json();

        if (data.runId) {
          setActiveRunId(data.runId);
        }
        if (data.publicToken) {
          setPublicToken(data.publicToken);
        }
      } catch (err) {
        console.error("Failed to trigger design agent:", err);
        const errMsg =
          err instanceof Error
            ? err.message
            : "Failed to connect to AI design agent";
        setSendError(errMsg);

        // Show error message in chat feed as per 26-ai-chat-functional.md
        const assistantError: ChatFeedMessage = {
          id: `err-${Date.now()}`,
          sender: "Ghost AI",
          role: "assistant",
          content: `Error: ${errMsg}`,
          timestamp: Date.now(),
        };

        setOptimisticMessages((prev) => [...prev, assistantError]);
        try {
          await createFeedMessage("ai-chat", assistantError);
        } catch {
          // ignore
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isAiWorking,
      isSubmitting,
      input,
      resolvedRoomId,
      projectId,
      displayName,
      createFeedMessage,
    ]
  );

  // 9. Spec Generation State & Tracking (27-spec-generation-flow & 29-spec-ui-integration)
  const [specs, setSpecs] = React.useState<ProjectSpec[]>([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = React.useState(false);
  const [isGeneratingSpec, setIsGeneratingSpec] = React.useState(false);
  const [specRunId, setSpecRunId] = React.useState<string | null>(null);
  const [specPublicToken, setSpecPublicToken] = React.useState<string | null>(null);
  const [specError, setSpecError] = React.useState<string | null>(null);

  // Preview Dialog State
  const [selectedSpec, setSelectedSpec] = React.useState<ProjectSpec | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // Fetch all specs for current project
  const fetchSpecs = React.useCallback(async () => {
    const targetId = projectId || resolvedRoomId;
    if (!targetId) return;

    setIsLoadingSpecs(true);
    try {
      const res = await fetch(`/api/projects/${targetId}/specs`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.specs)) {
          setSpecs(data.specs);
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve specs list:", err);
    } finally {
      setIsLoadingSpecs(false);
    }
  }, [projectId, resolvedRoomId]);

  // Load specs on mount and when project context changes
  React.useEffect(() => {
    let ignore = false;
    const targetId = projectId || resolvedRoomId;
    if (!targetId) return;

    fetch(`/api/projects/${targetId}/specs`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data && Array.isArray(data.specs)) {
          setSpecs(data.specs);
        }
      })
      .catch((err) => {
        console.warn("Failed to retrieve specs list:", err);
      });

    return () => {
      ignore = true;
    };
  }, [projectId, resolvedRoomId]);

  // Handle Trigger.dev Spec Run completion
  const handleSpecRunComplete = React.useCallback(
    (
      completedRun: { status: string; output?: unknown },
      err?: Error
    ) => {
      setIsGeneratingSpec(false);
      setSpecRunId(null);
      setSpecPublicToken(null);

      if (completedRun.status === "COMPLETED") {
        setSpecError(null);
        fetchSpecs();
      } else if (
        completedRun.status === "FAILED" ||
        completedRun.status === "CRASHED" ||
        completedRun.status === "SYSTEM_FAILURE" ||
        err
      ) {
        const errorText =
          (completedRun.output as { error?: string })?.error ||
          err?.message ||
          "Spec generation task encountered an error.";
        setSpecError(errorText);
      }
    },
    [fetchSpecs]
  );

  // Track Spec Run in real-time
  useRealtimeRun(specRunId || undefined, {
    accessToken: specPublicToken || undefined,
    enabled: Boolean(specRunId && specPublicToken),
    onComplete: handleSpecRunComplete,
  });

  // Polling fallback to detect newly saved specs while generation is in flight
  React.useEffect(() => {
    if (!isGeneratingSpec) return;
    const interval = setInterval(async () => {
      const targetId = projectId || resolvedRoomId;
      if (!targetId) return;
      try {
        const res = await fetch(`/api/projects/${targetId}/specs`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.specs) && data.specs.length > specs.length) {
            setSpecs(data.specs);
            setIsGeneratingSpec(false);
            setSpecRunId(null);
            setSpecPublicToken(null);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isGeneratingSpec, projectId, resolvedRoomId, specs.length]);

  // Trigger Spec Generation Action
  const handleGenerateSpec = React.useCallback(async () => {
    if (isGeneratingSpec) return;

    const targetRoomId = resolvedRoomId;
    if (!targetRoomId) {
      setSpecError("Project room context is missing. Please refresh the editor.");
      return;
    }

    setIsGeneratingSpec(true);
    setSpecError(null);

    // Retrieve live canvas state synchronously via CustomEvent
    let canvasData: { nodes: unknown[]; edges: unknown[] } = {
      nodes: [],
      edges: [],
    };
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ghost-ai:get-canvas-state", {
          detail: {
            callback: (data: { nodes: unknown[]; edges: unknown[] }) => {
              if (data) {
                canvasData = data;
              }
            },
          },
        })
      );
    }

    // Format chat history payload from validated chat feed
    const chatPayload = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
      sender: m.sender,
      timestamp: m.timestamp,
    }));

    try {
      const response = await fetch("/api/ai/spec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: targetRoomId,
          chatHistory: chatPayload,
          nodes: canvasData.nodes || [],
          edges: canvasData.edges || [],
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Spec request failed with HTTP ${response.status}`
        );
      }

      const data = await response.json();
      if (data.runId) {
        setSpecRunId(data.runId);
      }
      if (data.publicToken) {
        setSpecPublicToken(data.publicToken);
      }
    } catch (err) {
      console.error("Failed to trigger spec generation:", err);
      setSpecError(
        err instanceof Error ? err.message : "Failed to initiate spec generation"
      );
      setIsGeneratingSpec(false);
    }
  }, [isGeneratingSpec, resolvedRoomId, allMessages]);

  // Download Spec handler calling secure download endpoint
  const handleDownloadSpec = React.useCallback(
    (specId: string) => {
      const targetId = projectId || resolvedRoomId;
      if (!targetId) return;
      const url = `/api/projects/${targetId}/specs/${specId}/download`;
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [projectId, resolvedRoomId]
  );

  // Preview Spec handler opening modal dialog
  const handlePreviewSpec = React.useCallback((spec: ProjectSpec) => {
    setSelectedSpec(spec);
    setIsPreviewOpen(true);
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      className={cn(
        "w-80 md:w-96 bg-surface border-l border-surface-border flex flex-col shrink-0 select-none z-20 animate-in slide-in-from-right-2 duration-200 shadow-2xl h-full overflow-hidden",
        className
      )}
      aria-label="AI Workspace"
    >
      {/* 1. Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0 bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent-ai/10 border border-accent-ai/20 text-accent-ai shrink-0">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-copy-primary leading-tight">
              AI Workspace
            </h3>
            <p className="text-[11px] text-copy-muted leading-tight mt-0.5">
              Collaborate with Ghost AI
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI panel"
          title="Close AI panel"
          className="text-copy-muted hover:text-copy-primary hover:bg-subtle"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 2. Tabs: AI Architect & Specs */}
      <Tabs defaultValue="architect" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-3 pb-2 border-b border-surface-border shrink-0 bg-surface">
          <TabsList className="w-full grid grid-cols-2 bg-subtle p-1 rounded-xl h-9">
            <TabsTrigger
              value="architect"
              className="text-xs font-medium text-copy-muted data-active:bg-elevated data-active:text-accent-ai-text data-active:shadow-sm rounded-lg py-1 transition-all"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="text-xs font-medium text-copy-muted data-active:bg-elevated data-active:text-accent-ai-text data-active:shadow-sm rounded-lg py-1 transition-all"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: AI Architect */}
        <TabsContent
          value="architect"
          className="flex-1 flex flex-col min-h-0 m-0 outline-none"
        >
          {/* Scrollable Chat Message Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 bg-base/50">
            {allMessages.length === 0 ? (
              /* Empty state with bot icon, description, and starter prompt chips */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 my-auto select-none">
                <div className="w-12 h-12 rounded-2xl bg-subtle border border-surface-border flex items-center justify-center mb-3 text-[#62C073] shadow-md">
                  <Bot className="h-6 w-6 opacity-90" />
                </div>
                <h4 className="text-sm font-semibold text-copy-primary">
                  Ghost AI Architect
                </h4>
                <p className="text-xs text-copy-muted mt-1 max-w-[240px] leading-relaxed">
                  Ask Ghost AI to design architectures, critique existing nodes,
                  or recommend microservices.
                </p>

                {/* Starter Prompt Chips */}
                <div className="flex flex-col gap-2 w-full mt-6">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isAiWorking}
                      className={cn(
                        "text-left text-xs px-3.5 py-2.5 rounded-xl bg-subtle hover:bg-elevated border border-surface-border text-copy-primary hover:text-white transition-all active:scale-[0.98] cursor-pointer shadow-xs",
                        isAiWorking && "opacity-50 cursor-not-allowed pointer-events-none"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#62C073]" />
                        <span>{prompt}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Collaborative Messages thread */
              allMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const timeString = msg.timestamp
                  ? new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <div
                    key={msg.id || `msg-${idx}`}
                    className={cn(
                      "flex flex-col max-w-[85%] text-xs leading-relaxed animate-in fade-in duration-150",
                      isUser ? "self-end items-end" : "self-start items-start"
                    )}
                  >
                    {/* Sender and timestamp header */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-copy-muted">
                      <span className="font-medium">
                        {isUser ? msg.sender || "You" : "Ghost AI"}
                      </span>
                      {timeString && <span>• {timeString}</span>}
                    </div>

                    {/* Chat Bubble conforming to 26-ai-chat-functional.md */}
                    <div
                      className={cn(
                        "px-3.5 py-2.5 rounded-2xl shadow-sm break-words whitespace-pre-wrap select-text",
                        isUser
                          ? "bg-[#62C073] text-[#080809] font-medium rounded-tr-xs"
                          : "bg-elevated border border-surface-border text-copy-primary rounded-tl-xs"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-3 border-t border-surface-border bg-surface shrink-0 flex flex-col gap-2">
            {/* 4. Compact Status Strip above input - Only when a run is active (26-ai-chat-functional.md) */}
            {isAiWorking && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base border border-[#62C073]/30 text-xs text-copy-primary animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#62C073] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#62C073]"></span>
                </div>
                <span className="font-medium text-[#62C073] text-[11px] truncate">
                  {currentStatus?.text ||
                    (isSubmitting
                      ? "Dispatching architecture task..."
                      : "Ghost AI is generating architecture...")}
                </span>
              </div>
            )}

            {/* Error notice if send fails */}
            {sendError && !isAiWorking && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-state-error/10 border border-state-error/30 text-xs text-state-error animate-in fade-in duration-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-[11px]">{sendError}</span>
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAiWorking}
              placeholder={
                isAiWorking
                  ? "Ghost AI is designing architecture..."
                  : "Ask Ghost AI to design or modify..."
              }
              rows={2}
              className={cn(
                "min-h-[72px] max-h-[160px] bg-subtle/80 border-surface-border rounded-xl text-xs placeholder:text-copy-muted resize-none focus-visible:ring-1 focus-visible:ring-[#62C073] text-copy-primary p-2.5 leading-relaxed",
                isAiWorking &&
                  "opacity-50 cursor-not-allowed select-none bg-subtle/40"
              )}
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-copy-faint select-none">
                {isAiWorking
                  ? "Input disabled during active generation"
                  : "Enter to send, Shift+Enter for newline"}
              </span>

              {/* Submit button conforming to 26-ai-chat-functional.md */}
              <Button
                type="button"
                size="sm"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isAiWorking}
                className={cn(
                  "text-xs px-3.5 py-1.5 h-7 gap-1.5 rounded-lg font-medium transition-all select-none",
                  !input.trim() || isAiWorking
                    ? "bg-[#62C073]/40 text-[#080809]/50 cursor-not-allowed"
                    : "bg-[#62C073] hover:bg-[#52af63] text-[#080809] cursor-pointer shadow-sm active:scale-95"
                )}
              >
                {isAiWorking ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-[#080809]" />
                    <span>Working...</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Specs (29-spec-ui-integration.md) */}
        <TabsContent
          value="specs"
          className="flex-1 flex flex-col min-h-0 m-0 p-4 gap-4 overflow-y-auto outline-none bg-base/50"
        >
          {/* Generate Spec Action Button */}
          <Button
            type="button"
            onClick={handleGenerateSpec}
            disabled={isGeneratingSpec}
            className={cn(
              "w-full text-[#080809] text-xs gap-2 h-9 rounded-xl font-medium shadow-md transition-all shrink-0 select-none",
              isGeneratingSpec
                ? "bg-[#62C073]/50 cursor-wait opacity-80"
                : "bg-[#62C073] hover:bg-[#52af63] cursor-pointer active:scale-98"
            )}
          >
            {isGeneratingSpec ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#080809]" />
                <span>Generating Architecture Spec...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Generate Spec</span>
              </>
            )}
          </Button>

          {/* Active Generation Notice */}
          {isGeneratingSpec && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-base border border-[#62C073]/30 text-xs text-copy-primary animate-in fade-in duration-200">
              <div className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#62C073] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#62C073]"></span>
              </div>
              <span className="text-[11px] text-[#62C073] font-medium leading-relaxed">
                Synthesizing architecture specifications from canvas topology and requirements...
              </span>
            </div>
          )}

          {/* Spec Generation Error Notice */}
          {specError && !isGeneratingSpec && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-state-error/10 border border-state-error/30 text-state-error text-xs animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="truncate text-[11px]">{specError}</span>
            </div>
          )}

          {/* Specifications List Header */}
          <div className="flex items-center justify-between text-xs text-copy-muted px-0.5">
            <span className="font-medium text-copy-primary">
              Specifications ({specs.length})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={fetchSpecs}
              disabled={isLoadingSpecs}
              title="Refresh specifications list"
              className="h-6 w-6 text-copy-muted hover:text-copy-primary"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isLoadingSpecs && "animate-spin")}
              />
            </Button>
          </div>

          {/* Specifications List or Empty State */}
          {isLoadingSpecs && specs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-copy-muted">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <span className="text-xs">Loading specifications...</span>
            </div>
          ) : specs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-border-subtle bg-surface/30 gap-2.5">
              <div className="p-3 rounded-2xl bg-subtle text-copy-muted">
                <FileCode2 className="h-6 w-6 opacity-60" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-copy-primary">
                  No specifications generated yet
                </h4>
                <p className="text-[11px] text-copy-muted leading-relaxed max-w-[220px]">
                  Click &ldquo;Generate Spec&rdquo; above to synthesize a complete technical architecture specification from your canvas and chat.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-4">
              {specs.map((spec, index) => {
                const formattedDate = new Date(spec.createdAt).toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );
                const specIndex = specs.length - index;
                const rawFilename =
                  spec.filePath?.split("/").pop() ||
                  `spec-${spec.id.slice(-6)}.md`;

                return (
                  <div
                    key={spec.id}
                    className="bg-elevated border border-surface-border hover:border-brand/40 rounded-2xl p-3.5 flex flex-col gap-3 shadow-md transition-all group"
                  >
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => handlePreviewSpec(spec)}
                    >
                      <div className="p-2 rounded-xl bg-accent-dim border border-brand/20 text-brand shrink-0 group-hover:bg-brand/20 transition-colors">
                        <FileCode2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-copy-primary truncate group-hover:text-brand transition-colors">
                          {rawFilename}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-copy-muted mt-0.5">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>v{specIndex}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewSpec(spec)}
                        className="h-7 text-[11px] text-copy-secondary hover:text-copy-primary gap-1 px-2.5 rounded-lg cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Preview</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSpec(spec.id)}
                        className="h-7 text-[11px] text-copy-primary border-surface-border bg-surface/60 hover:bg-subtle gap-1 px-2.5 rounded-lg cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Spec Preview Modal Dialog */}
      <SpecPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        spec={selectedSpec}
        projectId={projectId || resolvedRoomId || ""}
        onDownload={handleDownloadSpec}
      />
    </aside>
  );
}
