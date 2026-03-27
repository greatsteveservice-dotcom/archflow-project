"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";

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
        setSuccess("Аккаунт создан! Проверьте почту для подтверждения или войдите.");
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
    login: { heading: "Войти", sub: "Управление дизайн-проектами" },
    register: { heading: "Регистрация", sub: "Создайте аккаунт для работы" },
    forgot: { heading: "Восстановление", sub: "Введите email для сброса пароля" },
    reset: { heading: "Новый пароль", sub: "Придумайте новый пароль" },
  };

  const buttonLabels: Record<Mode, string> = {
    login: "Войти",
    register: "Зарегистрироваться",
    forgot: "Отправить ссылку",
    reset: "Сохранить пароль",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-[400px] animate-slide-up">
        {/* Logo */}
        <div className="mb-12">
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: '#111' }}>
            ArchFlow
          </h1>
          <p className="af-label mt-2" style={{ letterSpacing: '0.25em' }}>
            Architecture Workflow Platform
          </p>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#111' }}>
            {titles[mode].heading}
          </h2>
          <p className="af-label mt-1">{titles[mode].sub}</p>
        </div>

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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="af-input"
                required
                minLength={6}
              />
            </div>
          )}

          {/* Confirm password (register) */}
          {mode === "register" && (
            <div className="mb-4">
              <label className="af-input-label">Подтвердите пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="af-input"
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
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="af-input"
                  required
                  minLength={6}
                />
              </div>
              <div className="mb-4">
                <label className="af-input-label">Подтвердите пароль</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="af-input"
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
              <span style={{ color: '#AAA' }}>Нет аккаунта? </span>
              <button onClick={() => switchMode("register")} className="af-crumb active" style={{ fontSize: 11 }}>
                Регистрация
              </button>
            </div>
          )}
          {mode === "register" && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
              <span style={{ color: '#AAA' }}>Уже есть аккаунт? </span>
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
