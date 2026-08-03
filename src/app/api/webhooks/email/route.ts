/**
 * Legacy email webhook — redirects to the secure Resend inbound handler.
 * The resend/inbound route has full Svix signature verification, tenant isolation,
 * and AI reply generation. This route exists only for backward compatibility.
 */
export { POST } from "@/app/api/webhooks/resend/inbound/route";
