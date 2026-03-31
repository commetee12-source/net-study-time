-- 005: Row Level Security policies
-- Design Ref: §2.2 — RLS ensures data isolation per school

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SCHOOLS policies
-- ============================================

-- Anyone authenticated can read schools they belong to
CREATE POLICY "Users can view their school"
  ON schools FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

-- Admin can update their own school
CREATE POLICY "Admin can update own school"
  ON schools FOR UPDATE
  TO authenticated
  USING (admin_user_id = auth.uid());

-- Authenticated users can create schools (become admin)
CREATE POLICY "Authenticated users can create schools"
  ON schools FOR INSERT
  TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- ============================================
-- PROFILES policies
-- ============================================

-- Users can read own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can read same-school profiles (for ranking display)
CREATE POLICY "Users can read same school profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

-- Profile is created via RPC (join_school_by_invite), but allow direct insert for the user's own profile
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- STUDY_SESSIONS policies
-- ============================================

-- Users can CRUD own sessions
CREATE POLICY "Users can manage own sessions"
  ON study_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read same-school sessions (for rankings)
CREATE POLICY "Users can read same school sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (
    school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- FOCUS_LOGS policies
-- ============================================

-- Users can only manage own focus logs (via session ownership)
CREATE POLICY "Users can manage own focus logs"
  ON focus_logs FOR ALL
  TO authenticated
  USING (
    session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid())
  );
