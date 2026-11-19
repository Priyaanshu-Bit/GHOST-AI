import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put, del, get } from "@vercel/blob";
import { getCurrentUserIdentity, checkProjectAccess } from "@/lib/project-access";
import { updateProjectCanvasBlobUrl } from "@/lib/projects";

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * PUT /api/projects/[projectId]/canvas
 * Persists the canvas JSON snapshot into Vercel Blob and records the blob URL in Prisma.
 * Accessible to project owners and invited collaborators.
 */
export async function PUT(request: Request, context: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity || !identity.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const access = await checkProjectAccess(projectId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isJsonObject(body)) {
    return NextResponse.json({ error: "Expected JSON object body" }, { status: 400 });
  }

  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return NextResponse.json(
      { error: "Invalid canvas payload: nodes and edges must be arrays" },
      { status: 400 }
    );
  }

  const nodes = body.nodes;
  const edges = body.edges;

  const canvasPayload = JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    nodes,
    edges,
  });

  try {
    const previousBlobUrl = access.project.canvasJsonPath;
    const sanitizedBlobToken = process.env.BLOB_READ_WRITE_TOKEN?.replace(/^["']|["']$/g, "").trim();

    // Upload latest canvas JSON snapshot to Vercel Blob
    // Handles both private stores (default for secure enterprise buckets) and public stores
    let blob;
    try {
      blob = await put(
        `canvas/${projectId}/canvas-${Date.now()}.json`,
        canvasPayload,
        {
          access: "private",
          contentType: "application/json",
          token: sanitizedBlobToken,
        }
      );
    } catch (putErr) {
      const errMsg = putErr instanceof Error ? putErr.message : String(putErr);
      if (
        errMsg.includes("public store") ||
        errMsg.includes("Cannot use private access")
      ) {
        blob = await put(
          `canvas/${projectId}/canvas-${Date.now()}.json`,
          canvasPayload,
          {
            access: "public",
            contentType: "application/json",
            token: sanitizedBlobToken,
          }
        );
      } else {
        throw putErr;
      }
    }

    // Store returned blob URL in Prisma metadata
    await updateProjectCanvasBlobUrl(projectId, blob.url);

    // Clean up previous blob only after the new snapshot is successfully committed
    if (
      previousBlobUrl &&
      previousBlobUrl !== blob.url &&
      previousBlobUrl.includes("blob.vercel-storage.com")
    ) {
      try {
        await del(previousBlobUrl, {
          token: sanitizedBlobToken,
        });
      } catch (delErr) {
        console.warn("Failed to delete stale canvas blob:", delErr);
      }
    }

    return NextResponse.json({
      success: true,
      url: blob.url,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
  } catch (err) {
    console.error("Vercel Blob canvas upload error:", err);
    const message = err instanceof Error ? err.message : "Failed to persist canvas snapshot";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[projectId]/canvas
 * Reads the project's saved blob URL from Prisma, fetches the JSON from Vercel Blob,
 * and returns the canvas state.
 */
export async function GET(_request: Request, context: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity || !identity.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const access = await checkProjectAccess(projectId, identity);
  if (!access.hasAccess || !access.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    );
  }

  // If no canvas snapshot exists yet, return empty canvas state
  if (!access.project.canvasJsonPath) {
    return NextResponse.json({
      nodes: [],
      edges: [],
      url: null,
    });
  }

  const blobUrl = access.project.canvasJsonPath;

  try {
    let canvasData: Record<string, unknown> | null = null;
    const sanitizedBlobToken = process.env.BLOB_READ_WRITE_TOKEN?.replace(/^["']|["']$/g, "").trim();

    // For Vercel Blob URLs, use the authenticated blob get() SDK
    // which handles private stores requiring token authorization
    if (blobUrl.includes("blob.vercel-storage.com")) {
      const isPrivate = blobUrl.includes("private.blob.vercel-storage.com");
      try {
        const blobRes = await get(blobUrl, {
          access: isPrivate ? "private" : "public",
          token: sanitizedBlobToken,
        });
        if (blobRes && blobRes.statusCode === 200 && blobRes.stream) {
          const text = await new Response(blobRes.stream).text();
          canvasData = JSON.parse(text);
        }
      } catch (getErr) {
        console.warn("Direct authenticated blob get failed, trying fallback:", getErr);
        try {
          const fallbackRes = await get(blobUrl, {
            access: isPrivate ? "public" : "private",
            token: sanitizedBlobToken,
          });
          if (fallbackRes && fallbackRes.statusCode === 200 && fallbackRes.stream) {
            const text = await new Response(fallbackRes.stream).text();
            canvasData = JSON.parse(text);
          }
        } catch {
          // Fall through to plain fetch
        }
      }
    }

    // Fallback for public URLs or external origins
    if (!canvasData) {
      const res = await fetch(blobUrl);
      if (!res.ok) {
        console.warn("Could not fetch canvas blob from URL:", blobUrl);
        return NextResponse.json(
          { error: "Failed to retrieve canvas snapshot from storage" },
          { status: 502 }
        );
      }
      canvasData = await res.json();
    }

    return NextResponse.json({
      nodes: Array.isArray(canvasData?.nodes) ? canvasData.nodes : [],
      edges: Array.isArray(canvasData?.edges) ? canvasData.edges : [],
      url: blobUrl,
    });
  } catch (err) {
    console.error("Failed to load canvas blob:", err);
    return NextResponse.json(
      { error: "Failed to retrieve or parse canvas snapshot from storage" },
      { status: 502 }
    );
  }
}
