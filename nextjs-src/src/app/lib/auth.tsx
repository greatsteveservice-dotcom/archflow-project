"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "./types";
import { metrikaSetUser } from "./metrika";
import { installErrorReporter, setErrorReporterUser } from "./error-reporter";

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
      return;
    }

    // JWT/auth error — try refreshing the session before giving up
    if (error && (error.code === 'PGRST301' || error.message?.includes('Invalid authentication') || error.message?.includes('JWT'))) {
      console.warn('Auth token issue, attempting refresh:', error.message);
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

      if (!refreshError && refreshed.session) {
        // Retry profile fetch with the new token
        const { data: retryData, error: retryError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (!retryError && retryData) {
          setSession(refreshed.session);
          setUser(refreshed.session.user);
          setProfile(retryData as Profile);
          return;
        }
      }

      // Refresh failed or retry failed — force re-login
      console.warn('Token refresh failed, signing out');
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  // Install global error reporter (once)
  useEffect(() => { installErrorReporter(); }, []);

  // Activity heartbeat — extends or creates user_session every 60s while tab is visible.
  // Used for "time in service" analytics.
  useEffect(() => {
    if (!session?.access_token) return;
    const token = session.access_token;
    let stopped = false;
    const ping = () => {
      if (stopped || typeof document === 'undefined' || document.hidden) return;
      fetch('/api/activity/ping', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      }).catch(() => {});
    };
    ping();
    const iv = setInterval(ping, 60_000);
    const onVis = () => { if (!document.hidden) ping(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopped = true;
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [session?.access_token]);

  // Initialize auth state
  useEffect(() => {
    // Get current session — validate it's still usable
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session) {
        // No session or error — try refreshing before giving up
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session) {
          setSession(refreshed.session);
          setUser(refreshed.session.user);
          fetchProfile(refreshed.session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
        return;
      }

      // Check if the JWT is expired (access_token exp < now)
      try {
        const parts = session.access_token.split('.');
        if (parts.length !== 3 || !parts[1]) throw new Error('Malformed JWT');
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token expired — try refreshing
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshed.session) {
            console.warn('Session expired, refresh failed — signing out');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          setSession(refreshed.session);
          setUser(refreshed.session.user);
          fetchProfile(refreshed.session.user.id);
          setLoading(false);
          return;
        }
      } catch {
        // Malformed token — try refresh
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session) {
          setSession(refreshed.session);
          setUser(refreshed.session.user);
          fetchProfile(refreshed.session.user.id);
        } else {
          console.warn('Malformed JWT, refresh failed — signing out');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session.user);
      fetchProfile(session.user.id);
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
        metrikaSetUser(session.user.id);
        setErrorReporterUser(session.user.id);
      } else {
        setProfile(null);
      }
      // Handle token refresh failure — force re-login
      if (event === 'TOKEN_REFRESHED' && !session) {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      // Handle sign out
      if (event === 'SIGNED_OUT') {
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
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: translateAuthError(error.message) };
      }
      return { error: null };
    } catch {
      return { error: "Ошибка сети. Проверьте подключение и попробуйте снова." };
    }
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
      // Account created successfully. Try auto-login but don't fail if it doesn't work.
      // The user will see the confirm screen either way.
      try {
        await supabase.auth.signInWithPassword({ email, password });
      } catch {
        // Network error on auto-login — account was still created, show confirm screen
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
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid authentication credentials") || lower.includes("invalid credentials")) {
    return "Неверный email или пароль";
  }
  if (lower.includes("email not confirmed")) {
    return "Email не подтверждён";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "Пользователь с таким email уже зарегистрирован";
  }
  if (lower.includes("password should be at least") || lower.includes("password is too short")) {
    return "Пароль должен быть не менее 6 символов";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Слишком много попыток. Подождите минуту и попробуйте снова.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Ошибка сети. Проверьте подключение и попробуйте снова.";
  }
  return message;
}
