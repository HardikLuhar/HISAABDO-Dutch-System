-- Migration: Add unique constraint on user name (case-insensitive)
-- This ensures no two users can register with the same name, even with different casing.
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Case-insensitive unique index on user name
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON users (LOWER(TRIM(name)));
