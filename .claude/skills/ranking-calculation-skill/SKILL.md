---
name: ranking-calculation-skill
description: |
  일간·주간·월간 순공부시간 랭킹을 산출하는 SQL 쿼리, DB 함수, View를 생성한다.
  개인 통계 추이 데이터 조회 쿼리도 포함한다.
  사용 시점: 랭킹 쿼리 작성, 리더보드 데이터 조회, 기간별 집계,
  개인 통계 추이 데이터 생성 시 반드시 사용.
---

# Ranking Calculation Skill

study_sessions 테이블을 기반으로 학교 단위 랭킹과 개인 통계를 산출하는
Supabase RPC 함수와 View를 생성한다. 시간대는 Asia/Seoul(KST) 기준.

## Supabase RPC 함수

### 기간별 랭킹 조회

```sql
CREATE OR REPLACE FUNCTION get_ranking(
  p_school_id UUID,
  p_period TEXT,  -- 'daily' | 'weekly' | 'monthly'
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  student_id TEXT,
  display_name TEXT,
  net_study_seconds BIGINT,
  focus_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    RANK() OVER (ORDER BY SUM(s.net_study_seconds) DESC)::BIGINT,
    s.user_id,
    p.student_id,
    p.display_name,
    SUM(s.net_study_seconds)::BIGINT,
    ROUND(AVG(s.focus_rate), 1)
  FROM study_sessions s
  JOIN profiles p ON s.user_id = p.id
  WHERE s.school_id = p_school_id
    AND s.status = 'completed'
    AND s.started_at >= CASE p_period
      WHEN 'daily' THEN (now() AT TIME ZONE 'Asia/Seoul')::date::timestamptz
      WHEN 'weekly' THEN date_trunc('week', now() AT TIME ZONE 'Asia/Seoul')::timestamptz
      WHEN 'monthly' THEN date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::timestamptz
    END
  GROUP BY s.user_id, p.student_id, p.display_name
  ORDER BY SUM(s.net_study_seconds) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 개인 30일 추이

```sql
CREATE OR REPLACE FUNCTION get_daily_trend(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  study_date DATE,
  net_seconds BIGINT,
  total_seconds BIGINT,
  focus_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (s.started_at AT TIME ZONE 'Asia/Seoul')::date,
    SUM(s.net_study_seconds)::BIGINT,
    SUM(s.total_seconds)::BIGINT,
    ROUND(
      CASE WHEN SUM(s.total_seconds) > 0
      THEN SUM(s.net_study_seconds)::numeric / SUM(s.total_seconds) * 100
      ELSE 0 END, 1
    )
  FROM study_sessions s
  WHERE s.user_id = p_user_id
    AND s.started_at >= now() - (p_days || ' days')::interval
    AND s.status = 'completed'
  GROUP BY 1
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 클라이언트 API 호출 패턴

```typescript
// 랭킹 조회
async function fetchRanking(schoolId: string, period: 'daily' | 'weekly' | 'monthly') {
  const { data, error } = await supabase.rpc('get_ranking', {
    p_school_id: schoolId,
    p_period: period,
    p_limit: 50
  });
  return data;
}

// 개인 추이 조회
async function fetchDailyTrend(userId: string, days = 30) {
  const { data, error } = await supabase.rpc('get_daily_trend', {
    p_user_id: userId,
    p_days: days
  });
  return data;
}
```

## 사용 예제

**예제 1: 일간 랭킹 조회**
- 입력: "오늘 우리 학교 랭킹 쿼리 만들어줘"
- 출력: get_ranking(school_id, 'daily') 호출 코드

**예제 2: 개인 30일 추이**
- 입력: "내 최근 30일 공부시간 추이 데이터를 가져오는 쿼리"
- 출력: get_daily_trend 함수 + 클라이언트 호출 코드
