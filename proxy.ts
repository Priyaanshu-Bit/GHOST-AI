import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

const hasClerkKeys = Boolean(
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY) &&
  process.env.CLERK_SECRET_KEY
);

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";

const isPublicRoute = createRouteMatcher([
  `${signInUrl}(.*)`,
  `${signUpUrl}(.*)`,
  "/showcase(.*)",
]);

const clerkHandler = hasClerkKeys
  ? clerkMiddleware(async (auth, req) => {
      // Page routes redirect unauthenticated users to sign-in;
      // API routes handle their own auth returning standard 401/403 JSON responses.
      const { pathname } = req.nextUrl;
      if (!isPublicRoute(req) && pathname !== "/api" && !pathname.startsWith("/api/")) {
        await auth.protect();
      }
    })
  : null;

export default async function proxy(req: NextRequest, evt: NextFetchEvent) {
  if (!clerkHandler) {
    return NextResponse.next();
  }
  return clerkHandler(req, evt);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

