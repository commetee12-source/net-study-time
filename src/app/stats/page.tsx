// Design Ref: Stitch "세션 완료 리포트" bento grid style
// Plan SC: SC-05 — 30일 추이 차트 데이터

"use client";

import { useEffect, useState } from "react";
import { BarChart3, Calendar } from "lucide-react";
import { getTodaySummary, getWeeklySummary, getPreviousWeeklySummary, getDailyTrends } from "@/lib/api/statistics";
import TrendChart from "@/components/stats/TrendChart";
import type { PeriodSummary, DailyTrend } from "@/types/database";

function formatMinutes(seconds: number): string {
  return String(Math.round(seconds / 60));
}

function formatStudyTime(seconds: number): string {
  if (seconds === 0) return "0분";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

/** SVG Donut chart for focus rate */
function FocusDonut({ rate, size = 160 }: { rate: number; size?: number }) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} className="block mx-auto">
      <defs>
        <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4be277" />
          <stop offset="100%" stopColor="#2dd4a8" />
        </linearGradient>
      </defs>
      {/* Background track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#222a3d"
        strokeWidth={strokeWidth}
      />
      {/* Foreground arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#donutGrad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-700 ease-out"
      />
      {/* Center text */}
      <text
        x={center}
        y={center - 6}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white font-extrabold text-4xl"
        style={{ fontSize: 36, fontWeight: 800 }}
      >
        {rate > 0 ? rate.toFixed(1) : "-"}
      </text>
      <text
        x={center}
        y={center + 22}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-400"
        style={{ fontSize: 13 }}
      >
        {rate > 0 ? "%" : ""}
      </text>
    </svg>
  );
}

