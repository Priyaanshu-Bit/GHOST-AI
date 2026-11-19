import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";
import { getProjectsForUser } from "@/lib/projects";
import { AccessDenied } from "@/components/editor/access-denied";
import { WorkspaceView } from "@/components/editor/workspace-view";
import { EditorNavbar } from "@/components/editor/editor-navbar";

interface WorkspacePageProps {
  params: Promise<{ roomId: string }>;
}

/**
 * Server component that verifies user authentication and project authorization.
 * Redirects unauthenticated users to /sign-in.
 * Shows AccessDenied for missing or unauthorized projects.
 * Passes project context and user project list to WorkspaceView.
 */
async function WorkspaceContent({ params }: WorkspacePageProps) {
  const { roomId } = await params;
  const identity = await getCurrentUserIdentity();

  if (!identity || !identity.userId) {
    redirect("/sign-in");
  }

  const { hasAccess, project, isOwner } = await checkProjectAccess(
    roomId,
    identity
  );

  if (!hasAccess || !project) {
    return <AccessDenied />;
  }

  const { owned, shared } = await getProjectsForUser(
    identity.userId,
    identity.email
  );

  return (
    <WorkspaceView
      project={project}
      ownedProjects={owned}
      sharedProjects={shared}
      isOwner={isOwner}
    />
  );
}

/**
 * Loading fallback rendered during instant navigation while server data resolves.
 */
function WorkspaceLoading() {
  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-base text-copy-primary">
      <EditorNavbar />
      <div className="relative flex-1 flex items-center justify-center bg-base">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent-primary" />
      </div>
    </div>
  );
}

/**
 * Root Server Component for /editor/[roomId].
 */
export default function WorkspacePage(props: WorkspacePageProps) {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <WorkspaceContent {...props} />
    </Suspense>
  );
}
