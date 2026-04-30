"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
  tariffId: string;
  tariffName: string;
  price: number;
  dark?: boolean;
}

export default function CheckoutButton({ tariffId, tariffName, price, dark }: Props) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setError(null);
    if (!openForm) {
      setOpenForm(true);
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Укажите email для чека");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Redirect to login, bounce back to /pricing after
        window.location.href = "/login?redirect=/pricing";
        return;
      }
      const res = await fetch("/api/billing/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: tariffId, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.confirmationUrl) {
        setError(data.error || "Оплата временно недоступна. Напишите на archflow.office@gmail.com");
        setLoading(false);
        return;
      }
      window.location.href = data.confirmationUrl;
    } catch (e: any) {
      setError("Сеть недоступна");
      setLoading(false);
    }
  };

  const btnStyle = {
    fontFamily: "var(--af-landing-body)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    padding: "12px 20px",
    cursor: "pointer",
    border: "1px solid " + (dark ? "#fff" : "#111"),
    background: dark ? "transparent" : "#111",
    color: dark ? "#fff" : "#fff",
    width: "100%",
    textAlign: "center" as const,
    transition: "background 0.15s, color 0.15s",
  };

  const inputStyle = {
    fontFamily: "var(--af-landing-body)",
    fontSize: 14,
    padding: "10px 12px",
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid " + (dark ? "#fff" : "#111"),
    background: dark ? "#111" : "#fff",
    color: dark ? "#fff" : "#111",
    marginBottom: 8,
  };

  if (!openForm) {
    return (
      <button onClick={handlePay} style={btnStyle}>
        Оплатить {price.toLocaleString("ru-RU")} ₽ →
      </button>
    );
  }

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email для чека"
        style={inputStyle}
        disabled={loading}
        autoFocus
      />
      <button onClick={handlePay} style={btnStyle} disabled={loading}>
        {loading ? "Переход к оплате…" : `К оплате — ${tariffName}`}
      </button>
      {error && (
        <div
          style={{
            fontFamily: "var(--af-landing-body)",
            fontSize: 11,
            color: dark ? "#fff" : "#111",
            marginTop: 10,
            padding: "8px 10px",
            background: dark ? "#333" : "#EBEBEB",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
