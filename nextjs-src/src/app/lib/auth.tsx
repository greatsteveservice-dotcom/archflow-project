"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "./types";

// ======================== TYPES ========================

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  isRecovery: boolean;
}

// ======================== CONTEXT ========================

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  refreshProfile: async () => {},
  isRecovery: false,
});

export const useAuth = () => useContext(AuthContext);

// ======================== PROVIDER ========================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  // Fetch profile from profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      // Handle token refresh failure — force re-login
      if (event === 'TOKEN_REFRESHED' && !session) {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      // Handle password recovery event
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: translateAuthError(error.message) };
    }
    return { error: null };
  };

  // Sign up via server-side API route
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, role: "designer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Ошибка регистрации" };
      }
      // If email confirmation is required, don't auto-login
      if (data.requiresEmailConfirmation) {
        return { error: null };
      }
      // Auto sign-in after successful registration (auto-confirm mode)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        return { error: "Аккаунт создан, но не удалось войти. Попробуйте войти вручную." };
      }
      return { error: null };
    } catch {
      return { error: "Ошибка сети. Проверьте подключение." };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsRecovery(false);
  };

  // Request password reset
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    if (error) {
      return { error: translateAuthError(error.message) };
    }
    return { error: null };
  };

  // Refresh profile data from DB
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Update password (after recovery or in profile)
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: translateAuthError(error.message) };
    }
    setIsRecovery(false);
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile, isRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

// ======================== HELPERS ========================

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Неверный email или пароль";
  }
  if (message.includes("Email not confirmed")) {
    return "Email не подтверждён";
  }
  if (message.includes("User already registered")) {
    return "Пользователь с таким email уже зарегистрирован";
  }
  if (message.includes("Password should be at least")) {
    return "Пароль должен быть не менее 6 символов";
  }
  return message;
}
