-- 006: Database functions (RPC)
-- Design Ref: §3.5 — Invite code + Ranking RPC functions

-- ============================================
-- generate_invite_code: 6-char alphanumeric
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

-- ============================================
-- join_school_by_invite: student signup flow
-- ============================================
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
  SELECT id INTO v_school_id
  FROM schools
  WHERE invite_code = upper(p_invite_code);

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO profiles (id, school_id, student_id, display_name)
  VALUES (p_user_id, v_school_id, p_student_id, p_display_name);

  RETURN v_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- get_ranking: period-based school ranking
-- ============================================
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
