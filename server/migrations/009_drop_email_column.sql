-- ============================================
-- 009_drop_email_column.sql
-- Permanently remove email column, index, and traces from HisaabDo database
-- Run this in your Supabase SQL Editor:
-- Supabase Dashboard > SQL Editor > New query > Run
-- ============================================

-- 1. Drop the unique email index from users table
DROP INDEX IF EXISTS idx_users_email;

-- 2. Drop the email column from users table
ALTER TABLE users DROP COLUMN IF EXISTS email;

-- 3. Drop user_email column from user_logins table
ALTER TABLE user_logins DROP COLUMN IF EXISTS user_email;
