import { Liveblocks } from "@liveblocks/node";

/**
 * Fixed high-contrast cursor color palette for collaborative presence.
 * Selected for optimal visibility and clarity on the dark technical workspace canvas.
 */
export const USER_CURSOR_COLORS = [
  "#00C8D4", // Brand Cyan
  "#6457F9", // AI Accent Indigo
  "#52A8FF", // Vivid Blue
  "#BF7AF0", // Light Purple
  "#FF990A", // Bright Orange
  "#FF6166", // Coral Red
  "#F75F8F", // Rose Pink
  "#62C073", // Fresh Green
  "#0AC7B4", // Electric Teal
  "#FBBF24", // Warning Amber
] as const;

/**
 * Deterministically maps a user ID to a consistent cursor color from the palette.
 * Ensures that a user always receives the exact same cursor color across all sessions.
 */
export function getUserColor(userId: string): string {
  if (!userId) {
    return USER_CURSOR_COLORS[0];
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % USER_CURSOR_COLORS.length;
  return USER_CURSOR_COLORS[index];
}

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined;
};

const secretKey =
  process.env.LIVEBLOCKS_SECRET_KEY &&
  process.env.LIVEBLOCKS_SECRET_KEY.startsWith("sk_")
    ? process.env.LIVEBLOCKS_SECRET_KEY
    : "sk_dev_placeholder_key";

/**
 * Cached singleton Liveblocks Node client.
 * Reuses the existing client instance in development across HMR reloads.
 */
export const liveblocks =
  globalForLiveblocks.liveblocks ??
  new Liveblocks({
    secret: secretKey,
  });

if (process.env.NODE_ENV !== "production") {
  globalForLiveblocks.liveblocks = liveblocks;
}