/** Progress bar component */
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-[#1a2236] mt-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function StatsPage() {
  const [today, setToday] = useState<PeriodSummary | null>(null);
  const [weekly, setWeekly] = useState<PeriodSummary | null>(null);
  const [prevWeekly, setPrevWeekly] = useState<PeriodSummary | null>(null);
  const [trends, setTrends] = useState<DailyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [t, w, pw, d] = await Promise.all([
          getTodaySummary(),
          getWeeklySummary(),
          getPreviousWeeklySummary(),
          getDailyTrends(7),
        ]);
        setToday(t);
        setWeekly(w);
        setPrevWeekly(pw);
        setTrends(d);
      } catch {
        // Silently handle — will show 0 values
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const todayNetSec = today?.net_study_seconds ?? 0;
  const todayTotalSec = today?.total_seconds ?? 0;
  const todayFocusRate = today && todayTotalSec > 0 ? today.focus_rate : 0;

  const weeklyNetSec = weekly?.net_study_seconds ?? 0;
  const weeklyTotalSec = weekly?.total_seconds ?? 0;
  const weeklyFocusRate = weekly && weeklyTotalSec > 0 ? weekly.focus_rate : 0;

  const weeklyDays = weekly && weekly.session_count > 0
    ? Math.max(1, new Date().getDay() || 7)
    : 1;
  const dailyAvgSeconds = weekly ? Math.round(weeklyNetSec / weeklyDays) : 0;

  // 전주 대비 몰입률 변화
  const weeklyDelta = (() => {
    if (!weekly || !prevWeekly || weeklyTotalSec === 0 || prevWeekly.total_seconds === 0) return null;
    const diff = weekly.focus_rate - prevWeekly.focus_rate;
    return Math.round(diff * 10) / 10;
  })();

  // Max reference for progress bars (8h target per day, week proportional)
  const dayTargetSec = 8 * 3600;
  const weekTargetSec = dayTargetSec * weeklyDays;

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <header className="mb-6 pt-2">
        <h1 className="text-2xl font-extrabold text-white font-[Manrope]">나의 학습 현황</h1>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#4be277]/30 border-t-[#4be277] rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500">통계 불러오는 중...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Row 1: Focus Rate Donut (full width) ── */}
          <div className="rounded-[2rem] bg-[#131b2e] border border-white/5 p-8">
            <p className="text-xs font-bold tracking-tighter uppercase text-[#4be277] mb-4">
              오늘 몰입률
            </p>
            <FocusDonut rate={todayFocusRate} />
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4be277]" />
                <span className="text-xs text-slate-400">몰입</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#222a3d]" />
                <span className="text-xs text-slate-400">비몰입</span>
              </div>
            </div>
          </div>

          {/* ── Row 2: Net Study Time + Total Time (side by side) ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Net study time */}
            <div className="rounded-[2rem] bg-[#131b2e] border border-white/5 p-6">
              <p className="text-xs font-bold tracking-tighter uppercase text-[#4be277] mb-3">
                순공부시간
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">{formatMinutes(todayNetSec)}</span>
                <span className="text-sm text-slate-500">분</span>
              </div>
              <ProgressBar value={todayNetSec} max={dayTargetSec} color="#4be277" />
              <p className="text-[10px] text-slate-500 mt-2">
                {today?.session_count ? `${today.session_count}개 세션` : "세션 없음"}
              </p>
            </div>

            {/* Total session time */}
            <div className="rounded-[2rem] bg-[#131b2e] border border-white/5 p-6">
              <p className="text-xs font-bold tracking-tighter uppercase text-slate-500 mb-3">
                총 학습시간
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-300">{formatMinutes(todayTotalSec)}</span>
                <span className="text-sm text-slate-500">분</span>
              </div>
              <ProgressBar value={todayTotalSec} max={dayTargetSec} color="#475569" />
              <p className="text-[10px] text-slate-500 mt-2">
                {formatStudyTime(todayTotalSec)}
              </p>
            </div>
          </div>

          {/* ── Row 3: Weekly summary cards (3-col bento) ── */}
          <div className="grid grid-cols-3 gap-3">
            {/* Weekly total */}
            <div className="rounded-[2rem] bg-[#222a3d] border border-white/5 p-5 flex flex-col">
              <p className="text-[10px] font-bold tracking-tighter uppercase text-slate-500 mb-auto">
                이번 주
              </p>
              <span className="text-2xl font-extrabold text-white mt-3">
                {formatMinutes(weeklyNetSec)}
              </span>
              <span className="text-[10px] text-slate-500">분</span>
            </div>

            {/* Daily average */}
            <div className="rounded-[2rem] bg-[#222a3d] border border-white/5 p-5 flex flex-col">
              <p className="text-[10px] font-bold tracking-tighter uppercase text-slate-500 mb-auto">
                일 평균
              </p>
              <span className="text-2xl font-extrabold text-white mt-3">
                {formatMinutes(dailyAvgSeconds)}
              </span>
              <span className="text-[10px] text-slate-500">분</span>
            </div>

            {/* Weekly focus delta */}
            <div className="rounded-[2rem] bg-[#222a3d] border border-white/5 p-5 flex flex-col">
              <p className="text-[10px] font-bold tracking-tighter uppercase text-slate-500 mb-auto">
                주간 몰입률
              </p>
              <span className="text-2xl font-extrabold text-white mt-3">
                {weeklyFocusRate > 0 ? `${weeklyFocusRate}` : "-"}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500">%</span>
                {weeklyDelta !== null && (
                  <span className={`text-[10px] font-bold ${weeklyDelta >= 0 ? "text-[#4be277]" : "text-red-400"}`}>
                    {weeklyDelta >= 0 ? "+" : ""}{weeklyDelta}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Row 4: Trend Chart (full width) ── */}
          <div className="rounded-[2rem] bg-[#131b2e] border border-white/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                최근 7일 순공부시간
              </h3>
            </div>

            {trends.length > 0 ? (
              <TrendChart data={trends} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <BarChart3 className="w-10 h-10 mb-2 text-slate-600" />
                <p className="text-sm">아직 학습 데이터가 없습니다</p>
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#4be277]" />
                80%+
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                60~79%
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                60% 미만
              </div>
            </div>
          </div>

        </div>
      )}
    </main>
  );
}
