-- Migration 005: Add upi_id column to users table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id TEXT;
