"use client";

import * as React from "react";
import { ClientSideSuspense, useErrorListener } from "@liveblocks/react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseCanvas } from "@/components/canvas/base-canvas";
import type { SaveStatus } from "@/hooks/useCanvasAutosave";
import type { CanvasTemplate } from "@/components/editor/starter-templates";

export interface CanvasRoomProps {
  roomId?: string;
  projectId?: string;
  templateToImport?: CanvasTemplate | null;
  onTemplateImported?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
  manualSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

function CanvasLoading() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-base select-none">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-accent-primary" />
        <p className="text-xs text-copy-muted font-medium">
          Connecting to collaborative workspace...
        </p>
      </div>
    </div>
  );
}

function CanvasErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage =
    error instanceof Error ? error.message : String(error || "Unknown error");

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-base text-copy-primary p-6 text-center select-none">
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface p-6 shadow-2xl flex flex-col items-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-state-error/10 text-state-error border border-state-error/20">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-copy-primary">
          Canvas Connection Issue
        </h3>
        <p className="mt-1.5 text-xs text-copy-muted leading-relaxed">
          {errorMessage ||
            "Failed to establish realtime connection to the collaborative room."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={resetErrorBoundary}
          className="mt-4 gap-2 text-xs cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Retry Connection</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Client-side canvas wrapper that establishes the Liveblocks room and auth connection.
 * Provides error boundaries for connection failures and ClientSideSuspense for loading states.
 */
export function CanvasRoom({
  roomId,
  projectId,
  templateToImport,
  onTemplateImported,
  onSaveStatusChange,
  manualSaveRef,
}: CanvasRoomProps) {
  const resolvedProjectId = projectId || roomId;
  const [retryKey, setRetryKey] = React.useState(0);
  const [roomError, setRoomError] = React.useState<Error | null>(null);

  useErrorListener((error) => {
    setRoomError(error instanceof Error ? error : new Error(String(error)));
  });

  const handleRetry = React.useCallback(() => {
    setRoomError(null);
    setRetryKey((prev) => prev + 1);
  }, []);

  if (roomError) {
    return (
      <CanvasErrorFallback
        error={roomError}
        resetErrorBoundary={handleRetry}
      />
    );
  }

  return (
    <div key={retryKey} className="w-full h-full relative overflow-hidden bg-base">
      <ErrorBoundary FallbackComponent={CanvasErrorFallback} onReset={handleRetry}>
        <ClientSideSuspense fallback={<CanvasLoading />}>
          <BaseCanvas
            projectId={resolvedProjectId}
            templateToImport={templateToImport}
            onTemplateImported={onTemplateImported}
            onSaveStatusChange={onSaveStatusChange}
            manualSaveRef={manualSaveRef}
          />
        </ClientSideSuspense>
      </ErrorBoundary>
    </div>
  );
}
