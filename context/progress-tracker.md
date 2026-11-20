 # Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Automated 1080p Video Showcase & Public Showcase Route (Completed)

## Current Goal

- Provide real feature video recording and interactive showcase demonstration for portfolio, LinkedIn, and social sharing.

## In Progress

- None.

## Next Up

- Social sharing and LinkedIn post publishing.

## Completed

- **Automated 1080p Feature Video Showcase & Public Showcase Route**:
  - Implemented interactive showcase route at `/showcase` displaying the complete Ghost AI workspace with dark theme (#080809), Liveblocks presence simulation, React Flow canvas, Starter Templates modal, AI Architect drawer, and PRD spec synthesis.
  - Added public matcher in `proxy.ts` to allow direct access without Clerk sign-in hurdles.
  - Automated video recording via Playwright and system Chrome at native 1080p (1920x1080) 60fps.
  - Encoded into pristine universal MP4 with FFmpeg (`videos/ghost-ai-feature-showcase.mp4`, 1.49 MB, H.264/yuv420p) with `+faststart` metadata for instant web and social media playback.
  - Created standalone script `scripts/record-showcase.js` for reproducible automated recordings.
  - Persisted master MP4 to both `videos/` and the conversation artifacts directory.

- **Autonomous Direct Serverless AI Execution**:
  - Extracted core design agent logic into `lib/ai/design-service.ts` and spec synthesis into `lib/ai/spec-service.ts`.
  - Updated `/api/ai/design` and `/api/ai/spec` route handlers to run directly on Vercel Serverless (`maxDuration = 60`), mutating Liveblocks canvas and persisting Markdown specs in ~2-3 seconds with zero queue delay.
  - Updated `components/editor/ai-sidebar.tsx` to handle direct synchronous responses immediately, rendering AI assistant messages and updating spec lists without waiting on cloud queue workers.
  - Maintained full Trigger.dev compatibility in `trigger/design-agent.ts` and `trigger/generate-spec.ts` by delegating to the unified AI services.
  - Sanitized `BLOB_READ_WRITE_TOKEN` in `lib/specs.ts` to prevent token quote formatting issues.

- **Trigger.dev Vercel Branch Compatibility**:
  - Identified root cause of `Error [TriggerApiError]: No matching branch env (HTTP 401)`: Vercel automatically sets `VERCEL_GIT_COMMIT_REF="main"`, causing `@trigger.dev/sdk` to inject `x-trigger-branch: main`, which fails when Trigger.dev has no matching preview branch environment.
  - Created centralized `lib/trigger.ts` configured with `previewBranch: process.env.TRIGGER_PREVIEW_BRANCH || ""` to prevent unwanted preview branch header injection on production/standard deployments.
  - Sanitized `TRIGGER_SECRET_KEY` and `BLOB_READ_WRITE_TOKEN` to strip accidental quotes and whitespace.
  - Updated all 4 task dispatch and token routes (`/api/ai/design`, `/api/ai/design/token`, `/api/ai/spec`, `/api/ai/spec/token`) to import from `@/lib/trigger`.
  - Added structured error response (`details: err.message`) and surfaced it in `components/editor/ai-sidebar.tsx`.
  - Hardened `hooks/useCanvasAutosave.ts` with `saveSucceeded` flag to eliminate infinite fast retry loops on canvas PUT errors.


- CodeRabbit PR #6 Review Remediation:
  - Addressed all 61 review comments (29 Major, 30 Minor, 2 Trivial).
  - Enforced Clerk verified-email requirement for project collaborators.
  - Added Liveblocks access revocation broadcast upon collaborator removal.
  - Enforced private Vercel Blob access for all technical specifications.
  - Added concurrency checks for canvas blob URL updates to prevent lost updates.
  - Secured canvas REST endpoints with array validation and deferred stale blob deletion.
  - Scoped spec downloads to project ID and spec ID to prevent ID enumeration.
  - Made fallback spec generation reflect observed canvas topology without hallucinating connections.
  - Escaped Markdown table cell delimiters in fallback generator.
  - Prevented Trigger.dev task add action from overwriting existing canvas nodes.
  - Matched CI/CD terms at word boundaries rather than as substrings.
  - Added atomic rollback of partially added nodes/edges on task failure.
  - Added initialization marker (`isInitialized`) in Liveblocks storage to preserve intentionally emptied canvases.
  - Handled snapshot restoration retry and cancellation safely.
  - Validated drag payload with `NODE_SHAPES` check and positive finite dimension constraints.
  - Rendered AI cursor in flow coordinates via `ViewportPortal`.
  - Consolidated template import into a single path and grouped canvas clearing and population into a single Liveblocks undo batch (`room.batch`).
  - Added responsive stacking layout for zoom/history toolbar and shape palette on narrow screens.
  - Made edge notes keyboard-accessible with native button and Enter/Space activation.
  - Added keyboard activation (Enter) for canvas node label editing.
  - Restricted clearing of editing presence only to the active editing node.
  - Added click and keyboard Enter/Space placement for shape palette.
  - Added terminal error recovery boundary for Liveblocks canvas room.
  - Resolved queueing of reverts and unpersisted baseline handling in `useCanvasAutosave`.
  - Ignored canvas undo/redo while focus is inside modal dialogs.
  - Added `aria-pressed` to node color swatches.
  - Extracted collaborator management into `useProjectCollaborators` hook with body-read cancellation and mutation locking.
  - Initialized spec preview loading state before starting fetch.
  - Handled async rejections on `createFeedMessage` promises.
  - Bound AI busy lock to active run ID, preventing historical status from blocking input.
  - Added recovery path for spec realtime run tokens via `/api/ai/spec/token`.
  - Distinguished unavailable canvas from empty canvas during spec generation trigger.

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

- `08-editor-workspace-shell.md` — Editor Workspace Shell:
  - Created `lib/project-access.ts` with `getCurrentUserIdentity()` and `checkProjectAccess(projectId, identity)` supporting owners and invited collaborators.
  - Built `components/editor/access-denied.tsx` with centered layout, lock icon, explanatory message, and link back to `/editor`.
  - Built `components/editor/workspace-view.tsx` with top navbar showing project name, share button, AI assistant toggle, left `ProjectSidebar` with active project highlighted, center canvas placeholder with dark background, and collapsible right AI sidebar placeholder.
  - Implemented `app/editor/[roomId]/page.tsx` as an async Server Component with server-side authentication redirect to `/sign-in`, access denial handling for unauthorized/missing projects, and Suspense streaming.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `09-share-dialog.md` — Project Share Dialog:
  - Created `lib/collaborators.ts` providing `getProjectCollaborators`, `inviteCollaborator`, and `removeCollaborator`.
  - Enriched collaborator records with Clerk Backend API (`getUserList({ emailAddress })` and `getUser(ownerId)`) to resolve display names and avatar URLs, with resilient fallback to email only when a user is not found in Clerk.
  - Implemented `app/api/projects/[projectId]/collaborators/route.ts` with `GET`, `POST`, and `DELETE` endpoints strictly enforcing project ownership server-side for mutations.
  - Built `components/editor/share-dialog.tsx` featuring project link copying with temporary `Copied!` feedback, owner-only email invite form, member list displaying owner badge, avatar images, collaborator badges, and removal triggers. Collaborators receive read-only view.
  - Wired `ShareDialog` into `WorkspaceView` and connected the `Share` navbar button.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `10-liveblocks-setup.md` — Liveblocks Realtime Infrastructure Setup:
  - Configured `liveblocks.config.ts` globally typing `Presence` (cursor coordinates and `isThinking` boolean) and `UserMeta` (user ID, display name, avatar URL, cursor color).
  - Created `lib/liveblocks.ts` providing a cached singleton `@liveblocks/node` client and deterministic `getUserColor` mapping user IDs to a vibrant, high-contrast palette.
  - Implemented `POST /api/liveblocks-auth` route requiring Clerk auth, verifying project access (403 for unauthorized users), ensuring room existence via `liveblocks.getOrCreateRoom`, and authorizing session tokens with user metadata and cursor color.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `11-base-canvas.md` — Liveblocks-Backed React Flow Base Canvas:
  - Created `types/canvas.ts` defining shared canvas types (`CanvasNodeData`, `CanvasNode`, `CanvasEdge`, `CANVAS_NODE_TYPE`, `CANVAS_EDGE_TYPE`, `NODE_SHAPES`, `NODE_COLORS`, `DEFAULT_NODE_COLOR`, `DEFAULT_NODE_SHAPE`).
  - Created `components/canvas/base-canvas.tsx` wiring `useLiveblocksFlow({ suspense: true })` with synced nodes, edges, change handlers, loose connection mode (`ConnectionMode.Loose`), `fitView`, dot-pattern background, dark `MiniMap`, and peer `Cursors`.
  - Created `components/canvas/canvas-room.tsx` client wrapper establishing `LiveblocksProvider` (`/api/liveblocks-auth`), `RoomProvider` (`initialPresence={{ cursor: null, isThinking: false }}`), `ErrorBoundary` for connection issues with retry button, and `ClientSideSuspense` loading state.
  - Replaced the central placeholder in `components/editor/workspace-view.tsx` with `<CanvasRoom roomId={project.id} />`.
  - Installed `@xyflow/react@^12.4.4`, `@liveblocks/react-flow`, and `react-error-boundary`.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `12-shape-panel.md` — Bottom Shape Panel & Drag-and-Drop Creation:
  - Created `components/canvas/shape-panel.tsx` floating pill-shaped toolbar with 6 draggable shape buttons (rectangle, diamond, circle, pill, cylinder, hexagon) transmitting JSON drag payloads with shape type and default dimensions.
  - Implemented `dragover` and `drop` handling on the canvas wrapper in `components/canvas/base-canvas.tsx`, using `screenToFlowPosition` to calculate drop canvas coordinates.
  - Generates node IDs with shape name, timestamp, and a counter (`${shape}-${Date.now()}-${counter}`).
  - Built `components/canvas/canvas-node.tsx` basic custom node component (`canvasNode`) rendering bordered rectangles with centered labels and 4 connection handles.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `13-node-shape.md` — Node Shape Visuals & Drag Ghost Preview:
  - Created `components/canvas/node-shape-view.tsx` implementing CSS styling for `rectangle` (`rounded-xl`), `pill` (`rounded-full`), and `circle` (`rounded-full aspect-square`), plus scalable inline SVG shapes for `diamond` (polygon), `hexagon` (polygon), and `cylinder` (database path with top ellipse rim), using `preserveAspectRatio="none"` and `vectorEffect="non-scaling-stroke"`.
  - Refactored `components/canvas/canvas-node.tsx` to render `NodeShapeView` with subtle borders at rest, vivid cyan border and ring on selection, centered labels, and 4 hover connection handles.
  - Added interactive cursor-attached drag ghost preview in `components/canvas/base-canvas.tsx` tracking cursor coordinates on `dragOver`, rendering a semi-transparent dashed silhouette with matching shape and dimensions, and automatically clearing on drop or drag cancellation.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `14-node-editing.md` — Node Resizing & Inline Label Editing:
  - Removed top navbar center project name badge (`Ghost Ai Test`) from `components/editor/workspace-view.tsx`.
  - Added `@xyflow/react`'s `NodeResizer` to `components/canvas/canvas-node.tsx`, rendering subtle cyan handles and borders strictly when a node is selected, clamping dimensions to `minWidth={80}` and `minHeight={50}`, and preserving aspect ratio for `circle` shapes.
  - Created `components/canvas/canvas-context.tsx` with `CanvasFlowContext` and `useCanvasFlow` providing `updateNodeLabel`.
  - Wired `updateNodeLabel` in `components/canvas/base-canvas.tsx` to sync changes locally through `updateNodeData` and collaboratively across Liveblocks via `onNodesChange` with `{ type: "replace" }`.
  - Implemented seamless inline label editing on double-clicking the center/label area of any node with zero layout shifts: auto-focusing and selecting text inside a borderless, transparent, auto-resizing `<textarea>` positioned directly over the label with matching centered alignment.
  - Styled placeholder text centered in the same position when the label is empty.
  - Text editing interactions prevent canvas drag or pan via `nodrag nopan` class names and mouse/keyboard event propagation stops.
  - Closes editing automatically on blur or `Escape` key.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `15-node-color-toolbar.md` & Canvas Ergonomics Enhancements:
  - Fixed resize precision (Problem 1) by expanding handle grab hit areas to 24px × 24px via invisible interaction padding and making the bounding border lines directly draggable.
  - Added 4 side edge resize handles (Problem 2) for top, bottom, left, and right using `NodeResizeControl`, allowing independent horizontal (width) and vertical (height) resizing without locking aspect ratio (while `circle` maintains 1:1).
  - Fixed handle connections (Problem 3) by assigning unique IDs (`id="top"`, `id="bottom"`, `id="left"`, `id="right"`), configuring bidirectional loose connections, and enlarging connection hit targets so wires connect seamlessly from and to all 4 sides.
  - Created `components/canvas/node-color-toolbar.tsx` (Problem 4) floating above selected nodes with the 8 curated Ghost AI dark-theme color palette swatches, tight controlled hover glow matching paired text color, and active selection ring, syncing live to React Flow and Liveblocks collaborators without page reloads.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `16-edge-behavior.md`, Canvas Multi-Selection & Presence Fixes:
  - Created `components/canvas/canvas-edge.tsx` providing custom smoothstep right-angle routing, dimmed slate stroke at rest brightening to cyan on selection, and invisible 24px wider interaction path for easy clicking/hovering.
  - Added directional arrowhead markers (`MarkerType.ArrowClosed`) pointing to the target node for all connections.
  - Implemented centered pill badge notes and inline edge label editing on double-click or clicking `+ Note`, saving on Enter, blur, or Escape, and syncing live across Liveblocks storage via `updateEdgeLabel`.
  - Fixed edge label overflow (Problem 1) by constraining badge width (`max-w-[200px] truncate`), adding full-text hover tooltips, and capping editing input length to 80 characters.
  - Fixed oversized peer cursor (Problem 2) by creating `components/canvas/peer-cursor.tsx` with a crisp 16px × 16px SVG pointer and importing `@liveblocks/react-ui/styles.css`.
  - Added real-time collaboration awareness ("Who is editing what") by tracking `editingNodeId` in Liveblocks presence, displaying live `[● Name is editing]` badges and colored selection rings on shapes, and showing `(editing)` tags on peer cursor labels.
  - Configured `deleteKeyCode={["Backspace", "Delete"]}` allowing the physical `Delete` key on keyboards to delete shapes and wires.
  - Configured `selectionOnDrag={true}` and `selectionMode={SelectionMode.Partial}` enabling marquee box selection on canvas drag to select and batch-delete multiple shapes at once.
  - Configured `panOnDrag={[1, 2]}` and `panActivationKeyCode="Space"` enabling smooth canvas navigation via Middle-Click drag, Right-Click drag, or Spacebar + Left-Click drag.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `17-canvas-ergonomics.md.md` — Canvas Zoom & Undo/Redo Control Bar & Shortcuts:
  - Created `components/canvas/canvas-control-bar.tsx` as a floating pill-shaped toolbar at the bottom-left of the canvas (`bottom-6 left-6 z-20`) styled with dark technical tokens (`bg-surface/95 backdrop-blur-md border border-border-subtle`).
  - Added Zoom controls group: Zoom Out (`Minus`), Fit View (`Maximize2`), and Zoom In (`Plus`), wired to React Flow instance methods with smooth 300ms transitions (`{ duration: 300 }`).
  - Added a thin vertical divider (`w-px h-4 bg-border-subtle`) separating the two functional control groups.
  - Added History controls group: Undo (`Undo2`) and Redo (`Redo2`), wired directly to Liveblocks collaborative history hooks (`useUndo`, `useRedo`, `useCanUndo`, `useCanRedo`) with automatic visual dimming and click disabling when there is nothing to undo/redo.
  - Created `hooks/useKeyboardShortcuts.ts` (and aliased `hooks/use-keyboard-shortcuts.ts`) listening to global `window` keydown events:
    - `+` or `=` to zoom in (smooth animation)
    - `-` to zoom out (smooth animation)
    - `Cmd/Ctrl + Z` to undo
    - `Cmd/Ctrl + Shift + Z` or `Cmd/Ctrl + Y` to redo
  - Implemented smart input guard (`isEditableElement`) in `useKeyboardShortcuts` that skips shortcuts whenever the user is typing in inputs, textareas, selects, or contenteditable fields (e.g. node labels or edge notes).
  - Wired `CanvasControlBar` and `useKeyboardShortcuts` into `components/canvas/base-canvas.tsx`.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `18-starter-templates.md` — Starter Architecture Templates:
  - Created `components/editor/starter-templates.ts` defining `CanvasTemplate` interface, helper builders `createNode` and `createEdge`, and three production-grade architecture templates:
    1. **Microservices Architecture**: Web/Mobile clients, API Gateway, Auth Service, User Service, Order Service, Redis Cache, Postgres DB.
    2. **CI/CD Pipeline**: Git Repo, Test & Lint runner, Docker Build, Security Scan (Diamond), Container Registry (Cylinder), Staging Cluster, Production (Hexagon).
    3. **Event-Driven System**: Telemetry Producer, Ingestion API, Kafka Broker, Flink Processor, Alert Dispatcher, TimescaleDB, Dead Letter Queue.
  - Defined all template elements using shared canvas types (`CANVAS_NODE_TYPE`, `CANVAS_EDGE_TYPE`, `NODE_COLORS`, `NodeShape`, `MarkerType.ArrowClosed`).
  - Created `components/editor/starter-templates-modal.tsx` rendering a responsive template card gallery with lightweight SVG diagram previews (`TemplateDiagramPreview`), calculating node bounding boxes, drawing shapes, colors, labels, and directional edge links without React Flow overhead.
  - Added "Templates" button with `LayoutTemplate` icon to `components/editor/editor-navbar.tsx` via `onOpenTemplates` prop.
  - Wired full canvas replacement logic in `components/canvas/base-canvas.tsx`: clears existing nodes and edges via `onDelete({ nodes, edges })` before loading the selected template through `onNodesChange` and `onEdgesChange` in Liveblocks collaborative storage, followed by smooth `fitView`.
  - Integrated modal and import state in `components/editor/workspace-view.tsx` and `components/canvas/canvas-room.tsx`.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `19-presence-avatars-cursors.md` — Presence Avatars & Live Cursors:
  - Updated `liveblocks.config.ts` to define `thinking: boolean` in the shared `Presence` type.
  - Created `components/editor/participant-avatars.tsx` rendering the participant avatar group inside the editor canvas view alongside the Clerk `UserButton`:
    - Resolves active user ID via Clerk `useUser()` and filters Liveblocks `useOthers()` presence list to exclude the current user.
    - Current user is rendered exclusively through Clerk's `UserButton`, preventing duplicate avatars.
    - Displays up to 5 collaborator avatars in an overlapping stack (`-space-x-2`) with `ring-2 ring-surface border border-white/10` for high contrast against the dark canvas.
    - Renders profile images when available, falling back to initials with the collaborator's assigned presence color.
    - Displays a `+N` overflow chip when more than 5 collaborators are connected.
    - Collaborator avatars are display-only (non-interactive).
    - Renders a subtle vertical divider between collaborator avatars and `UserButton` strictly when at least 1 collaborator exists. When no collaborators are present, renders only `UserButton` with no divider.
  - Added `presenceSlot` prop to `components/editor/editor-navbar.tsx`, ensuring the editor home navbar (`/editor`) remains 100% unchanged while the editor room view renders live presence.
  - Wrapped `WorkspaceView` with `LiveblocksProvider` and `RoomProvider` (`initialPresence={{ cursor: null, thinking: false, isThinking: false, editingNodeId: null }}`), giving both the navbar and canvas direct realtime presence access.
  - Wired explicit `onMouseMove` and `onMouseLeave` handlers to `<ReactFlow>` in `components/canvas/base-canvas.tsx` to broadcast cursor coordinates and clear cursor to `null` on canvas exit.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `20-ai-sidebar-shell.md` — AI Sidebar Shell & Chat Layout:
  - Created standalone `components/editor/ai-sidebar.tsx` preserving the floating slide-in drawer layout (`animate-in slide-in-from-right-2 duration-200 shadow-2xl`, controlled via `isOpen` and `onClose`).
  - Added header with bot icon, "AI Workspace" title, "Collaborate with Ghost AI" subtitle, and close button.
  - Implemented tabbed layout using shadcn `Tabs` with "AI Architect" and "Specs" tabs styled with active accent indicators and muted inactive states.
  - Built AI Architect tab:
    - Empty state with bot avatar, welcome copy, and 3 starter prompt chips: "Design an e-commerce backend", "Create a chat app architecture", and "Build a CI/CD pipeline", styled as soft pills (`bg-subtle text-accent-ai-text`).
    - Scrollable message thread with auto-scrolling to bottom on new messages.
    - User messages styled right-aligned (`bg-accent-dim border-2 border-brand/50 text-copy-primary rounded-2xl rounded-tr-xs`).
    - Assistant messages styled left-aligned (`bg-elevated border border-surface-border text-accent-ai-text rounded-2xl rounded-tl-xs`).
    - Bottom chat input with auto-sizing textarea (min 72px, max 160px), Enter-to-send, Shift+Enter for newline, and purple accent send button (`bg-accent-ai text-white`).
  - Built Specs tab:
    - Full-width "Generate Spec" action button (`bg-accent-ai text-white`).
    - Demo architecture specification card styled with `bg-elevated border-surface-border`, featuring spec icon, title, short description, format metadata, and disabled download button.
  - Integrated `AiSidebar` cleanly into `components/editor/workspace-view.tsx`.
  - Verified compilation (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.

- `21-canvas-autosave.md` — Canvas Autosave & Vercel Blob Persistence:
  - Verified `@vercel/blob` installation and project schema with `canvasJsonPath`.
  - Added `updateProjectCanvasBlobUrl` helper in `lib/projects.ts` maintaining clean metadata separation in Prisma.
  - Built `PUT /api/projects/[projectId]/canvas` route: authenticates session, checks project access/membership, cleans up previous blob storage if existing, uploads canvas JSON snapshot (`nodes`, `edges`, `updatedAt`, `version`) to Vercel Blob, and updates `canvasJsonPath` on the Prisma project record.
  - Built `GET /api/projects/[projectId]/canvas` route: reads project's saved blob URL from Prisma, fetches the JSON from Vercel Blob, and returns canvas state to the editor.
  - Built `hooks/useCanvasAutosave.ts` (and `hooks/use-canvas-autosave.ts`): provides debounced (1800ms) autosave of collaborative canvas nodes and edges, serializes state to avoid redundant network saves, tracks live `SaveStatus` (`idle`, `saving`, `saved`, `error`), supports manual immediate save via `manualSaveRef`, and integrates `markSavedRef` for zero-redundancy initial loading.
  - Integrated into `BaseCanvas`: checks on mount whether the Liveblocks room already has active nodes or edges; if elements already exist, skips load to avoid overwriting active collaboration; if empty, fetches `GET /api/projects/[projectId]/canvas`, populates room nodes and edges via `onNodesChange` and `onEdgesChange`, and triggers animated `fitView`.
  - Wired live save status indicator into `EditorNavbar` inside `WorkspaceView`: displays visual feedback with `Loader2` (saving), `Check` (saved), `AlertCircle` (error), and `Cloud` (idle) icons and text, enabling manual trigger on click.
  - Verified compilation (`npx tsc --noEmit`), linting (`npm run lint`), and production build (`npm run build`) pass cleanly with 0 errors.

- `24-ai-presence-state.md` — Shared AI Presence & Status Feed UI:
  - Added `validateTaskFeedMessage` helper in `types/tasks.ts` to validate incoming messages against `TaskFeedMessageSchema`.
  - Updated `components/canvas/peer-cursor.tsx` to read `thinking` from peer presence and render a small spinning `Loader2` indicator in the cursor name badge when `thinking: true`, hiding it when false or absent.
  - Enhanced `components/canvas/base-canvas.tsx` with a `useEventListener` listener for `"ai-presence"` events and added virtual AI cursor rendering on the canvas with purple accent styling and thinking indicator.
  - Updated `components/editor/ai-sidebar.tsx`:
    - Subscribed to shared Liveblocks `ai-status-feed` via `useFeedMessages` and real-time room events via `useEventListener`.
    - Integrated `useOthers` to detect active peer presence thinking state.
    - Added an AI status indicator banner at the top of the AI Architect tab displaying live status to all room participants.
    - Dynamically disables chat textarea and updates placeholder during active generation.
    - Renders a loading spinner and `"Working..."` state on the send button when generation is active.
    - Preserves full usability of the rest of the sidebar (tabs, spec previews, close button).
  - Verified compilation (`npx tsc --noEmit`), linting (`npm run lint`), and Turbopack production build (`npm run build`) pass cleanly with 0 errors.

- `23-design-agent-logic.md` — AI Design Agent Logic & Gemini Liveblocks Mutation:
  - Installed `@ai-sdk/google` and `ai` dependencies for structured LLM architectural generation.
  - Created `types/tasks.ts` declaring `TaskFeedMessage`, `TaskFeedMessageSchema`, `DesignAction`, and `ArchitecturePlan`.
  - Updated `liveblocks.config.ts` typing `RoomEvent` for `"ai-status"` and `"ai-presence"`.
  - Configured `eslint.config.mjs` and `.gitignore` to ignore `.trigger/**` transient build bundles.
  - Implemented the full design agent background task in `trigger/design-agent.ts`:
    - Interprets natural language architecture prompts using Gemini (`gemini-2.5-flash` with `generateObject` and Zod schema validation).
    - Added resilient heuristic fallback generator if `GOOGLE_AI_API_KEY` is not present or API limits are hit.
    - Directly mutates the collaborative canvas in real-time via `@liveblocks/react-flow/node`'s `mutateFlow` utility (`add_node`, `move_node`, `resize_node`, `update_node_data`, `delete_node`, `add_edge`, `delete_edge`).
    - Enforces design system rules: allowed node shapes (`rectangle`, `diamond`, `circle`, `pill`, `cylinder`, `hexagon`), 8 dark-mode `NODE_COLORS`, and multi-tier layout spacing.
    - Broadcasts live AI cursor coordinates and thinking state during generation.
    - Publishes step-by-step progress messages (`start`, `processing`, `complete`, `error`) to Liveblocks `ai-status-feed` and room events.
    - Clears presence and handles errors gracefully on completion or failure.
  - Verified compilation (`npx tsc --noEmit`), linting (`npm run lint`), and production build (`npm run build`) pass cleanly with 0 errors.

- `24-ai-presence-state.md` — Shared AI Presence & Status Feed UI:
  - Added `validateTaskFeedMessage` helper in `types/tasks.ts` to validate incoming messages against `TaskFeedMessageSchema`.
  - Updated `components/canvas/peer-cursor.tsx` to read `thinking` from peer presence and render a small spinning `Loader2` indicator in the cursor name badge when `thinking: true`, hiding it when false or absent.
  - Enhanced `components/canvas/base-canvas.tsx` with a `useEventListener` listener for `"ai-presence"` events and added virtual AI cursor rendering on the canvas with purple accent styling and thinking indicator.
  - Updated `components/editor/ai-sidebar.tsx`:
    - Subscribed to shared Liveblocks `ai-status-feed` via `useFeedMessages` and real-time room events via `useEventListener`.
    - Integrated `useOthers` to detect active peer presence thinking state.
    - Added an AI status indicator banner at the top of the AI Architect tab displaying live status to all room participants.
    - Dynamically disables chat textarea and updates placeholder during active generation.
    - Renders a loading spinner and `"Working..."` state on the send button when generation is active.
    - Preserves full usability of the rest of the sidebar (tabs, spec previews, close button).
  - Verified compilation (`npx tsc --noEmit`), linting (`npm run lint`), and Turbopack production build (`npm run build`) pass cleanly with 0 errors.

- `25-sidebar-chat-feed.md` — Collaborative Sidebar Chat Feed:
  - Created `ChatFeedMessageSchema` in `types/tasks.ts` validating `sender`, `role`, `content`, and `timestamp`.
  - Added Liveblocks `ai-chat` feed subscription in `components/editor/ai-sidebar.tsx` separate from `ai-status-feed`.
  - Added collaborative message sending with `useCreateFeedMessage("ai-chat")` and optimistic local state.
  - Validated all incoming chat feed messages before rendering.

- `26-ai-chat-functional.md` — AI Chat Functional Integration & Trigger.dev Run Tracking:
  - Connected `handleSendMessage` in `components/editor/ai-sidebar.tsx` to `POST /api/ai/design`.
  - Updated `POST /api/ai/design` to generate and return both `runId` and `publicToken` (via `triggerAuth.createPublicToken`).
  - Integrated `useRealtimeRun` from `@trigger.dev/react-hooks` with `accessToken: publicToken` and `onComplete` handling.
  - Added compact status strip above the textarea with pulsing green indicator (`#62C073`) active only during generation.
  - Styled chat bubbles with green accent (`#62C073`) for user messages and dark background for assistant messages.
  - Pushed final architectural plan summary to `ai-chat` upon task completion.
  - Passed `projectId` and `roomId` to `<AiSidebar />` in `components/editor/workspace-view.tsx`.
  - Resolved `Feed ai-chat not found` error by ensuring `ai-chat` and `ai-status-feed` are created server-side during `POST /api/liveblocks-auth` and client-side with `useCreateFeed()`.
  - Polished node shape dimensions and card design: balanced default dimensions (diamonds at 160x100, cylinders at 140x86, circles at 90x90, rectangles at 180x76, pills at 160x56), multi-line title and subtitle description rendering, and smart handle routing (`sourceHandle`/`targetHandle`) to eliminate overlapping edge badges.
  - Verified `npm run build` and `npm run lint` pass with 0 errors.

- `27-spec-generation-flow.md` — AI Spec Generation Backend Flow:
  - Created `POST /api/ai/spec` route: validates Clerk authentication and project membership, rejects client-supplied project IDs and resolves strictly from `roomId`, triggers `generateSpec` background task, records `TaskRun` in Prisma for ownership tracking, and returns `runId` and scoped 1-hour access token.
  - Created `POST /api/ai/spec/token` route: verifies run ownership against Prisma `TaskRun`, generates a scoped Trigger.dev public access token via `triggerAuth.createPublicToken()` with `expirationTime: "1h"`, and returns token for client run tracking.
  - Created `trigger/generate-spec.ts`:
    - Defines `generateSpec` task validating payload (`projectId`, `roomId`, `chatHistory`, `nodes`, `edges`) with Zod schema `GenerateSpecPayloadSchema`.
    - Generates a comprehensive publication-grade Markdown technical architecture specification from canvas and chat context using Gemini (`gemini-2.5-flash` with `@ai-sdk/google`).
    - Includes a resilient structured fallback generator for unconfigured or rate-limited API environments.
    - Updates run metadata/status (`analyzing`, `generating`, `complete`, `wordCount`) for realtime tracking.
    - Returns the generated technical spec content as plain Markdown task output.
  - Declared `GenerateSpecPayloadSchema` and `SpecTriggerRequestSchema` in `types/tasks.ts`.
  - Verified compilation (`npx tsc --noEmit`), linting (`npm run lint`), and Turbopack production build (`npm run build`) pass cleanly with 0 errors.

- `28-spec-persistence-download.md` — Spec Persistence with Vercel Blob & Secure Download Route:
  - Created `ProjectSpec` Prisma model in `prisma/models/project-spec.prisma` (`id`, `projectId`, `filePath`, `createdAt`) with cascade delete relation on `Project`.
  - Pushed database migrations with `npx prisma db push` and generated typed Prisma Client.
  - Implemented `lib/specs.ts` utilities:
    - `saveProjectSpec`: uploads Markdown content to Vercel Blob (`specs/${projectId}/spec-${Date.now()}.md`) using resilient private store with public fallback, and stores metadata record in Prisma.
    - `getProjectSpec`: queries spec metadata record by ID.
    - `getProjectSpecs`: queries all specs for a project ordered newest first.
    - `fetchSpecContent`: fetches raw Markdown content using authenticated `get()` SDK with stream reader and fallback.
    - `deleteProjectSpec`: deletes blob and Prisma metadata.
  - Integrated `saveProjectSpec` into `trigger/generate-spec.ts` background task to automatically persist every generated spec to Vercel Blob and Prisma.
  - Created `GET /api/projects/[projectId]/specs/[specId]/download` secure route: validates Clerk authentication, checks project access (owner/collaborator), verifies spec project boundary, fetches Markdown from Vercel Blob, and returns a downloadable file attachment (`Content-Disposition: attachment; filename="..."`).
  - Created `GET /api/projects/[projectId]/specs` endpoint for listing project specifications.
  - Verified compilation (`npx tsc --noEmit`), linting (`npm run lint`), and Turbopack production build (`npm run build`) pass cleanly with 0 errors.

- `29-spec-ui-integration.md` — Spec UI Integration & Preview in Editor Sidebar:
  - Wired the "Generate Spec" button in `components/editor/ai-sidebar.tsx` with live click handler:
    - Gathers current canvas elements (`nodes`, `edges`) synchronously via custom DOM event from `BaseCanvas`.
    - Gathers chat history from validated feed messages.
    - Dispatches to `POST /api/ai/spec` and tracks the Trigger.dev background task in realtime via `useRealtimeRun` with public scoped token.
    - Displays a loading indicator (`Loader2` spinner and status message) during active generation.
  - Built `components/editor/spec-preview-dialog.tsx`:
    - Opens upon clicking "Preview" or a spec card.
    - Securely fetches spec content via `GET /api/projects/[projectId]/specs/[specId]/download` (no client-side direct blob exposure).
    - Renders rich Markdown with `react-markdown` and `remark-gfm` (headers, tables, code blocks, lists).
    - Includes basic keyboard Escape support and Close/Download actions.
  - Implemented dynamic project specifications list in `components/editor/ai-sidebar.tsx`:
    - Fetches existing specs from `GET /api/projects/[projectId]/specs`.
    - Displays creation timestamp, title/version, and format metadata.
    - Added empty state placeholder when no specs exist yet.
    - Added instant browser file download via `/api/projects/[projectId]/specs/[specId]/download`.
  - Added synchronous canvas state listener (`ghost-ai:get-canvas-state`) in `components/canvas/base-canvas.tsx`.
  - Verified compilation (`npx tsc --noEmit`), linting (`npm run lint`), and Turbopack production build (`npm run build`) pass cleanly with 0 errors.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- Add context needed to resume work in the next session.
