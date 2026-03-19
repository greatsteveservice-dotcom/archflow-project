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
});

export const useAuth = () => useContext(AuthContext);

// ======================== PROVIDER ========================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
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

  // Sign up with email/password
  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "designer",
        },
      },
    });
    if (error) {
      return { error: translateAuthError(error.message) };
    }
    return { error: null };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut }}>
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
