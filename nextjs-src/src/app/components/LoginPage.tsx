"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Icons } from "./Icons";

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #111827 0%, #1F2937 50%, #374151 100%)' }}>
      <div className="w-full max-w-[400px] animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
              <Icons.Layers className="w-5 h-5 text-[#111827]" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Archflow</span>
          </div>
          <p className="text-sm text-white/40">Architecture Workflow Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold mb-1">
            {mode === "login" ? "Войти" : "Регистрация"}
          </h2>
          <p className="text-[13px] text-[#9CA3AF] mb-6">
            {mode === "login"
              ? "Войдите чтобы управлять проектами"
              : "Создайте аккаунт для работы с проектами"}
          </p>

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
            {mode === "register" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                  Полное имя
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Алиса Флоренс"
                  className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-[9px] text-[13px] outline-none transition-colors focus:border-[#111827]"
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alisa@florence-design.ru"
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-[9px] text-[13px] outline-none transition-colors focus:border-[#111827]"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-[9px] text-[13px] outline-none transition-colors focus:border-[#111827]"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-sm"
            >
              {loading
                ? "Загрузка..."
                : mode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#F3F4F6] text-center">
            <span className="text-[13px] text-[#9CA3AF]">
              {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            </span>
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setSuccess("");
              }}
              className="text-[13px] text-[#111827] font-medium hover:underline"
            >
              {mode === "login" ? "Регистрация" : "Вход"}
            </button>
          </div>

          {/* Demo credentials hint */}
          {mode === "login" && (
            <div className="mt-4 bg-[#F9FAFB] rounded-lg px-4 py-3">
              <div className="text-[11px] text-[#9CA3AF] mb-1">Демо-доступ:</div>
              <div className="text-[12px] text-[#6B7280] font-mono-custom">
                alisa@florence-design.ru / demo1234
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
