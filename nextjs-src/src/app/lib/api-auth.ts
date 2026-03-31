import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Extract and verify the Supabase JWT from the Authorization header.
 * Returns the authenticated user or a 401 NextResponse.
 *
 * Usage in API routes:
 *   const auth = await requireAuth(req);
 *   if (auth.error) return auth.error;
 *   const userId = auth.user.id;
 */
export async function requireAuth(req: NextRequest): Promise<
  | { user: { id: string; email?: string }; error?: undefined }
  | { user?: undefined; error: NextResponse }
> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      ),
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }

  return { user: { id: user.id, email: user.email } };
}
