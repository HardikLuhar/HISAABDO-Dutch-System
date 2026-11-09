-- Migration 007: Persistent Settlement Claims
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- ============================================
-- Settlement Claims Table
-- Migrates settlement claims from local JSON file to Supabase.
-- Tracks multi-group claims, payment verification, and anti-fraud status.
-- ============================================
CREATE TABLE IF NOT EXISTS settlement_claims (
  id TEXT PRIMARY KEY,
  payer_id TEXT NOT NULL REFERENCES users(id),
  payer_name TEXT NOT NULL,
  payer_avatar TEXT DEFAULT '',
  receiver_id TEXT NOT NULL REFERENCES users(id),
  receiver_name TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'QR', 'CASH')),
  group_debts JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_claims_receiver ON settlement_claims(receiver_id);
CREATE INDEX IF NOT EXISTS idx_settlement_claims_payer ON settlement_claims(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlement_claims_status ON settlement_claims(status);
CREATE INDEX IF NOT EXISTS idx_settlement_claims_created ON settlement_claims(created_at DESC);

