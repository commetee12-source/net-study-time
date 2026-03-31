-- 004: Focus logs table
-- Design Ref: §3 Data Model — focus_logs entity (high-volume time-series)

CREATE TABLE focus_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  is_focused BOOLEAN NOT NULL,
  reason TEXT CHECK (reason IN ('sleeping', 'absent', 'distracted')),
  confidence NUMERIC(3,2)
);

CREATE INDEX idx_focus_logs_session_id ON focus_logs(session_id);
CREATE INDEX idx_focus_logs_timestamp ON focus_logs(timestamp);
