-- Security Questions table for Forgot Password feature
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- ============================================
-- 8. User Security Questions Table
--    Stores the 3 security question-answer pairs
--    chosen by each user for password recovery
-- ============================================
CREATE TABLE IF NOT EXISTS user_security_questions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,      -- references the predefined question index (1-10)
  answer_hash TEXT NOT NULL,          -- hashed answer for security
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_questions_user ON user_security_questions(user_id);

-- Each user can only have one answer per question
CREATE UNIQUE INDEX IF NOT EXISTS idx_security_questions_user_question ON user_security_questions(user_id, question_id);

-- Add a flag to users table to track if security questions are set up
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_questions_set BOOLEAN DEFAULT FALSE;
