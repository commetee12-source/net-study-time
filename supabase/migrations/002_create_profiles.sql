-- 002: Profiles table
-- Design Ref: §3 Data Model — profiles entity (1:1 with auth.users)

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  school_id UUID REFERENCES schools(id) NOT NULL,
  student_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, student_id)
);

CREATE INDEX idx_profiles_school_id ON profiles(school_id);
