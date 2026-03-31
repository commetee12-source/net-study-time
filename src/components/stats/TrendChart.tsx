// Design Ref: Stitch dark theme — bar chart with #4be277 primary
// Plan SC: SC-05 — 30일 추이 차트 데이터

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DailyTrend } from "@/types/database";

interface TrendChartProps {
  data: DailyTrend[];
}

function getBarColor(focusRate: number): string {
  if (focusRate >= 80) return "#4be277"; // primary green
  if (focusRate >= 60) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

export default function TrendChart({ data }: TrendChartProps) {
  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("ko-KR", {
      month: "numeric",
      day: "numeric",
    }),
    hours: Math.round((d.net_study_seconds / 3600) * 10) / 10,
    focusRate: d.focus_rate,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          unit="h"
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#222a3d",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16,
            fontSize: 12,
            color: "#fff",
          }}
          itemStyle={{ color: "#e2e8f0" }}
          labelStyle={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          formatter={(val) => [`${val}시간`, "순공부"]}
          labelFormatter={(label) => `${label}`}
        />
        <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
          {formatted.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.focusRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
