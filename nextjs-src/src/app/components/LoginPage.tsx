"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Icons, ArchflowLogo } from "./Icons";

type Mode = "login" | "register" | "forgot" | "reset";

export default function LoginPage() {
  const { signIn, signUp, resetPassword, updatePassword, isRecovery } = useAuth();
  const [mode, setMode] = useState<Mode>(isRecovery ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

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
      const result = await signUp(email, password, fullName);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Аккаунт создан! Вы можете войти.");
        setMode("login");
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
        // The auth state will automatically log them in
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

  const titles: Record<Mode, { heading: string; sub: string }> = {
    login: { heading: "Войти", sub: "Войдите чтобы управлять проектами" },
    register: { heading: "Регистрация", sub: "Создайте аккаунт для работы с проектами" },
    forgot: { heading: "Восстановление пароля", sub: "Введите email для получения ссылки сброса" },
    reset: { heading: "Новый пароль", sub: "Придумайте новый пароль для вашего аккаунта" },
  };

  const buttonLabels: Record<Mode, string> = {
    login: "Войти",
    register: "Зарегистрироваться",
    forgot: "Отправить ссылку",
    reset: "Сохранить пароль",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #111827 0%, #1F2937 50%, #374151 100%)' }}>
      <div className="w-full max-w-[400px] animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <ArchflowLogo className="w-9 h-9" />
            <span className="text-2xl font-bold text-white tracking-tight">Archflow</span>
          </div>
          <p className="text-sm text-white/40">Architecture Workflow Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold mb-1">{titles[mode].heading}</h2>
          <p className="text-[13px] text-ink-faint mb-6">{titles[mode].sub}</p>

          {error && (
            <div className="text-[13px] text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="text-[13px] text-emerald-600 mb-4 p-3 bg-emerald-50 rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full name (register only) */}
            {mode === "register" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-ink-muted mb-1.5">Полное имя</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Алиса Флоренс"
                  className="w-full px-3 py-2.5 border border-line rounded-[9px] text-[13px] outline-none transition-colors focus:border-ink"
                  required
                />
              </div>
            )}

            {/* Email (login, register, forgot) */}
            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-ink-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2.5 border border-line rounded-[9px] text-[13px] outline-none transition-colors focus:border-ink"
                  required
                />
              </div>
            )}

            {/* Password (login, register) */}
            {(mode === "login" || mode === "register") && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-ink-muted">Пароль</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-[11px] text-ink-faint hover:text-ink transition-colors"
                    >
                      Забыли пароль?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-line rounded-[9px] text-[13px] outline-none transition-colors focus:border-ink"
                  required
                  minLength={6}
                />
              </div>
            )}

            {/* New password (reset mode) */}
            {mode === "reset" && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">Новый пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 border border-line rounded-[9px] text-[13px] outline-none transition-colors focus:border-ink"
                    required
                    minLength={6}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 border border-line rounded-[9px] text-[13px] outline-none transition-colors focus:border-ink"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-sm"
            >
              {loading ? "Загрузка..." : buttonLabels[mode]}
            </button>
          </form>

          {/* Mode switches */}
          <div className="mt-5 pt-4 border-t border-line-light text-center">
            {mode === "login" && (
              <>
                <span className="text-[13px] text-ink-faint">Нет аккаунта? </span>
                <button onClick={() => switchMode("register")} className="text-[13px] text-ink font-medium hover:underline">
                  Регистрация
                </button>
              </>
            )}
            {mode === "register" && (
              <>
                <span className="text-[13px] text-ink-faint">Уже есть аккаунт? </span>
                <button onClick={() => switchMode("login")} className="text-[13px] text-ink font-medium hover:underline">
                  Вход
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button onClick={() => switchMode("login")} className="text-[13px] text-ink font-medium hover:underline">
                ← Вернуться ко входу
              </button>
            )}
            {mode === "reset" && !success && (
              <button onClick={() => switchMode("login")} className="text-[13px] text-ink font-medium hover:underline">
                ← Вернуться ко входу
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
