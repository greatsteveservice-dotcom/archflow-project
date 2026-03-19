"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      }
    } else {
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
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold tracking-[5px] text-[#1A1F1A]">ЖАН</h1>
          <p className="text-[13px] text-[#9B9B9B] tracking-wide mt-1">
            журнал авторского надзора
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E8E6E1] rounded-2xl p-7 shadow-lg">
          <h2 className="text-lg font-semibold mb-1">
            {mode === "login" ? "Вход в систему" : "Регистрация"}
          </h2>
          <p className="text-[13px] text-[#9B9B9B] mb-6">
            {mode === "login"
              ? "Войдите чтобы управлять проектами"
              : "Создайте аккаунт для работы с проектами"}
          </p>

          {error && (
            <div className="bg-[#FEF0EC] border border-[#E85D3A]/20 text-[#E85D3A] text-[13px] px-4 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-[#EAFAF1] border border-[#2A9D5C]/20 text-[#2A9D5C] text-[13px] px-4 py-2.5 rounded-lg mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
                  Полное имя
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Алиса Флоренс"
                  className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-lg text-sm outline-none transition-colors focus:border-[#2C5F2D]"
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alisa@florence-design.ru"
                className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-lg text-sm outline-none transition-colors focus:border-[#2C5F2D]"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-[#E8E6E1] rounded-lg text-sm outline-none transition-colors focus:border-[#2C5F2D]"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#2C5F2D] text-white hover:bg-[#1E4620] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Подождите..."
                : mode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#F0EEE9] text-center">
            <span className="text-[13px] text-[#9B9B9B]">
              {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            </span>
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setSuccess("");
              }}
              className="text-[13px] text-[#2C5F2D] font-medium hover:underline"
            >
              {mode === "login" ? "Регистрация" : "Вход"}
            </button>
          </div>

          {/* Demo credentials hint */}
          {mode === "login" && (
            <div className="mt-4 bg-[#F7F6F3] rounded-lg px-4 py-3">
              <div className="text-[11px] text-[#9B9B9B] mb-1">Демо-доступ:</div>
              <div className="text-[12px] text-[#6B6B6B] font-mono">
                alisa@florence-design.ru / demo1234
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
