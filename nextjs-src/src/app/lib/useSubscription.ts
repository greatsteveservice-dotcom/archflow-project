"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export type Plan = "trial" | "month" | "halfyear" | "year";
export type SubStatus = "trial" | "active" | "expired";

export interface Subscription {
  plan: Plan;
  status: SubStatus;
  expires_at: string;
  daysLeft: number;
  totalDays: number;
  canEdit: boolean;
  isDesigner: boolean;
}

const PLAN_DAYS: Record<Plan, number> = {
  trial: 7,
  month: 30,
  halfyear: 180,
  year: 365,
};

/**
 * Reads subscription for the current user.
 *
 * Starting 2026-05-16 Archflow is free for all designers — paywall disabled.
 * `canEdit` is forced to `true` for everyone. We still keep reading the
 * subscriptions row so the UI может показывать «бесплатно навсегда» при
 * желании, но никаких блокировок не остаётся.
 */
export function useSubscription() {
  const { user, profile } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const isDesigner = profile?.role === "designer";

  const refetch = useCallback(async () => {
    if (!user) { setSub(null); setLoading(false); return; }
    // Non-designers: no gate
    if (profile && profile.role !== "designer") {
      setSub({
        plan: "active" as Plan, // placeholder
        status: "active",
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        daysLeft: 9999,
        totalDays: 9999,
        canEdit: true,
        isDesigner: false,
      });
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("plan,status,expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) { setSub(null); setLoading(false); return; }
    const expiresAt = new Date(data.expires_at as string);
    const now = new Date();
    const isExpired = expiresAt < now;
    const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000));
    const plan = data.plan as Plan;
    setSub({
      plan,
      status: isExpired ? "expired" : (data.status as SubStatus),
      expires_at: data.expires_at as string,
      daysLeft,
      totalDays: PLAN_DAYS[plan] || 30,
      // Paywall removed 2026-05-16 — Archflow free for all designers
      canEdit: true,
      isDesigner: true,
    });
    setLoading(false);
  }, [user, profile]);

  useEffect(() => { refetch(); }, [refetch]);

  return { subscription: sub, loading, refetch, isDesigner };
}
