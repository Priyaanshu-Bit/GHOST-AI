import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProjectsForUser } from "@/lib/projects";
import { EditorHomeView } from "@/components/editor/editor-home-view";

/**
 * Server component for the /editor home page.
 * Fetches owned and shared projects server-side and passes them to the view.
 */
export default async function EditorHomePage() {
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
