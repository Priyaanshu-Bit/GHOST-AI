"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface EditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footerActions?: React.ReactNode;
  className?: string;
}

/**
 * Base dialog pattern component conforming to Ghost AI dark theme standards.
 * Supports title, description, body content, and footer actions.
 */
export function EditorDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footerActions,
  className,
}: EditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
         "sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-surface text-copy-primary border border-border-subtle rounded-3xl p-6 shadow-2xl",
          className
        )}
      >
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-base font-semibold text-copy-primary">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-copy-muted">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children && <div className="py-2">{children}</div>}

        {footerActions && (
          <DialogFooter className="mt-4 pt-3 border-t border-border-subtle sm:justify-end gap-2 bg-transparent p-0">
            {footerActions}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

