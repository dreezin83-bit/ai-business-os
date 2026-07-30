/**
 * Super Admin auth check.
 * Verifies the current Clerk user has `role: 'admin'` in public metadata.
 */
import { auth } from "@clerk/nextjs/server";

export async function requireAdmin(): Promise<{ userId: string } | null> {
  const session = await auth();
  if (!session.userId) return null;

  // Check Clerk public metadata for admin role
  // Owner sets this manually in Clerk Dashboard: public_metadata: { role: "admin" }
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(session.userId);
    const metadata = user.publicMetadata as Record<string, unknown>;
    if (metadata.role === "admin") {
      return { userId: session.userId };
    }
  } catch {
    // Fallback: check session claims if Clerk client fetch fails
    const sessionClaims = (session as any).sessionClaims;
    if (sessionClaims?.publicMetadata?.role === "admin" || sessionClaims?.metadata?.role === "admin") {
      return { userId: session.userId };
    }
  }

  return null;
}
