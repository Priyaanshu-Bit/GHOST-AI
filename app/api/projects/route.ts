import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { getProjectsForUser, createProject } from "@/lib/projects";

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * GET /api/projects
 * Lists the authenticated user's owned and shared projects.
 * Returns 401 if unauthenticated.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const primaryEmailAddress = user?.primaryEmailAddress;
  const userEmail =
    primaryEmailAddress?.verification?.status === "verified"
      ? primaryEmailAddress.emailAddress
      : user?.emailAddresses?.find(
          (emailAddress) => emailAddress.verification?.status === "verified"
        )?.emailAddress ?? null;

  const { owned, shared } = await getProjectsForUser(userId, userEmail);

  return NextResponse.json({
    owned,
    shared,
    projects: [...owned, ...shared],
  });
}

/**
 * POST /api/projects
 * Creates a new project for the authenticated user.
 * Defaults missing name to "Untitled Project".
 * Uses schema's existing ID strategy unless a client slug ID is specified.
 * Returns 401 if unauthenticated.
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedBody: unknown = {};

  try {
    parsedBody = await request.json();
  } catch {
    // If body cannot be parsed or is empty, fallback to defaults
  }

  if (!isJsonObject(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = parsedBody;
  const projectId =
    typeof body.id === "string" && body.id.trim() ? body.id.trim() : undefined;

  let project;
  try {
    project = await createProject({
      id: projectId,
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        typeof body.description === "string" ? body.description : undefined,
      ownerId: userId,
    });
  } catch (error) {
    if (
      projectId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A project with this ID already exists" },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json(project, { status: 201 });
}
