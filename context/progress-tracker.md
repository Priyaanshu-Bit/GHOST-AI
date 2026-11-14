 # Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 7: Wire Editor Home (Completed)

## Current Goal

- Ready for `08-editor-workspace-shell.md`.

## Completed

- Next.js boilerplate cleanup.
- `01-design-system.md` — Design System & UI Primitive Components:
  - Installed and configured `shadcn/ui`.
  - Installed `lucide-react`, `clsx`, `tailwind-merge`.
  - Created `lib/utils.ts` with `cn()` utility.
  - Added shadcn UI primitives: `Button`, `Card`, `Dialog`, `Input`, `Tabs`, `Textarea`, `ScrollArea` (foundation files kept unmodified).
  - Configured dark-only design system tokens in `app/globals.css` matching `ui-context.md`.
  - Verified compilation and absence of default light styling.
- `02-editor-chrome.md` — Base Editor Chrome:
  - Created `components/editor/editor-navbar.tsx` with fixed-height top navbar, left/center/right sections, sidebar toggle button with `PanelLeftOpen`/`PanelLeftClose` icons, and subtle bottom border.
  - Created `components/editor/project-sidebar.tsx` floating above canvas without pushing content, sliding in from left, header with `Projects` title + close button, shadcn `Tabs` (My Projects & Shared) with empty placeholder states, and full-width `New Project` button with `Plus` icon.
  - Created `components/editor/editor-dialog.tsx` implementing dialog pattern with dark theme tokens, supporting title, description, and footer actions.
  - Verified clean TypeScript build and zero lint errors.
- `03-auth.md` — Authentication Setup:
  - Installed `@clerk/nextjs` and `@clerk/ui`.
  - Wrapped root layout with `ClerkProvider` using `dark` theme from `@clerk/ui/themes` and mapped CSS custom property variables.
  - Created minimalist two-panel responsive auth pages (`/sign-in` and `/sign-up`) with text-only feature list on large screens, form-only on small screens, and no hardcoded colors.
  - Created `proxy.ts` at the root using `clerkMiddleware` to protect all routes except public auth paths.
  - Updated `/` to redirect authenticated users to `/editor` and unauthenticated users to `/sign-in`.
  - Added Clerk's built-in `UserButton` to the right section of `EditorNavbar`.
  - Created `app/editor/layout.tsx` and `app/editor/page.tsx` home workspace structure.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors.
- `04-project-dialogs.md` — Project Dialogs & Editor Home:
  - Created `types/project.ts` with `Project` interface, `slugify` utility, and initial mock data for owned and shared projects.
  - Created `hooks/use-project-dialogs.tsx` managing dialog states (create, rename, delete), form states (name, live slug preview), and mock project list mutations.
  - Built `components/editor/create-project-dialog.tsx` with project name input and live slug preview.
  - Built `components/editor/rename-project-dialog.tsx` with auto-focusing pre-filled input, current project name in description, and Enter-to-submit.
  - Built `components/editor/delete-project-dialog.tsx` with destructive styling and confirmation message showing project name.
  - Updated `components/editor/project-sidebar.tsx` with owned project lists featuring rename and delete action buttons, shared project lists with actions hidden, empty state placeholders, and mobile backdrop scrim for tap-outside-to-close.
  - Updated `components/editor/editor-layout.tsx` to provide `ProjectDialogsProvider` and mount project dialogs.
  - Updated `app/editor/page.tsx` with minimal centered layout (heading, description, and `New Project` button opening Create dialog).
  - Verified `npm run build` and `npm run lint` pass with 0 errors and 0 warnings.
- `05-prisma.md` — Prisma Schema & Data Layer:
  - Installed and configured `prisma@^6.19.3`, `@prisma/client@^6.19.3`, `@prisma/adapter-pg@^6.19.3`, `pg`, `@types/pg`, and `dotenv`.
  - Configured `prisma.config.ts` with `defineConfig` pointing to `prisma` schema directory.
  - Created root `prisma/schema.prisma` with PostgreSQL datasource and Prisma client generator.
  - Created `prisma/models/project.prisma` declaring `Project` model with Clerk owner ID, name, optional description, status enum (`DRAFT`, `ARCHIVED`), `canvasJsonPath`, timestamps, and indexes on owner ID and creation date.
  - Declared `ProjectCollaborator` model with project cascade delete, collaborator email, timestamp, unique constraint on `(projectId, email)`, and indexes on `email` and `(projectId, createdAt)`.
  - Created `lib/prisma.ts` as a cached singleton branching by `DATABASE_URL` (`prisma+postgres://` for Accelerate, `@prisma/adapter-pg` with `pg.Pool` otherwise, cached on `globalThis` in development). The direct adapter uses the URL's `schema` parameter, defaulting to `public`.
  - Successfully ran initial migration (`20261114105145_init`) against the PostgreSQL database and generated Prisma Client.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.
- `06-project-apis.md` — Project API Routes:
  - Created `lib/projects.ts` module with data helpers for `getProjectsForUser`, `createProject`, `getProjectById`, `renameProject`, and `deleteProject`.
  - Built `GET /api/projects` endpoint returning user's owned and shared projects (401 when unauthenticated).
  - Built `POST /api/projects` endpoint creating a project with owner set to Clerk user ID, defaulting missing name to `Untitled Project`, and preserving schema's ID strategy (401 when unauthenticated).
  - Built `PATCH /api/projects/[projectId]` endpoint to rename projects with owner-only access control (401 unauthenticated, 404 not found, 403 non-owner).
  - Built `DELETE /api/projects/[projectId]` endpoint with owner-only access control and cascade deletion (401 unauthenticated, 404 not found, 403 non-owner).
  - Updated `proxy.ts` middleware so API routes return standard 401 JSON responses rather than browser redirects.
  - Hardened project APIs with JSON object validation, duplicate client-ID conflict responses, verified-email sharing, and owner-scoped mutation predicates.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors.
- `07-wire-editor-home.md` — Wire Editor Home Sidebar & Dialogs:
  - Converted `app/editor/page.tsx` into an async Server Component that fetches owned and shared projects via `getProjectsForUser(userId, userEmail)` without client-side fetching for initial load.
  - Created `components/editor/editor-home-view.tsx` client boundary component passing real server data into `EditorLayout` and `ProjectSidebar`.
  - Built `hooks/use-project-actions.tsx` managing dialog states, name inputs, unique suffix generation, live room ID previews (`${slug}-${suffix}`), and real API mutations.
  - Wired create flow (`POST /api/projects`) aligning project ID with Liveblocks room ID and navigating to `/editor/[projectId]` on success.
  - Wired rename flow (`PATCH /api/projects/[id]`) pre-filling target name, auto-focusing input, and calling `router.refresh()` on success.
  - Wired delete flow (`DELETE /api/projects/[id]`) showing project name, redirecting to `/editor` if active workspace, and calling `router.refresh()` on success.
  - Updated `components/editor/project-sidebar.tsx` to render real database project lists with navigation links and owned mutation controls.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors.

## In Progress

- None.

## Next Up

- `08-editor-workspace-shell.md` — Editor Workspace Shell

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- Add context needed to resume work in the next session.
