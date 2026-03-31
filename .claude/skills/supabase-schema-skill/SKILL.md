---
name: supabase-schema-skill
description: |
  Supabase(PostgreSQL) 테이블 생성, RLS 정책, 인증 설정, 초대코드 시스템의
  SQL 마이그레이션 코드를 생성한다.
  사용 시점: DB 스키마 설계, 테이블 생성, RLS 보안 정책, 인증 흐름 구현,
  초대코드 발급·검증, Supabase 프로젝트 설정 시 반드시 사용.
---

# Supabase Schema Skill

Net Study Time 앱에 필요한 모든 DB 테이블, 인덱스, RLS 정책, 트리거,
초대코드 관련 함수를 Supabase 마이그레이션 SQL로 생성한다.

## 마이그레이션 파일 구조

```
supabase/migrations/
├── 001_create_schools.sql
├── 002_create_profiles.sql
├── 003_create_study_sessions.sql
├── 004_create_focus_logs.sql
├── 005_create_rankings_views.sql
├── 006_setup_rls_policies.sql
└── 007_create_invite_functions.sql
```

## 초대코드 생성 함수

```sql
-- 6자리 영숫자 초대코드 생성
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM schools WHERE invite_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 초대코드로 학교 가입
CREATE OR REPLACE FUNCTION join_school_by_invite(
  p_invite_code TEXT,
  p_user_id UUID,
  p_student_id TEXT,
  p_display_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_school_id UUID;
BEGIN
  SELECT id INTO v_school_id FROM schools WHERE invite_code = p_invite_code;
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  INSERT INTO profiles (id, school_id, student_id, display_name)
  VALUES (p_user_id, v_school_id, p_student_id, p_display_name);
  RETURN v_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## RLS 정책 패턴

```sql
-- profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필 조회·수정
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 같은 학교 학생 조회 (이름·학번만)
CREATE POLICY "Users can view same school profiles"
  ON profiles FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- study_sessions RLS
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON study_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view same school sessions"
  ON study_sessions FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  );

-- focus_logs RLS
ALTER TABLE focus_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own logs"
  ON focus_logs FOR ALL
  USING (
    session_id IN (
      SELECT id FROM study_sessions WHERE user_id = auth.uid()
    )
  );
```

## 인덱스 설계

```sql
-- 랭킹 쿼리 성능을 위한 인덱스
CREATE INDEX idx_sessions_school_status_started
  ON study_sessions (school_id, status, started_at);

CREATE INDEX idx_sessions_user_started
  ON study_sessions (user_id, started_at);

CREATE INDEX idx_focus_logs_session
  ON focus_logs (session_id, timestamp);
```

## 사용 예제

**예제 1: 전체 스키마 생성**
- 입력: "Net Study Time DB 전체 스키마를 만들어줘"
- 출력: 위 7개 마이그레이션 파일 전체

**예제 2: RLS 정책만 추가**
- 입력: "study_sessions 테이블의 RLS 정책을 설정해줘"
- 출력: 006_setup_rls_policies.sql 중 해당 부분
