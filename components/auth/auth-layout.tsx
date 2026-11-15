import * as React from "react";

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex bg-base text-copy-primary">
      {/* Left panel: visible on large screens */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-4/12 flex-col justify-between p-12 bg-surface border-r border-border-subtle select-none">
        <div>
          {/* Logo and Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-subtle border border-border-subtle flex items-center justify-center text-brand font-bold text-sm">
              G
            </div>
            <span className="font-semibold text-lg text-copy-primary tracking-tight">
              Ghost AI
            </span>
          </div>
          <p className="text-sm text-copy-muted mt-2">
            Real-time collaborative system design workspace
          </p>

          {/* Short text-only feature list */}
          <div className="mt-14 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-copy-primary">
                Collaborative Canvas
              </h3>
              <p className="text-xs text-copy-muted leading-relaxed">
                Design system architectures in real time with shared presence, live cursors, and structured graph nodes.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-copy-primary">
                AI Architecture Generation
              </h3>
              <p className="text-xs text-copy-muted leading-relaxed">
                Describe infrastructure in plain language to generate interactive architecture diagrams instantly.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-copy-primary">
                Technical Spec Export
              </h3>
              <p className="text-xs text-copy-muted leading-relaxed">
                Convert live canvas graphs into persistent Markdown specifications with a single click.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-copy-primary">
                Curated Starter Templates
              </h3>
              <p className="text-xs text-copy-muted leading-relaxed">
                Import standard architectural patterns including event-driven, microservices, and serverless models.
              </p>
            </div>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-xs text-copy-faint">
          &copy; 2026 Ghost AI. All rights reserved.
        </p>
      </div>

      {/* Right panel: centered Clerk form (full-screen on small screens) */}
      <div className="flex-1 flex items-center justify-center p-6 bg-base">
        {children}
      </div>
    </div>
  );
}
