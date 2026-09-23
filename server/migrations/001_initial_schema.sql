-- HisaabDo Database Schema for Supabase
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- ============================================
-- 1. Users Table — All registered users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  phone TEXT,
  preferred_currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case-insensitive unique email index
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

-- ============================================
-- 2. Groups Table
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'Trip',
  default_currency TEXT DEFAULT 'INR',
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invite_code TEXT NOT NULL UNIQUE
);

-- ============================================
-- 3. Group Members (junction table)
--    Replaces the nested members[] array from JSON
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  member_passcode TEXT,
  PRIMARY KEY (group_id, user_id)
);

-- ============================================
-- 4. Expenses Table
--    paid_by and splits stored as JSONB arrays
--    to match the existing data model exactly
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  category TEXT DEFAULT 'Food',
  date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  receipt_data JSONB,
  paid_by JSONB NOT NULL,
  split_type TEXT NOT NULL,
  splits JSONB NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

-- ============================================
-- 5. Settlements Table
-- ============================================
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  payer_id TEXT REFERENCES users(id),
  receiver_id TEXT REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(group_id);

-- ============================================
-- 6. Notifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  group_id TEXT,
  related_id TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;

-- ============================================
-- 7. Activities Table
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  group_id TEXT,
  user_id TEXT REFERENCES users(id),
  user_name TEXT NOT NULL,
  user_avatar TEXT DEFAULT '',
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2),
  currency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_group ON activities(group_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
