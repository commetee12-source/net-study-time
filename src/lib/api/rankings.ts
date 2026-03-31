// Design Ref: §3.5 — Ranking API via Supabase RPC (get_ranking)
// Plan SC: SC-03 — 같은 학교 학생끼리 일간 랭킹 정확 산출

import { supabase } from "@/lib/supabase";
import type { RankingItem } from "@/types/database";

export type RankingPeriod = "daily" | "weekly" | "monthly";

export async function getRanking(
  schoolId: string,
  period: RankingPeriod,
  limit = 50
): Promise<RankingItem[]> {
  const { data, error } = await supabase.rpc("get_ranking", {
    p_school_id: schoolId,
    p_period: period,
    p_limit: limit,
  });

  if (error) throw error;
  return (data as RankingItem[]) ?? [];
}
