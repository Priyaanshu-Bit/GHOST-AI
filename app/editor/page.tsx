import { Suspense } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProjectsForUser } from "@/lib/projects";
import { EditorHomeView } from "@/components/editor/editor-home-view";
import { EditorLayout } from "@/components/editor/editor-layout";

/**
 * Async child component that reads the Clerk session and fetches projects.
 * Wrapped in a Suspense boundary to allow instant navigation static shell rendering.
 */
async function EditorHomeContent() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  const { owned, shared } = await getProjectsForUser(userId, userEmail);

  return <EditorHomeView ownedProjects={owned} sharedProjects={shared} />;
}

/**
 * Loading fallback rendered while server-side user & project data streams in.
 */
function EditorHomeLoading() {
  return (
    <EditorLayout ownedProjects={[]} sharedProjects={[]}>
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent-primary" />
      </div>
    </EditorLayout>
  );
}

/**
 * Server component for the /editor home page.
 * Keeps the page export synchronous and streams dynamic Clerk & database data via Suspense.
 */
export default function EditorHomePage() {
  return (
    <Suspense fallback={<EditorHomeLoading />}>
      <EditorHomeContent />
    </Suspense>
  );
}

