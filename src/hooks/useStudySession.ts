// Design Ref: §5.2 — useStudySession (세션 생성·배치 저장·종료)
// Plan SC: SC-02 — 세션 데이터 DB 정확 저장 (오차 ±30초)

"use client";

import { useCallback, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  startSession,
  updateSession,
  endSession,
} from "@/lib/api/sessions";
import type { SessionStats } from "@/hooks/useStudyTimer";

const BATCH_INTERVAL_MS = 30_000; // 30초 배치 업데이트

function statsToDbData(stats: SessionStats) {
  return {
    total_seconds: Math.round(stats.totalElapsed / 1000),
    net_study_seconds: Math.round(stats.focusTime / 1000),
    focus_rate: Math.round(stats.focusRate * 1000) / 10, // e.g. 78.3
  };
}

export function useStudySession() {
  const { profile } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestStatsRef = useRef<SessionStats | null>(null);

  const startDbSession = useCallback(async () => {
    if (!profile?.school_id) return;

    try {
      const session = await startSession(profile.school_id);
      sessionIdRef.current = session.id;

      // Start 30-second batch update loop
      batchTimerRef.current = setInterval(async () => {
        const id = sessionIdRef.current;
        const stats = latestStatsRef.current;
        if (!id || !stats) return;

        try {
          await updateSession(id, statsToDbData(stats));
        } catch {
          // Silently ignore batch update errors — next batch will retry
        }
      }, BATCH_INTERVAL_MS);
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }, [profile?.school_id]);

  const updateStats = useCallback((stats: SessionStats) => {
    latestStatsRef.current = stats;
  }, []);

  const endDbSession = useCallback(async () => {
    // Clear batch timer
    if (batchTimerRef.current) {
      clearInterval(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    const id = sessionIdRef.current;
    const stats = latestStatsRef.current;
    if (!id || !stats) return;

    try {
      await endSession(id, statsToDbData(stats));
    } catch (err) {
      console.error("Failed to end session:", err);
    }

    sessionIdRef.current = null;
    latestStatsRef.current = null;
  }, []);

  return {
    startDbSession,
    updateStats,
    endDbSession,
    hasActiveSession: () => sessionIdRef.current !== null,
  };
}
