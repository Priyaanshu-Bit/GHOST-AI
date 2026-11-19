import { configure, tasks, auth as triggerAuth } from "@trigger.dev/sdk";

// Sanitize secret key of any accidental wrapping quotes or extra whitespace
const rawSecretKey = process.env.TRIGGER_SECRET_KEY?.replace(/^["']|["']$/g, "").trim();

// On Vercel, VERCEL_GIT_COMMIT_REF is automatically injected with the Git branch (e.g. "main").
// Trigger.dev's SDK checks VERCEL_GIT_COMMIT_REF and sets x-trigger-branch: <branch>.
// If Trigger.dev does not have a matching preview branch configured for that branch,
// the Trigger.dev Cloud API rejects requests with HTTP 401 "No matching branch env".
// Setting previewBranch to TRIGGER_PREVIEW_BRANCH (or empty string when unset)
// ensures standard production and development runs are not rejected.
configure({
  secretKey: rawSecretKey || undefined,
  baseURL: process.env.TRIGGER_API_URL || "https://api.trigger.dev",
  previewBranch: process.env.TRIGGER_PREVIEW_BRANCH || "",
});

export { tasks, triggerAuth };
