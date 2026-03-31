// Design Ref: §4.1 — Session API (start, update batch, end)
// Plan SC: SC-02 — 세션 데이터 DB 정확 저장 (오차 ±30초)

import { supabase } from "@/lib/supabase";
import type { StudySession } from "@/types/database";

export async function startSession(schoolId: string): Promise<StudySession> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      school_id: schoolId,
      started_at: new Date().toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSession(
  sessionId: string,
  updates: {
    total_seconds: number;
    net_study_seconds: number;
    focus_rate: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from("study_sessions")
    .update(updates)
    .eq("id", sessionId);

  if (error) throw error;
}

export async function endSession(
  sessionId: string,
  finalData: {
    total_seconds: number;
    net_study_seconds: number;
    focus_rate: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from("study_sessions")
    .update({
      ...finalData,
      ended_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function getActiveSession(): Promise<StudySession | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
