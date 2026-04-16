import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "../../../lib/mailer";
import { rateLimit } from "../../../lib/rate-limit";

/**
 * Server-side signup route.
 * Uses the service_role key to create a user with auto-confirmed email.
 * Sends a welcome email (no credentials for security).
 *
 * SECURITY: role is hardcoded to 'designer' — never accepted from the client.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Rate limit: 5 requests per minute per IP
const checkSignupRate = rateLimit('signup', 5, 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const rateLimited = checkSignupRate(req);
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const { email, password, full_name } = body;
    // NOTE: `role` is intentionally NOT destructured from body.
    // It is always hardcoded below to prevent privilege escalation.

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен быть не менее 6 символов" },
        { status: 400 }
      );
    }

    // Create admin client with service_role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user with auto-confirmed email
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split("@")[0],
      },
    });

    if (error) {
      // Handle duplicate email
      if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
        return NextResponse.json(
          { error: "Пользователь с таким email уже зарегистрирован" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update profile: role is ALWAYS 'designer', never from client input.
    // User implicitly accepts the privacy policy by submitting the signup form
    // (the checkbox is enforced client-side). Record the timestamp here.
    if (data.user) {
      const userName = full_name || email.split("@")[0];
      // Try full update incl. privacy_accepted_at; fall back without it
      // if the column has not been migrated yet on this environment.
      const nowIso = new Date().toISOString();
      const { error: fullUpdateErr } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: userName,
          role: "designer",  // ← hardcoded, never from request body
          privacy_accepted_at: nowIso,
        })
        .eq("id", data.user.id);
      if (fullUpdateErr) {
        // Column missing — fall back to legacy update
        await supabaseAdmin
          .from("profiles")
          .update({ full_name: userName, role: "designer" })
          .eq("id", data.user.id);
      }
    }

    // Send welcome email (must await — Netlify kills function after return)
    const userName = full_name || email.split("@")[0];
    try {
      await sendWelcomeEmail(email, userName);
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr);
      // Don't fail signup if email fails — user is already created
    }

    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
      message: "Аккаунт создан",
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
