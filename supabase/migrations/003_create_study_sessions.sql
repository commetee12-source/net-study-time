-- 003: Study sessions table
-- Design Ref: §3 Data Model — study_sessions entity

CREATE TABLE study_sessions (
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

CREATE INDEX idx_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_sessions_school_id ON study_sessions(school_id);
CREATE INDEX idx_sessions_started_at ON study_sessions(started_at);
CREATE INDEX idx_sessions_status ON study_sessions(status);
-- Composite index for ranking queries
CREATE INDEX idx_sessions_school_status_started ON study_sessions(school_id, status, started_at);
