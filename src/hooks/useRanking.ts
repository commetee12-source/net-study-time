// Design Ref: §4.1 — useRanking (랭킹 데이터 fetching + 본인 하이라이트)
// Plan SC: SC-03 — 같은 학교 학생끼리 일간 랭킹 정확 산출

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getRanking, type RankingPeriod } from "@/lib/api/rankings";
import type { RankingItem } from "@/types/database";

export interface RankingEntry extends RankingItem {
  isCurrentUser: boolean;
}

export function useRanking(period: RankingPeriod) {
  const { user, profile } = useAuth();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async () => {
    if (!profile?.school_id) {
      setRankings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getRanking(profile.school_id, period);
      setRankings(
        data.map((item) => ({
          ...item,
          isCurrentUser: item.user_id === user?.id,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "랭킹을 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, [profile?.school_id, period, user?.id]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return { rankings, loading, error, refetch: fetchRanking };
}
