-- Migration 006: Direct Debt Ledger and Expense Debt Allocations
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- ============================================
-- 1. Direct Debts Table
--    Maintains the persistent person-to-person debt ledger
--    aggregated per group between each debtor-creditor pair.
-- ============================================
CREATE TABLE IF NOT EXISTS direct_debts (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  debtor_id TEXT NOT NULL REFERENCES users(id),
  creditor_id TEXT NOT NULL REFERENCES users(id),
  outstanding_paise BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_no_self_debt CHECK (debtor_id != creditor_id),
  CONSTRAINT chk_non_negative_debt CHECK (outstanding_paise >= 0),
  UNIQUE (group_id, debtor_id, creditor_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_debts_group ON direct_debts(group_id);
CREATE INDEX IF NOT EXISTS idx_direct_debts_debtor ON direct_debts(group_id, debtor_id);
CREATE INDEX IF NOT EXISTS idx_direct_debts_creditor ON direct_debts(group_id, creditor_id);

-- ============================================
-- 2. Expense Debt Allocations Table
--    Auditable record of exact debtor-creditor allocations
--    generated for each expense record. Enables instant
--    reversal on edit/delete and full audit trail.
-- ============================================
CREATE TABLE IF NOT EXISTS expense_debt_allocations (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  debtor_id TEXT NOT NULL REFERENCES users(id),
  creditor_id TEXT NOT NULL REFERENCES users(id),
  amount_paise BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_alloc_no_self CHECK (debtor_id != creditor_id),
  CONSTRAINT chk_alloc_positive CHECK (amount_paise > 0)
);

CREATE INDEX IF NOT EXISTS idx_eda_expense ON expense_debt_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_eda_group ON expense_debt_allocations(group_id);
CREATE INDEX IF NOT EXISTS idx_eda_debtor ON expense_debt_allocations(debtor_id);
CREATE INDEX IF NOT EXISTS idx_eda_creditor ON expense_debt_allocations(creditor_id);

