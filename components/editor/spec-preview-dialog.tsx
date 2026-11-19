"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Loader2, AlertCircle, FileText } from "lucide-react";
import type { ProjectSpec } from "@prisma/client";

export interface SpecPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: ProjectSpec | null;
  projectId: string;
  onDownload?: (specId: string) => void;
}

/**
 * SpecPreviewDialog displays full rendered Markdown specification content.
 * Conforms to 29-spec-ui-integration.md:
 * - Fetches spec content via GET /api/projects/[projectId]/specs/[specId]/download (never accesses Blob directly).
 * - Renders content as Markdown with dark theme typography and table formatting.
 * - Includes Download action and keyboard Escape support.
 */
export function SpecPreviewDialog({
  open,
  onOpenChange,
  spec,
  projectId,
  onDownload,
}: SpecPreviewDialogProps) {
  const [content, setContent] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch content whenever the dialog opens with a valid spec
  React.useEffect(() => {
    if (!open || !spec) return;

    let isMounted = true;

    fetch(`/api/projects/${projectId}/specs/${spec.id}/download`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load specification (HTTP ${res.status})`);
        }
        return res.text();
      })
      .then((text) => {
        if (isMounted) {
          setContent(text);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load specification"
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, spec, projectId]);

  const handleClose = React.useCallback(() => {
    setContent(null);
    setError(null);
    setIsLoading(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        handleClose();
      } else {
        setIsLoading(true);
        onOpenChange(true);
      }
    },
    [handleClose, onOpenChange]
  );

  const handleDownload = () => {
    if (!spec) return;
    if (onDownload) {
      onDownload(spec.id);
    } else {
      const url = `/api/projects/${projectId}/specs/${spec.id}/download`;
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const formattedDate = spec?.createdAt
    ? new Date(spec.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  const filename = spec?.id
    ? `architecture-spec-${spec.id.slice(-6)}.md`
    : "specification.md";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col bg-surface text-copy-primary border border-border-subtle rounded-3xl p-6 shadow-2xl overflow-hidden">
        <DialogHeader className="gap-1 border-b border-border-subtle pb-4 shrink-0 text-left">
          <div className="flex items-center gap-2 text-brand">
            <FileText className="h-5 w-5 shrink-0" />
            <DialogTitle className="text-base font-semibold text-copy-primary truncate">
              {filename}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-copy-muted">
            Generated on {formattedDate || "recent"} • Markdown Document
          </DialogDescription>
        </DialogHeader>

        {/* Modal Scrollable Body with shadcn ScrollArea */}
        <ScrollArea className="flex-1 max-h-[62vh] py-2 px-2 text-xs leading-relaxed select-text">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-copy-muted">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
              <span>Loading technical specification...</span>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-state-error/10 border border-state-error/30 text-state-error text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && content && (
            <div className="markdown-spec space-y-4 text-copy-primary pr-3">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-copy-primary border-b border-border-subtle pb-2 mb-3">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-semibold text-brand mt-4 mb-2 pb-1 border-b border-surface-border">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xs font-semibold text-copy-primary mt-3 mb-1">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-xs text-copy-secondary leading-relaxed mb-2.5">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 mb-3 text-copy-secondary">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 mb-3 text-copy-secondary">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-xs text-copy-secondary">{children}</li>
                  ),
                  hr: () => <hr className="border-border-subtle my-4" />,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-subtle text-brand px-1.5 py-0.5 rounded text-[11px] font-mono border border-surface-border">
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-subtle/80 text-copy-primary p-3 rounded-xl overflow-x-auto text-[11px] font-mono border border-surface-border my-2">
                        <code>{children}</code>
                      </pre>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 border border-border-subtle rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-subtle border-b border-border-subtle text-copy-primary font-semibold">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="p-2.5 text-[11px] font-semibold text-copy-primary border-r border-border-subtle last:border-r-0">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="p-2.5 text-xs text-copy-secondary border-t border-r border-border-subtle last:border-r-0">
                      {children}
                    </td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-brand pl-3 italic text-copy-muted my-2">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </ScrollArea>

        {/* Modal Footer with Actions */}
        <DialogFooter className="mt-3 pt-3 border-t border-border-subtle sm:justify-between items-center gap-2 bg-transparent p-0 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-xs text-copy-muted hover:text-copy-primary"
          >
            Close
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading || Boolean(error)}
            className="bg-[#62C073] hover:bg-[#52af63] text-[#080809] text-xs gap-1.5 h-8 font-medium shadow-sm cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download (.md)</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
