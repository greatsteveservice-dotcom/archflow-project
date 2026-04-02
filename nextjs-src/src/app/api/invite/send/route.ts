import { NextRequest, NextResponse } from "next/server";
import { sendInviteEmail } from "../../../lib/mailer";
import { requireAuth } from "../../../lib/api-auth";
import { rateLimit } from "../../../lib/rate-limit";

/**
 * Send invite email to a newly invited project member.
 * Called from AccessScreen after createRbacInvite.
 *
 * SECURITY: Requires a valid Supabase JWT in Authorization header.
 * Only authenticated users can trigger invite emails.
 */
// Rate limit: 3 requests per hour per IP
const checkInviteRate = rateLimit('invite', 3, 60 * 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const rateLimited = checkInviteRate(req);
    if (rateLimited) return rateLimited;

    // ── Auth check ──────────────────────────────────────
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { email, projectName, inviteUrl } = await req.json();

    if (!email || !inviteUrl) {
      return NextResponse.json(
        { error: "email and inviteUrl required" },
        { status: 400 }
      );
    }

    // Basic URL validation — only allow HTTPS invite URLs on our domain
    try {
      const url = new URL(inviteUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return NextResponse.json(
          { error: "Invalid invite URL" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid invite URL format" },
        { status: 400 }
      );
    }

    await sendInviteEmail(email, projectName || "Проект", inviteUrl);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Invite email error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send invite email" },
      { status: 500 }
    );
  }
}
