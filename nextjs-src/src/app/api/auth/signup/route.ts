import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "../../../lib/mailer";

/**
 * Server-side signup route.
 * Uses the service_role key to create a user with auto-confirmed email.
 * Sends a welcome email with login credentials.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, role } = body;

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

    // Update profile with role if specified
    if (data.user && (role || full_name)) {
      await supabaseAdmin
        .from("profiles")
        .update({
          ...(full_name && { full_name }),
          ...(role && { role }),
        })
        .eq("id", data.user.id);
    }

    // Send welcome email with credentials (non-blocking)
    const userName = full_name || email.split("@")[0];
    sendWelcomeEmail(email, userName, password).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

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
