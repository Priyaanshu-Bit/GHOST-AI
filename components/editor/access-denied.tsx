import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AccessDeniedProps {
  message?: string;
}

/**
 * AccessDenied view shown when an unauthorized or non-existent project is accessed.
 * Features a centered card with a lock icon, descriptive copy, and a link back to /editor.
 */
export function AccessDenied({
  message = "You don't have access to this project, or it may have been deleted.",
}: AccessDeniedProps) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-base px-4 text-center select-none">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-8 shadow-2xl flex flex-col items-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-accent-primary border border-border-subtle">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-copy-primary">
          Access Denied
        </h1>
        <p className="mt-2 text-sm text-copy-muted leading-relaxed">
          {message}
        </p>
        <div className="mt-6 w-full">
          <Link
            href="/editor"
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full flex items-center justify-center gap-2"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Projects</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

