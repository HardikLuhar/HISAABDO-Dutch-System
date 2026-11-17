-- ============================================
-- 008_admin_panel.sql
-- Hisaabdo Admin Panel Tables:
-- 1. user_logins (Login history & activity tracking)
-- 2. admin_notices (Broadcast announcements)
-- 3. admin_notice_acknowledgements (Tracking who has seen/acknowledged notices)
-- 4. Add last_login_at column to users table
-- ============================================

-- 1. Add last_login_at to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. User Logins Table (tracks login timestamps, IP address, user-agent)
CREATE TABLE IF NOT EXISTS user_logins (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logins_created_at ON user_logins(created_at DESC);

-- 3. Admin Notices Table
CREATE TABLE IF NOT EXISTS admin_notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'info')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_admin_notices_is_active ON admin_notices(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_notices_created_at ON admin_notices(created_at DESC);

-- 4. Admin Notice Acknowledgements Table
CREATE TABLE IF NOT EXISTS admin_notice_acknowledgements (
  id TEXT PRIMARY KEY,
  notice_id TEXT REFERENCES admin_notices(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_notice_user_ack UNIQUE (notice_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notice_ack_user_id ON admin_notice_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_notice_ack_notice_id ON admin_notice_acknowledgements(notice_id);
