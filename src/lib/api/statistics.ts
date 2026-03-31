// Design Ref: §4.1 — Statistics API (daily trends, today/weekly summary)
// Plan SC: SC-05 — 30일 추이 차트 데이터

import { supabase } from "@/lib/supabase";
import type { DailyTrend, PeriodSummary } from "@/types/database";

export async function getDailyTrends(days = 30): Promise<DailyTrend[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("started_at, total_seconds, net_study_seconds, focus_rate")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: true });

  if (error) throw error;

  // 일별로 집계
  const byDate = new Map<string, DailyTrend>();
  for (const s of data ?? []) {
    const date = s.started_at.slice(0, 10); // YYYY-MM-DD
    const existing = byDate.get(date) ?? {
      date,
      net_study_seconds: 0,
      total_seconds: 0,
      focus_rate: 0,
    };
    existing.net_study_seconds += s.net_study_seconds;
    existing.total_seconds += s.total_seconds;
    byDate.set(date, existing);
  }

  // focus_rate 재계산
  for (const trend of byDate.values()) {
    trend.focus_rate =
      trend.total_seconds > 0
        ? Math.round((trend.net_study_seconds / trend.total_seconds) * 1000) /
          10
        : 0;
  }

  return Array.from(byDate.values());
}

export async function getTodaySummary(): Promise<PeriodSummary> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { net_study_seconds: 0, total_seconds: 0, focus_rate: 0, session_count: 0 };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("total_seconds, net_study_seconds")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("started_at", todayStart.toISOString());

  if (error) throw error;

  const sessions = data ?? [];
  const total = sessions.reduce((sum, s) => sum + s.total_seconds, 0);
  const net = sessions.reduce((sum, s) => sum + s.net_study_seconds, 0);

  return {
    net_study_seconds: net,
    total_seconds: total,
    focus_rate: total > 0 ? Math.round((net / total) * 1000) / 10 : 0,
    session_count: sessions.length,
  };
}

export async function getWeeklySummary(): Promise<PeriodSummary> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { net_study_seconds: 0, total_seconds: 0, focus_rate: 0, session_count: 0 };

  // 이번 주 월요일
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("total_seconds, net_study_seconds")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("started_at", monday.toISOString());

  if (error) throw error;

  const sessions = data ?? [];
  const total = sessions.reduce((sum, s) => sum + s.total_seconds, 0);
  const net = sessions.reduce((sum, s) => sum + s.net_study_seconds, 0);

  return {
    net_study_seconds: net,
    total_seconds: total,
    focus_rate: total > 0 ? Math.round((net / total) * 1000) / 10 : 0,
    session_count: sessions.length,
  };
}

export async function getPreviousWeeklySummary(): Promise<PeriodSummary> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { net_study_seconds: 0, total_seconds: 0, focus_rate: 0, session_count: 0 };

  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - diff);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("total_seconds, net_study_seconds")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("started_at", lastMonday.toISOString())
    .lt("started_at", thisMonday.toISOString());

  if (error) throw error;

  const sessions = data ?? [];
  const total = sessions.reduce((sum, s) => sum + s.total_seconds, 0);
  const net = sessions.reduce((sum, s) => sum + s.net_study_seconds, 0);

  return {
    net_study_seconds: net,
    total_seconds: total,
    focus_rate: total > 0 ? Math.round((net / total) * 1000) / 10 : 0,
    session_count: sessions.length,
  };
}
