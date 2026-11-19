import { put, get, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import type { ProjectSpec } from "@prisma/client";

/**
 * Persists a generated Markdown technical spec to Vercel Blob and records metadata in Prisma.
 * Follows the same resilient blob storage pattern used for canvas persistence.
 */
export async function saveProjectSpec(
  projectId: string,
  markdown: string
): Promise<ProjectSpec> {
  const filename = `specs/${projectId}/spec-${Date.now()}.md`;

  let blob;
  try {
    blob = await put(filename, markdown, {
      access: "private",
      contentType: "text/markdown; charset=utf-8",
    });
  } catch (putErr) {
    const errMsg = putErr instanceof Error ? putErr.message : String(putErr);
    if (
      errMsg.includes("public store") ||
      errMsg.includes("Cannot use private access")
    ) {
      blob = await put(filename, markdown, {
        access: "public",
        contentType: "text/markdown; charset=utf-8",
      });
    } else {
      throw putErr;
    }
  }

  // Create ProjectSpec metadata record in Prisma
  const record = await prisma.projectSpec.create({
    data: {
      projectId,
      filePath: blob.url,
    },
  });

  return record;
}

/**
 * Retrieves a single ProjectSpec metadata record by spec ID.
 */
export async function getProjectSpec(
  specId: string
): Promise<ProjectSpec | null> {
  return await prisma.projectSpec.findUnique({
    where: { id: specId },
  });
}

/**
 * Retrieves all ProjectSpec records for a given project, sorted by newest first.
 */
export async function getProjectSpecs(
  projectId: string
): Promise<ProjectSpec[]> {
  return await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Fetches the raw Markdown content from a Vercel Blob URL.
 * Handles authenticated get() for private stores with graceful fallback for public stores.
 */
export async function fetchSpecContent(filePath: string): Promise<string> {
  if (filePath.includes("blob.vercel-storage.com")) {
    const isPrivate = filePath.includes("private.blob.vercel-storage.com");
    try {
      const blobRes = await get(filePath, {
        access: isPrivate ? "private" : "public",
      });
      if (blobRes && blobRes.statusCode === 200 && blobRes.stream) {
        return await new Response(blobRes.stream).text();
      }
    } catch (getErr) {
      console.warn("Direct authenticated blob get failed, trying fallback access mode:", getErr);
      try {
        const fallbackRes = await get(filePath, {
          access: isPrivate ? "public" : "private",
        });
        if (fallbackRes && fallbackRes.statusCode === 200 && fallbackRes.stream) {
          return await new Response(fallbackRes.stream).text();
        }
      } catch {
        // Fall through to standard fetch
      }
    }
  }

  // Fallback for public URLs or non-standard hosts
  const res = await fetch(filePath);
  if (!res.ok) {
    throw new Error(`Failed to fetch spec content from storage: HTTP ${res.status}`);
  }
  return await res.text();
}

/**
 * Deletes a spec blob from Vercel Blob and removes its metadata record from Prisma.
 */
export async function deleteProjectSpec(specId: string): Promise<void> {
  const spec = await prisma.projectSpec.findUnique({
    where: { id: specId },
  });

  if (!spec) return;

  if (spec.filePath && spec.filePath.includes("blob.vercel-storage.com")) {
    try {
      await del(spec.filePath);
    } catch (delErr) {
      console.warn("Failed to delete spec blob from storage:", delErr);
    }
  }

  await prisma.projectSpec.delete({
    where: { id: specId },
  });
}
