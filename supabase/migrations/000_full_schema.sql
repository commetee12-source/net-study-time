-- ============================================
-- Net Study Time (Study Sanctuary) — Full Schema
-- Run this in Supabase SQL Editor to set up everything at once
-- ============================================

-- 1. TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  admin_user_id UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_schools_invite_code ON schools(invite_code);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  school_id UUID REFERENCES schools(id) NOT NULL,
  student_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  school_id UUID REFERENCES schools(id) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  total_seconds INTEGER DEFAULT 0,
  net_study_seconds INTEGER DEFAULT 0,
  focus_rate NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_school_id ON study_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON study_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_school_status_started ON study_sessions(school_id, status, started_at);

CREATE TABLE IF NOT EXISTS focus_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  is_focused BOOLEAN NOT NULL,
  reason TEXT CHECK (reason IN ('sleeping', 'absent', 'distracted')),
  confidence NUMERIC(3,2)
);
CREATE INDEX IF NOT EXISTS idx_focus_logs_session_id ON focus_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_logs_timestamp ON focus_logs(timestamp);

-- 2. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_logs ENABLE ROW LEVEL SECURITY;

-- Schools
CREATE POLICY "Users can view their school" ON schools FOR SELECT TO authenticated
  USING (id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin can update own school" ON schools FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "Authenticated users can create schools" ON schools FOR INSERT TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can read same school profiles" ON profiles FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create own profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Study Sessions
CREATE POLICY "Users can manage own sessions" ON study_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read same school sessions" ON study_sessions FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

-- Focus Logs
CREATE POLICY "Users can manage own focus logs" ON focus_logs FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid()));

-- 3. FUNCTIONS (RPC)
-- ============================================

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
  SELECT id INTO v_school_id FROM schools WHERE invite_code = upper(p_invite_code);
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  INSERT INTO profiles (id, school_id, student_id, display_name)
  VALUES (p_user_id, v_school_id, p_student_id, p_display_name);
  RETURN v_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_ranking(
  p_school_id UUID,
  p_period TEXT,
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
