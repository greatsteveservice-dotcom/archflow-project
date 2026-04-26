"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useSubscription, type Plan } from "../lib/useSubscription";
import { supabase } from "../lib/supabase";

type Screen = "main" | "billing" | "settings" | "profile";

interface Props {
  initialScreen?: Screen;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  designer: "Дизайнер",
  client: "Заказчик",
  contractor: "Подрядчик",
  supplier: "Комплектатор",
  assistant: "Ассистент",
};

const PLAN_LABEL: Record<Plan, string> = {
  trial: "Триал",
  month: "1 месяц",
  halfyear: "6 месяцев",
  year: "1 год",
};

const PLANS: { id: Exclude<Plan, "trial">; name: string; price: number; subtitle: string }[] = [
  { id: "month", name: "1 месяц", price: 1500, subtitle: "1 500 ₽" },
  { id: "halfyear", name: "6 месяцев", price: 6000, subtitle: "1 000 ₽/мес" },
  { id: "year", name: "12 месяцев", price: 10000, subtitle: "833 ₽/мес" },
];

export default function ProfileCabinet({ initialScreen = "main", onClose }: Props) {
  const { profile, user, signOut } = useAuth();
  const { subscription, loading } = useSubscription();
  const [screen, setScreen] = useState<Screen>(initialScreen);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!profile || !user) return null;

  const initials = (profile.full_name || "A")
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 520,
          height: "88dvh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--af-font)",
          color: "#111",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "0.5px solid #EBEBEB",
          flexShrink: 0,
        }}>
          {screen === "main" ? (
            <span style={{
              fontFamily: "var(--af-font-mono)", fontSize: 10,
              letterSpacing: "0.14em", textTransform: "uppercase", color: "#646464",
            }}>
              Кабинет
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setScreen("main")}
              style={{
                fontFamily: "var(--af-font-mono)", fontSize: 10,
                letterSpacing: "0.14em", textTransform: "uppercase", color: "#111",
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              ← Назад
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 32, height: 32, border: "0.5px solid #EBEBEB",
              background: "transparent", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>

        <div style={{
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          flex: 1,
          minHeight: 0,
          padding: "20px 18px",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
        }}>
          {screen === "main" && (
            <MainScreen
              initials={initials}
              profile={profile}
              user={user}
              subscription={subscription}
              loading={loading}
              onOpen={setScreen}
              signOut={signOut}
            />
          )}
          {screen === "billing" && <BillingScreen />}
          {screen === "settings" && <SettingsScreen userId={user.id} />}
          {screen === "profile" && <ProfileScreen profile={profile} user={user} />}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────

function MainScreen({
  initials, profile, user, subscription, loading, onOpen, signOut,
}: {
  initials: string;
  profile: any;
  user: any;
  subscription: ReturnType<typeof useSubscription>["subscription"];
  loading: boolean;
  onOpen: (s: Screen) => void;
  signOut: () => Promise<void>;
}) {
  const roleLabel = ROLE_LABEL[profile.role] || profile.role;

  return (
    <div>
      {/* Header block: avatar + name */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52, background: "#111",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "var(--af-font)", fontSize: 18, fontWeight: 700,
            color: "#F6F6F4", letterSpacing: "0.04em",
          }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--af-font-display)", fontSize: 20,
            fontWeight: 900, lineHeight: 1.1, marginBottom: 4,
          }}>
            {profile.full_name || "Без имени"}
          </div>
          <div style={{ fontSize: 12, color: "#646464", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </div>
          <div style={{
            fontFamily: "var(--af-font-mono)", fontSize: 9,
            letterSpacing: "0.12em", textTransform: "uppercase",
            marginTop: 6, color: "#111",
            display: "inline-block", padding: "2px 6px", border: "0.5px solid #EBEBEB",
          }}>
            {roleLabel}
          </div>
        </div>
      </div>

      {/* Subscription banner */}
      {subscription?.isDesigner && !loading && (
        <SubscriptionBanner subscription={subscription} onOpen={() => onOpen("billing")} />
      )}

      {/* Menu */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
        {subscription?.isDesigner && (
          <MenuRow
            label="Тарифы"
            sub={subscription ? PLAN_LABEL[subscription.plan] : ""}
            onClick={() => onOpen("billing")}
          />
        )}
        <MenuRow label="Настройки" onClick={() => onOpen("settings")} />
        <MenuRow label="Профиль" onClick={() => onOpen("profile")} />
        <MenuRow label="Политика конфиденциальности" onClick={() => window.open("/privacy", "_blank")} />
        <MenuRow label="Помощь" onClick={() => window.location.href = "mailto:archflow.office@gmail.com"} />
      </div>

      <button
        onClick={async () => { await signOut(); }}
        style={{
          marginTop: 20, width: "100%",
          fontFamily: "var(--af-font-mono)", fontSize: 11,
          fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
          padding: "12px 16px", background: "transparent",
          border: "0.5px solid #EBEBEB", color: "#111", cursor: "pointer",
        }}
      >
        Выйти
      </button>
    </div>
  );
}

function MenuRow({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", background: "#F6F6F4",
        border: "none", cursor: "pointer", textAlign: "left",
        fontFamily: "var(--af-font)", fontSize: 14, color: "#111",
      }}
    >
      <span>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#646464", fontSize: 11 }}>
        {sub && <span style={{
          fontFamily: "var(--af-font-mono)", textTransform: "uppercase",
          letterSpacing: "0.08em", fontSize: 9,
        }}>{sub}</span>}
        <span style={{ fontSize: 16 }}>→</span>
      </span>
    </button>
  );
}

function SubscriptionBanner({
  subscription, onOpen,
}: {
  subscription: NonNullable<ReturnType<typeof useSubscription>["subscription"]>;
  onOpen: () => void;
}) {
  const usedDays = Math.max(0, subscription.totalDays - subscription.daysLeft);
  const progressPct = Math.min(100, Math.round((usedDays / subscription.totalDays) * 100));
  const statusLabel =
    subscription.status === "expired" ? "Подписка истекла"
      : subscription.status === "trial" ? "Пробный период"
      : `Подписка · ${PLAN_LABEL[subscription.plan]}`;
  const daysLabel =
    subscription.status === "expired" ? "Продлите подписку"
      : `Осталось ${subscription.daysLeft} дн.`;

  return (
    <div
      onClick={onOpen}
      style={{
        background: "#111", color: "#fff",
        padding: "16px 18px", cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 6,
      }}
    >
      <div style={{
        fontFamily: "var(--af-font-mono)", fontSize: 9,
        letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb",
      }}>
        {statusLabel}
      </div>
      <div style={{
        fontFamily: "var(--af-font-display)", fontSize: 17,
        fontWeight: 700, lineHeight: 1.15,
      }}>
        {daysLabel}
      </div>
      <div style={{ height: 2, background: "#333", marginTop: 8 }}>
        <div style={{
          height: "100%", background: "#F6F6F4",
          width: `${progressPct}%`, transition: "width 0.3s",
        }} />
      </div>
    </div>
  );
}

// ── Billing screen ───────────────────────────────────

function BillingScreen() {
  const { subscription } = useSubscription();
  const [selected, setSelected] = useState<Exclude<Plan, "trial">>("halfyear");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Сессия истекла, войдите заново");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/billing/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: selected, email: session.user.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.confirmationUrl) {
        setError(data.error || "Ошибка создания платежа");
        setLoading(false);
        return;
      }
      window.location.href = data.confirmationUrl;
    } catch (e: any) {
      setError(e?.message || "Сеть недоступна");
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{
        fontFamily: "var(--af-font-display)", fontSize: 22,
        fontWeight: 900, marginTop: 0, marginBottom: 8,
      }}>
        Тарифы
      </h2>
      {subscription?.isDesigner && (
        <div style={{ marginBottom: 18, fontSize: 12, color: "#646464" }}>
          Текущий план: <b>{PLAN_LABEL[subscription.plan]}</b> · истекает{" "}
          {new Date(subscription.expires_at).toLocaleDateString("ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric",
          })}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
        {PLANS.map((p) => {
          const isSel = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px",
                background: isSel ? "#111" : "#F6F6F4",
                color: isSel ? "#fff" : "#111",
                border: "none", cursor: "pointer", textAlign: "left",
                fontFamily: "var(--af-font)",
              }}
            >
              <div>
                <div style={{
                  fontFamily: "var(--af-font-display)", fontSize: 15,
                  fontWeight: 700, lineHeight: 1.1, marginBottom: 2,
                }}>
                  {p.name}
                </div>
                <div style={{
                  fontFamily: "var(--af-font-mono)", fontSize: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: isSel ? "#bbb" : "#646464",
                }}>
                  {p.subtitle}
                </div>
              </div>
              <div style={{
                fontFamily: "var(--af-font-display)", fontSize: 20,
                fontWeight: 900,
              }}>
                {p.price.toLocaleString("ru-RU")} ₽
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        style={{
          width: "100%",
          fontFamily: "var(--af-font-mono)", fontSize: 11,
          fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
          padding: "14px 16px",
          background: "#111", color: "#fff", border: "1px solid #111",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Переход к оплате…" : "Оформить подписку →"}
      </button>
      {error && (
        <div style={{
          marginTop: 10, padding: "8px 10px", background: "#F6F6F4",
          fontFamily: "var(--af-font-mono)", fontSize: 11, color: "#111",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ── Settings screen ──────────────────────────────────

const MODULE_LABELS: { key: string; label: string; desc: string }[] = [
  { key: "design", label: "Дизайн", desc: "Файлы проекта, папки, категории" },
  { key: "supervision", label: "Авторский надзор", desc: "Визиты, отчёты, замечания" },
  { key: "supply", label: "Комплектация", desc: "Спецификации, поставщики" },
  { key: "chat", label: "Чат", desc: "Обсуждение с клиентом и подрядчиком" },
  { key: "assistant", label: "Ассистент", desc: "AI-помощник дизайнера" },
];

function SettingsScreen({ userId }: { userId: string }) {
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("user_module_settings")
      .select("modules")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setModules((data?.modules as Record<string, boolean>) || {
          design: true, supervision: true, supply: true, chat: true, assistant: true,
        });
        setLoading(false);
      });
  }, [userId]);

  const toggle = async (key: string) => {
    const next = { ...modules, [key]: !modules[key] };
    setModules(next);
    setSaving(true);
    await supabase.from("user_module_settings").upsert({
      user_id: userId,
      modules: next,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
  };

  if (loading) {
    return <div style={{ color: "#646464", fontSize: 12 }}>Загрузка…</div>;
  }

  return (
    <div>
      <h2 style={{
        fontFamily: "var(--af-font-display)", fontSize: 22,
        fontWeight: 900, marginTop: 0, marginBottom: 8,
      }}>
        Настройки
      </h2>
      <p style={{ fontSize: 13, color: "#646464", marginTop: 0, marginBottom: 20 }}>
        Отключите модули, которыми не пользуетесь — они исчезнут из интерфейса.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {MODULE_LABELS.map((m) => {
          const isOn = !!modules[m.key];
          return (
            <div
              key={m.key}
              onClick={() => toggle(m.key)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", background: "#F6F6F4",
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "var(--af-font-display)", fontSize: 14,
                  fontWeight: 700, marginBottom: 2,
                }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 11, color: "#646464" }}>{m.desc}</div>
              </div>
              <div style={{
                width: 36, height: 20, background: isOn ? "#111" : "#EBEBEB",
                position: "relative", flexShrink: 0,
              }}>
                <div style={{
                  width: 16, height: 16, position: "absolute", top: 2,
                  background: isOn ? "#F6F6F4" : "#AAAAAA",
                  right: isOn ? 2 : "auto", left: isOn ? "auto" : 2,
                  transition: "all 0.15s",
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {saving && (
        <div style={{ marginTop: 12, fontSize: 11, color: "#646464" }}>Сохраняю…</div>
      )}
    </div>
  );
}

// ── Profile screen ───────────────────────────────────

function ProfileScreen({ profile, user }: { profile: any; user: any }) {
  return (
    <div>
      <h2 style={{
        fontFamily: "var(--af-font-display)", fontSize: 22,
        fontWeight: 900, marginTop: 0, marginBottom: 20,
      }}>
        Профиль
      </h2>

      <Field label="Имя" value={profile.full_name || "—"} />
      <Field label="Email" value={user.email} />
      <Field label="Роль" value={ROLE_LABEL[profile.role] || profile.role} />
      <Field
        label="Дата регистрации"
        value={new Date(profile.created_at || user.created_at).toLocaleDateString("ru-RU", {
          day: "2-digit", month: "long", year: "numeric",
        })}
      />

      <div style={{ marginTop: 20, fontSize: 11, color: "#646464" }}>
        Для изменения данных напишите на{" "}
        <a href="mailto:archflow.office@gmail.com" style={{ color: "#111" }}>
          archflow.office@gmail.com
        </a>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "14px 0", borderBottom: "0.5px solid #EBEBEB",
    }}>
      <div style={{
        fontFamily: "var(--af-font-mono)", fontSize: 9,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: "#646464", marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "#111" }}>{value}</div>
    </div>
  );
}
