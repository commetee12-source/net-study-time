// Design Ref: §5.3 — Ranking page (Stitch UI redesign)
// Plan SC: SC-03 — 같은 학교 학생끼리 일간 랭킹 정확 산출

"use client";

import { useState } from "react";
import { Trophy, Users, ChevronUp } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";
import { useAuth } from "@/components/providers/AuthProvider";
import type { RankingPeriod } from "@/lib/api/rankings";
import type { RankingEntry } from "@/hooks/useRanking";

function formatStudyTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const PERIOD_LABELS: Record<RankingPeriod, string> = {
  daily: "일간",
  weekly: "주간",
  monthly: "월간",
};

const TIER_CONFIG: Record<number, { label: string; color: string; borderColor: string }> = {
  1: { label: "골드 티어", color: "#ffba61", borderColor: "#ffba61" },
  2: { label: "실버 티어", color: "#94a3b8", borderColor: "#94a3b8" },
  3: { label: "브론즈 티어", color: "#cd7f32", borderColor: "#cd7f32" },
};

function TopRankCard({ item, rank }: { item: RankingEntry; rank: number }) {
  const tier = TIER_CONFIG[rank];
  const isFirst = rank === 1;

  return (
    <div
      className={`relative ${
        isFirst
          ? "rounded-[2rem] bg-gradient-to-br from-[#222a3d] to-[#131b2e] border shadow-xl p-5"
          : "rounded-3xl bg-[#131b2e] p-4 border border-white/5"
      }`}
      style={isFirst ? { borderColor: `${tier.borderColor}33` } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Rank number */}
          <span
            className="font-extrabold text-2xl italic"
            style={{ color: tier.color }}
          >
            #{rank}
          </span>

          {/* Trophy for #1 */}
          {isFirst && (
            <Trophy className="w-5 h-5" style={{ color: tier.color }} />
          )}

          <div>
            <p className={`font-bold ${isFirst ? "text-lg" : "text-base"} text-white`}>
              {item.display_name}
              {item.isCurrentUser && (
                <span className="ml-2 text-[10px] bg-[#4be277]/20 text-[#4be277] px-1.5 py-0.5 rounded-full font-bold">
                  나
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400">{item.student_id}</p>
          </div>
        </div>

        <div className="text-right">
          <p className={`${isFirst ? "text-xl" : "text-lg"} font-black text-white`}>
            {formatStudyTime(item.net_study_seconds)}
          </p>
          <p
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: tier.color }}
          >
            {tier.label}
          </p>
        </div>
      </div>

      {/* Focus rate bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(item.focus_rate, 100)}%`,
              backgroundColor: tier.color,
              opacity: 0.6,
            }}
          />
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          {item.focus_rate}%
        </span>
      </div>
    </div>
  );
}

function RankRow({ item }: { item: RankingEntry }) {
  if (item.isCurrentUser) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#22c55e]/10 border border-[#4be277]/20 px-4 py-3">
        <span className="w-8 text-center font-bold text-[#4be277] text-sm">
          {item.rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">
            {item.display_name}
            <span className="ml-2 text-[10px] bg-[#4be277]/20 text-[#4be277] px-1.5 py-0.5 rounded-full font-bold">
              나
            </span>
          </p>
          <p className="text-xs text-slate-400">{item.student_id}</p>
        </div>
        <span className="text-sm font-bold text-[#4be277]">
          {formatStudyTime(item.net_study_seconds)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#060e20]/50 px-4 py-3">
      <span className="w-8 text-center font-bold text-slate-600 text-sm">
        {item.rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-300 text-sm truncate">{item.display_name}</p>
        <p className="text-xs text-slate-500">{item.student_id}</p>
      </div>
      <span className="text-sm font-bold text-slate-400">
        {formatStudyTime(item.net_study_seconds)}
      </span>
    </div>
  );
}

function MyRankFloatingCard({
  rankings,
  currentUser,
}: {
  rankings: RankingEntry[];
  currentUser: RankingEntry | undefined;
}) {
  if (!currentUser) return null;

  // Find the person one rank above
  const nextUp = rankings.find((r) => r.rank === currentUser.rank - 1);
  const gapSeconds = nextUp
    ? nextUp.net_study_seconds - currentUser.net_study_seconds
    : 0;

  const getMessage = () => {
    if (currentUser.rank === 1) return "1등을 유지하고 있어요!";
    if (currentUser.rank <= 3) return "상위권이에요! 조금만 더 힘내세요!";
    if (currentUser.rank <= 10) return "꾸준히 오르고 있어요!";
    return "오늘도 화이팅!";
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 px-4 z-30">
      <div className="max-w-lg mx-auto bg-[#222a3d]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4be277]/20 flex items-center justify-center">
              <span className="text-[#4be277] font-extrabold text-lg">
                {currentUser.rank}
              </span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">{getMessage()}</p>
              {nextUp && gapSeconds > 0 && (
                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                  <ChevronUp className="w-3 h-3 text-[#4be277]" />
                  다음 순위까지{" "}
                  <span className="text-[#4be277] font-bold">
                    {formatStudyTime(gapSeconds)}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[#4be277] font-black text-lg">
              {formatStudyTime(currentUser.net_study_seconds)}
            </p>
            <p className="text-slate-500 text-[10px] font-medium">
              몰입률 {currentUser.focus_rate}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const [period, setPeriod] = useState<RankingPeriod>("daily");
  const { rankings, loading, error } = useRanking(period);
  const { school } = useAuth();

  const top3 = rankings.filter((r) => r.rank <= 3);
  const rest = rankings.filter((r) => r.rank > 3);
  const currentUser = rankings.find((r) => r.isCurrentUser);

  return (
    <main className="min-h-screen bg-[#0b1326] pb-32">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            학교 랭킹
          </h1>
          {school && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#4be277]" />
              <span className="text-[#4be277] font-bold tracking-wide text-sm">
                {school.name}
              </span>
            </div>
          )}
        </header>

        {/* Period Filter Tabs */}
        <div className="p-1.5 bg-[#060e20] rounded-2xl border border-white/5 mb-6">
          <div className="grid grid-cols-3 gap-1">
            {(["daily", "weekly", "monthly"] as RankingPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`py-2.5 px-4 text-xs font-bold tracking-widest uppercase transition-all ${
                  period === p
                    ? "bg-[#222a3d] text-white shadow-lg rounded-xl"
                    : "text-slate-400 hover:text-white rounded-xl"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#4be277]/30 border-t-[#4be277] rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">랭킹 불러오는 중...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && rankings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#131b2e] flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <p className="font-bold text-slate-400">아직 데이터가 없습니다</p>
            <p className="text-sm text-slate-600 mt-1">
              학습 세션을 시작하면 랭킹에 표시됩니다
            </p>
          </div>
        )}

        {/* Ranking Content */}
        {!loading && !error && rankings.length > 0 && (
          <>
            {/* Top 3 Special Cards */}
            <div className="space-y-3 mb-4">
              {top3.map((item) => (
                <TopRankCard key={item.user_id} item={item} rank={item.rank} />
              ))}
            </div>

            {/* Rank 4+ Rows */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((item) => (
                  <RankRow key={item.user_id} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* My Rank Floating Card */}
      {!loading && currentUser && currentUser.rank > 3 && (
        <MyRankFloatingCard rankings={rankings} currentUser={currentUser} />
      )}
    </main>
  );
}
