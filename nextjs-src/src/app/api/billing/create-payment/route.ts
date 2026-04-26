import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Plan {
  price: number;
  days: number;
  description: string;
}

const PLANS: Record<string, Plan> = {
  month: { price: 1500, days: 30, description: "Archflow · подписка на 1 месяц" },
  halfyear: { price: 6000, days: 180, description: "Archflow · подписка на 6 месяцев" },
  year: { price: 10000, days: 365, description: "Archflow · подписка на 1 год" },
};

function genIdempotenceKey(): string {
  return `ak_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: NextRequest) {
  const { plan, email } = await req.json().catch(() => ({} as any));
  const planData = PLANS[plan as string];
  if (!planData) {
    return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
  }

  // Auth: attach userId from the caller's session so webhook can bind payment → user
  let userId: string | null = null;
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (accessToken) {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
    );
    const { data: { user } } = await anon.auth.getUser();
    userId = user?.id || null;
  }
  if (!userId) {
    return NextResponse.json(
      { error: "Для оплаты требуется войти в аккаунт" },
      { status: 401 },
    );
  }

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    return NextResponse.json(
      {
        error:
          "Оплата временно недоступна — подключение к ЮKassa в процессе. Напишите на archflow.office@gmail.com.",
      },
      { status: 503 }
    );
  }

  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  const origin = req.headers.get("origin") || "https://archflow.ru";

  try {
    const ykRes = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "Idempotence-Key": genIdempotenceKey(),
      },
      body: JSON.stringify({
        amount: { value: planData.price.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: `${origin}/billing/success?plan=${plan}`,
        },
        description: planData.description,
        metadata: {
          plan,
          userId,
          email: email || "",
        },
        receipt: email
          ? {
              customer: { email },
              items: [
                {
                  description: planData.description,
                  quantity: "1.00",
                  amount: { value: planData.price.toFixed(2), currency: "RUB" },
                  vat_code: 1,
                  payment_mode: "full_payment",
                  payment_subject: "service",
                },
              ],
            }
          : undefined,
      }),
    });

    const payment = await ykRes.json();
    if (!ykRes.ok) {
      return NextResponse.json(
        { error: payment.description || "Ошибка ЮKassa" },
        { status: 502 }
      );
    }

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      return NextResponse.json({ error: "ЮKassa не вернула URL оплаты" }, { status: 502 });
    }

    return NextResponse.json({ confirmationUrl, paymentId: payment.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
