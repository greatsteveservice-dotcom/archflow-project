"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

// ======================== PASSWORD TOGGLE ========================

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordInput({ value, onChange, placeholder = "••••••••", required, minLength }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="af-input"
        required={required}
        minLength={minLength}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 4,
        }}
        tabIndex={-1}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

type Mode = "login" | "register" | "forgot" | "reset" | "confirm";

export default function LoginPage({ inviteHint = false }: { inviteHint?: boolean }) {
  const { signIn, signUp, resetPassword, updatePassword, isRecovery } = useAuth();
  const [mode, setMode] = useState<Mode>(isRecovery ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sent">("idle");

  // Switch to reset mode when recovery token is detected
  if (isRecovery && mode !== "reset") {
    setMode("reset");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    } else if (mode === "register") {
      if (!fullName.trim()) {
        setError("Введите имя");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Пароль должен быть не менее 6 символов");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Пароли не совпадают");
        setLoading(false);
        return;
      }
      const result = await signUp(email, password, fullName);
      if (result.error) {
        setError(result.error);
      } else {
        setMode("confirm");
      }
    } else if (mode === "forgot") {
      if (!email.trim()) {
        setError("Введите email");
        setLoading(false);
        return;
      }
      const result = await resetPassword(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Письмо для сброса пароля отправлено на ваш email");
      }
    } else if (mode === "reset") {
      if (password.length < 6) {
        setError("Пароль должен быть не менее 6 символов");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Пароли не совпадают");
        setLoading(false);
        return;
      }
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Пароль успешно обновлён!");
      }
    }
    setLoading(false);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    await supabase.auth.resend({ type: 'signup', email });
    setResendStatus("sent");
    setTimeout(() => setResendStatus("idle"), 3000);
  };

  const titles: Record<Mode, { heading: string; sub: string }> = {
    login: { heading: "Войти", sub: "Управление дизайн-проектами" },
    register: { heading: "Регистрация", sub: "Создайте аккаунт для работы" },
    forgot: { heading: "Восстановление", sub: "Введите email для сброса пароля" },
    reset: { heading: "Новый пароль", sub: "Придумайте новый пароль" },
    confirm: { heading: "Проверьте почту", sub: "" },
  };

  const buttonLabels: Record<Mode, string> = {
    login: "Войти",
    register: "Зарегистрироваться",
    forgot: "Отправить ссылку",
    reset: "Сохранить пароль",
    confirm: "",
  };

  // Email confirmation screen
  if (mode === "confirm") {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#111', padding: 32 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: '#fff' }}>
            ArchFlow
          </div>
        </div>
        <div style={{ padding: '32px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: '#111', marginBottom: 8 }}>
            Проверьте почту
          </h2>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: '#111', marginBottom: 2 }}>
            Мы отправили письмо на
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-11)', color: '#111', marginBottom: 16 }}>
            {email}
          </p>
          <div style={{
            background: '#F6F6F4', borderLeft: '2px solid #111', padding: '12px 14px',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-8)', color: '#111', lineHeight: 1.7,
          }}>
            Если письмо не пришло — проверьте папку Спам или Промоакции.
          </div>
          <div style={{ marginTop: 20 }}>
            <button
              onClick={handleResend}
              style={{
                border: '0.5px solid #EBEBEB', color: '#111', background: 'none',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-7)',
                textTransform: 'uppercase', letterSpacing: '0.14em',
                padding: '8px 16px', cursor: 'pointer',
              }}
            >
              {resendStatus === 'sent' ? 'Письмо отправлено' : 'Отправить повторно'}
            </button>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-7)', color: '#111' }}>
              Уже подтвердили?{' '}
              <button
                onClick={() => switchMode('login')}
                style={{
                  color: '#111', background: 'none', border: 'none',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-7)',
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                → Войти
              </button>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-[400px] animate-slide-up">
        {/* Logo */}
        <div className="mb-12">
          <img src="/logo.png" width="80" height="80" alt="ArchFlow" style={{ marginBottom: 12 }} />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-9)', color: '#111', letterSpacing: '0.1em', marginTop: 8 }}>
            ОТ ЗАМЫСЛА ДО СДАЧИ ОБЪЕКТА
          </p>
        </div>

        {/* Heading — only for non-login modes */}
        {mode !== 'login' && titles[mode].sub && (
          <div className="mb-8">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#111' }}>
              {titles[mode].heading}
            </h2>
            <p className="af-label mt-1">{titles[mode].sub}</p>
          </div>
        )}

        {/* Invite hint */}
        {inviteHint && (
          <div className="mb-6 p-3" style={{ background: '#F6F6F4', fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-11)', color: '#111' }}>
            Вы получили приглашение в проект. Войдите или зарегистрируйтесь, чтобы принять его.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3" style={{ border: '0.5px solid #111', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 p-3" style={{ background: '#F6F6F4', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full name (register) */}
          {mode === "register" && (
            <div className="mb-4">
              <label className="af-input-label">Полное имя</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Имя Фамилия"
                className="af-input"
                required
              />
            </div>
          )}

          {/* Email */}
          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <div className="mb-4">
              <label className="af-input-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="af-input"
                required
              />
            </div>
          )}

          {/* Password */}
          {(mode === "login" || mode === "register") && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="af-input-label" style={{ marginBottom: 0 }}>Пароль</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="af-crumb"
                    style={{ fontSize: 8 }}
                  >
                    Забыли пароль?
                  </button>
                )}
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {/* Confirm password (register) */}
          {mode === "register" && (
            <div className="mb-4">
              <label className="af-input-label">Подтвердите пароль</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {/* Reset mode passwords */}
          {mode === "reset" && (
            <>
              <div className="mb-4">
                <label className="af-input-label">Новый пароль</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="mb-4">
                <label className="af-input-label">Подтвердите пароль</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="af-btn af-btn-full mt-2"
          >
            {loading ? "Загрузка..." : buttonLabels[mode]}
          </button>
        </form>

        {/* Mode switches */}
        <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid #EBEBEB' }}>
          {mode === "login" && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
              <span style={{ color: '#111' }}>Нет аккаунта? </span>
              <button onClick={() => switchMode("register")} className="af-crumb active" style={{ fontSize: 11 }}>
                Регистрация
              </button>
            </div>
          )}
          {mode === "register" && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
              <span style={{ color: '#111' }}>Уже есть аккаунт? </span>
              <button onClick={() => switchMode("login")} className="af-crumb active" style={{ fontSize: 11 }}>
                Вход
              </button>
            </div>
          )}
          {mode === "forgot" && (
            <button onClick={() => switchMode("login")} className="af-crumb" style={{ fontSize: 11 }}>
              ← Вернуться ко входу
            </button>
          )}
          {mode === "reset" && !success && (
            <button onClick={() => switchMode("login")} className="af-crumb" style={{ fontSize: 11 }}>
              ← Вернуться ко входу
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
