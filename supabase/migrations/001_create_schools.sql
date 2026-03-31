-- 001: Schools table
-- Design Ref: §3 Data Model — schools entity

CREATE TABLE schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  admin_user_id UUID REFERENCES auth.users(id)
);

-- Index for invite code lookup (used during signup)
CREATE INDEX idx_schools_invite_code ON schools(invite_code);
