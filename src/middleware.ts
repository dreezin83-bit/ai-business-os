import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that require authentication. Signed-out visitors are redirected
// to /sign-in instead of rendering the app shell / error boundary.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(
  (auth, req) => {
    if (isProtectedRoute(req)) {
      auth.protect();
    }
  },
  { signInUrl: "/sign-in" }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
