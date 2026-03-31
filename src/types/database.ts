// Design Ref: §3 Data Model — DB entity types for Supabase tables

export interface School {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  admin_user_id: string;
}

export interface Profile {
  id: string;           // = auth.users.id
  school_id: string;
  student_id: string;   // 학번
  display_name: string; // 이름
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  school_id: string;
  started_at: string;
  ended_at: string | null;
  total_seconds: number;
  net_study_seconds: number;
  focus_rate: number;
  status: "active" | "completed";
  created_at: string;
}

export interface FocusLog {
  id: string;
  session_id: string;
  timestamp: string;
  is_focused: boolean;
  reason: "sleeping" | "absent" | "distracted" | null;
  confidence: number;
}

// 랭킹 조회 결과 (RPC 반환 타입)
export interface RankingItem {
  rank: number;
  user_id: string;
  student_id: string;
  display_name: string;
  net_study_seconds: number;
  focus_rate: number;
}

// 개인 추이 데이터
export interface DailyTrend {
  date: string;           // 'YYYY-MM-DD'
  net_study_seconds: number;
  total_seconds: number;
  focus_rate: number;
}

// 오늘/주간 요약
export interface PeriodSummary {
  net_study_seconds: number;
  total_seconds: number;
  focus_rate: number;
  session_count: number;
}
