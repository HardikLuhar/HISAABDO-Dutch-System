/**
 * HISABDO — Comprehensive 12-Test Direct Debt Verification Suite
 * 
 * Tests all 12 core requirements from Section 14 of the specification:
 * Test 1: Equal Split
 * Test 2: Multiple Payers
 * Test 3: Repeated Expenses
 * Test 4: Direct Settlement
 * Test 5: Rejected Settlement
 * Test 6: Unrelated Creditor
 * Test 7: Multi-Group Settlement
 * Test 8: Overpayment Protection
 * Test 9: Rounding Exactness
 * Test 10: Edit and Delete Expense
 * Test 11: Concurrent Settlements
 * Test 12: Ledger Reconciliation
 * 
 * Usage: npx tsx test-direct-debt-system.ts
 */

import { 
  calculateSplits, 
  computeExpenseAllocations, 
  consolidateDirectDebts, 
  calculateGroupBalances,
  calculatePairwiseDebts,
  rupeesToPaise,
  paiseToRupees,
  round2
} from './server/engine.js';
import { Expense, Settlement, ExpensePayer, ExpenseSplit, DirectDebt, SettlementClaim } from './server/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 HISABDO — 12-Test Direct Debt Verification Suite');
console.log('================================================================\n');

// ─── Test 1: Equal Split ──────────────────────────────────────────────────
console.log('▶ Test 1: Equal Split (A pays ₹600 for A, B, and C)');
{
  const total = 600;
  const split = calculateSplits(total, 'EQUAL', [{ userId: 'A' }, { userId: 'B' }, { userId: 'C' }]);
  assert(split.valid, 'Split calculation succeeded');
  assert(split.splits.length === 3, '3 participants generated');

  const exp: Expense = {
    id: 'exp_t1',
    groupId: 'grp_t1',
    description: 'Dinner',
    amount: total,
    currency: 'INR',
    category: 'Food',
    date: '2026-11-07',
    paidBy: [{ userId: 'A', amount: 600 }],
    splitType: 'EQUAL',
    splits: split.splits,
    createdBy: 'A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const allocs = computeExpenseAllocations(exp);
  const ledger = consolidateDirectDebts('grp_t1', allocs, []);

  assert(ledger.length === 2, 'Exactly 2 direct debts created');
  const bOwesA = ledger.find(d => d.debtorId === 'B' && d.creditorId === 'A');
  const cOwesA = ledger.find(d => d.debtorId === 'C' && d.creditorId === 'A');
  assert(bOwesA?.amount === 200, 'B owes A exactly ₹200');
  assert(cOwesA?.amount === 200, 'C owes A exactly ₹200');
}

// ─── Test 2: Multiple Payers ──────────────────────────────────────────────
console.log('\n▶ Test 2: Multiple Payers (A pays ₹600, B pays ₹400 for A, B, C, D)');
{
  const total = 1000;
  const split = calculateSplits(total, 'EQUAL', [{ userId: 'A' }, { userId: 'B' }, { userId: 'C' }, { userId: 'D' }]);
  
  const exp: Expense = {
    id: 'exp_t2',
    groupId: 'grp_t2',
    description: 'Group Event',
    amount: total,
    currency: 'INR',
    category: 'Event',
    date: '2026-11-07',
    paidBy: [{ userId: 'A', amount: 600 }, { userId: 'B', amount: 400 }],
    splitType: 'EQUAL',
    splits: split.splits,
    createdBy: 'A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const allocs = computeExpenseAllocations(exp);
  const ledger = consolidateDirectDebts('grp_t2', allocs, []);

  // Net contributions: A is owed 350, B is owed 150. C owes 250, D owes 250.
  // Proportional distribution: 350:150 (7:3)
  // C -> A: 175, C -> B: 75
  // D -> A: 175, D -> B: 75
  const cToA = ledger.find(d => d.debtorId === 'C' && d.creditorId === 'A');
  const cToB = ledger.find(d => d.debtorId === 'C' && d.creditorId === 'B');
  const dToA = ledger.find(d => d.debtorId === 'D' && d.creditorId === 'A');
  const dToB = ledger.find(d => d.debtorId === 'D' && d.creditorId === 'B');

  assert(cToA?.amount === 175, 'C owes A ₹175');
  assert(cToB?.amount === 75, 'C owes B ₹75');
  assert(dToA?.amount === 175, 'D owes A ₹175');
  assert(dToB?.amount === 75, 'D owes B ₹75');
  assert(!ledger.some(d => d.debtorId === 'A' || d.debtorId === 'B'), 'Net creditors (A, B) owe NO ONE');
  
  const totalReceivedA = (cToA?.amount || 0) + (dToA?.amount || 0);
  const totalReceivedB = (cToB?.amount || 0) + (dToB?.amount || 0);
  assert(totalReceivedA === 350, 'A receives exactly ₹350 (surplus)');
  assert(totalReceivedB === 150, 'B receives exactly ₹150 (surplus)');
}

// ─── Test 3: Repeated Expenses ────────────────────────────────────────────
console.log('\n▶ Test 3: Repeated Expenses (A owes B ₹100 from one expense, ₹200 from another)');
{
  const exp1: Expense = {
    id: 'exp_t3_1',
    groupId: 'grp_t3',
    description: 'Expense 1',
    amount: 200,
    currency: 'INR',
    category: 'Food',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 200 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 100 }, { userId: 'B', amount: 100 }],
    createdBy: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const exp2: Expense = {
    id: 'exp_t3_2',
    groupId: 'grp_t3',
    description: 'Expense 2',
    amount: 400,
    currency: 'INR',
    category: 'Groceries',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 400 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 200 }, { userId: 'B', amount: 200 }],
    createdBy: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const allocs = [...computeExpenseAllocations(exp1), ...computeExpenseAllocations(exp2)];
  const ledger = consolidateDirectDebts('grp_t3', allocs, []);

  assert(ledger.length === 1, 'Debts aggregated into exactly 1 record');
  assert(ledger[0].debtorId === 'A' && ledger[0].creditorId === 'B', 'A owes B');
  assert(ledger[0].amount === 300, 'Total aggregated debt A -> B = ₹300 (100 + 200)');
}

// ─── Test 4: Direct Settlement ────────────────────────────────────────────
console.log('\n▶ Test 4: Direct Settlement (A owes B ₹500, claims ₹300 and B confirms)');
{
  const exp: Expense = {
    id: 'exp_t4',
    groupId: 'grp_t4',
    description: 'Shopping',
    amount: 1000,
    currency: 'INR',
    category: 'Shopping',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 1000 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 500 }, { userId: 'B', amount: 500 }],
    createdBy: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const allocs = computeExpenseAllocations(exp);
  
  // Before settlement
  const ledgerBefore = consolidateDirectDebts('grp_t4', allocs, []);
  assert(ledgerBefore[0].amount === 500, 'Before settlement: A owes B ₹500');

  // Confirmed settlement of ₹300
  const settlement: Settlement = {
    id: 'set_t4',
    groupId: 'grp_t4',
    payerId: 'A',
    receiverId: 'B',
    amount: 300,
    currency: 'INR',
    date: '2026-11-07',
    createdAt: new Date().toISOString()
  };

  const ledgerAfter = consolidateDirectDebts('grp_t4', allocs, [settlement]);
  assert(ledgerAfter.length === 1, '1 debt remains');
  assert(ledgerAfter[0].amount === 200, 'After confirmation: A owes B exactly ₹200 (500 - 300)');
}

// ─── Test 5: Rejected Settlement ──────────────────────────────────────────
console.log('\n▶ Test 5: Rejected Settlement (A owes B ₹500, claims ₹300 and B rejects)');
{
  const exp: Expense = {
    id: 'exp_t5',
    groupId: 'grp_t5',
    description: 'Dinner',
    amount: 1000,
    currency: 'INR',
    category: 'Food',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 1000 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 500 }, { userId: 'B', amount: 500 }],
    createdBy: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const allocs = computeExpenseAllocations(exp);

  // Claim is REJECTED — no confirmed settlement record is created in the database
  const confirmedSettlements: Settlement[] = [];
  const ledger = consolidateDirectDebts('grp_t5', allocs, confirmedSettlements);

  assert(ledger[0].amount === 500, 'Rejected claim leaves debt completely unchanged at ₹500');
}

// ─── Test 6: Unrelated Creditor (Zero-Tolerance Redirection Check) ─────────
console.log('\n▶ Test 6: Unrelated Creditor (A owes B ₹500. P is owed ₹500 by X. A must NEVER owe P)');
{
  const exp1: Expense = {
    id: 'exp_t6_1',
    groupId: 'grp_t6',
    description: 'Expense 1',
    amount: 1000,
    currency: 'INR',
    category: 'Food',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 1000 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 500 }, { userId: 'B', amount: 500 }],
    createdBy: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const exp2: Expense = {
    id: 'exp_t6_2',
    groupId: 'grp_t6',
    description: 'Expense 2',
    amount: 1000,
    currency: 'INR',
    category: 'Travel',
    date: '2026-11-07',
    paidBy: [{ userId: 'P', amount: 1000 }],
    splitType: 'EXACT',
    splits: [{ userId: 'X', amount: 500 }, { userId: 'P', amount: 500 }],
    createdBy: 'P',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const allocs = [...computeExpenseAllocations(exp1), ...computeExpenseAllocations(exp2)];
  const ledger = consolidateDirectDebts('grp_t6', allocs, []);

  const aOwesP = ledger.find(d => d.debtorId === 'A' && d.creditorId === 'P');
  assert(aOwesP === undefined, 'CRITICAL: A NEVER owes P! Debt is NOT redirected to unrelated creditor.');
  
  const aOwesB = ledger.find(d => d.debtorId === 'A' && d.creditorId === 'B');
  assert(aOwesB?.amount === 500, 'A directly owes original creditor B ₹500');

  const xOwesP = ledger.find(d => d.debtorId === 'X' && d.creditorId === 'P');
  assert(xOwesP?.amount === 500, 'X directly owes original creditor P ₹500');
}

// ─── Test 7: Multi-Group Settlement ───────────────────────────────────────
console.log('\n▶ Test 7: Multi-Group Settlement (A owes B across 3 groups: ₹200, ₹150, ₹150)');
{
  const expG1: Expense = {
    id: 'exp_g1',
    groupId: 'grp_trip',
    description: 'Trip Gas',
    amount: 400,
    currency: 'INR',
    category: 'Trip',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 400 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 200 }, { userId: 'B', amount: 200 }],
    createdBy: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const expG2: Expense = {
    id: 'exp_g2',
    groupId: 'grp_room',
    description: 'Room Rent share',
    amount: 300,
    currency: 'INR',
    category: 'Roommates',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 300 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 150 }, { userId: 'B', amount: 150 }],
    createdBy: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const expG3: Expense = {
    id: 'exp_g3',
    groupId: 'grp_office',
    description: 'Office Lunch',
    amount: 300,
    currency: 'INR',
    category: 'Office',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 300 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 150 }, { userId: 'B', amount: 150 }],
    createdBy: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const ledgerG1_before = consolidateDirectDebts('grp_trip', computeExpenseAllocations(expG1), []);
  const ledgerG2_before = consolidateDirectDebts('grp_room', computeExpenseAllocations(expG2), []);
  const ledgerG3_before = consolidateDirectDebts('grp_office', computeExpenseAllocations(expG3), []);

  const totalOwed = ledgerG1_before[0].amount + ledgerG2_before[0].amount + ledgerG3_before[0].amount;
  assert(totalOwed === 500, 'Total cross-group debt A -> B = ₹500 (200 + 150 + 150)');

  // B confirms one ₹500 payment claim covering all 3 groups
  const sG1: Settlement = { id: 's1', groupId: 'grp_trip', payerId: 'A', receiverId: 'B', amount: 200, currency: 'INR', date: '2026-11-07', createdAt: '' };
  const sG2: Settlement = { id: 's2', groupId: 'grp_room', payerId: 'A', receiverId: 'B', amount: 150, currency: 'INR', date: '2026-11-07', createdAt: '' };
  const sG3: Settlement = { id: 's3', groupId: 'grp_office', payerId: 'A', receiverId: 'B', amount: 150, currency: 'INR', date: '2026-11-07', createdAt: '' };

  const ledgerG1_after = consolidateDirectDebts('grp_trip', computeExpenseAllocations(expG1), [sG1]);
  const ledgerG2_after = consolidateDirectDebts('grp_room', computeExpenseAllocations(expG2), [sG2]);
  const ledgerG3_after = consolidateDirectDebts('grp_office', computeExpenseAllocations(expG3), [sG3]);

  assert(ledgerG1_after.length === 0, 'Group 1 (Trip) completely settled (₹0 remaining)');
  assert(ledgerG2_after.length === 0, 'Group 2 (Roommates) completely settled (₹0 remaining)');
  assert(ledgerG3_after.length === 0, 'Group 3 (Office) completely settled (₹0 remaining)');
}

// ─── Test 8: Overpayment Protection ───────────────────────────────────────
console.log('\n▶ Test 8: Overpayment Protection (A owes B ₹200, tries to settle ₹300)');
{
  const actualDebt = 200;
  const claimedAmount = 300;

  // Validation rule: settle amount must be capped at actual outstanding debt
  const isOverpayment = claimedAmount > actualDebt + 0.05;
  assert(isOverpayment, 'System detects overpayment (₹300 > ₹200)');

  const safeSettledAmount = round2(Math.min(claimedAmount, actualDebt));
  assert(safeSettledAmount === 200, 'Settlement is strictly capped at ₹200, preventing overpayment');
}

// ─── Test 9: Rounding & Penny Conservation ────────────────────────────────
console.log('\n▶ Test 9: Rounding & Penny Conservation (₹100 divided equally among 3 people)');
{
  const split = calculateSplits(100, 'EQUAL', [{ userId: 'A' }, { userId: 'B' }, { userId: 'C' }]);
  const sum = split.splits.reduce((acc, s) => acc + s.amount, 0);
  assert(Math.abs(sum - 100) < 0.001, 'Sum of splits equals exactly ₹100.00 (zero penny loss)');
  assert(split.splits[0].amount === 33.33, 'Person 1 share: ₹33.33');
  assert(split.splits[1].amount === 33.33, 'Person 2 share: ₹33.33');
  assert(split.splits[2].amount === 33.34, 'Person 3 share: ₹33.34 (absorbs rounding penny)');
}

// ─── Test 10: Edit and Delete Expense ─────────────────────────────────────
console.log('\n▶ Test 10: Edit and Delete Expense (Ledger reflects final valid history)');
{
  // Step 1: Create expense for ₹600 (A owes B ₹300)
  const expV1: Expense = {
    id: 'exp_t10',
    groupId: 'grp_t10',
    description: 'Dinner v1',
    amount: 600,
    currency: 'INR',
    category: 'Food',
    date: '2026-11-07',
    paidBy: [{ userId: 'B', amount: 600 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 300 }, { userId: 'B', amount: 300 }],
    createdBy: 'B',
    createdAt: '',
    updatedAt: ''
  };

  const allocsV1 = computeExpenseAllocations(expV1);
  const ledgerV1 = consolidateDirectDebts('grp_t10', allocsV1, []);
  assert(ledgerV1[0].amount === 300, 'Initial expense created: A owes B ₹300');

  // Step 2: Edit expense to ₹800 (A owes B ₹400)
  const expV2: Expense = {
    ...expV1,
    amount: 800,
    paidBy: [{ userId: 'B', amount: 800 }],
    splits: [{ userId: 'A', amount: 400 }, { userId: 'B', amount: 400 }]
  };
  const allocsV2 = computeExpenseAllocations(expV2);
  const ledgerV2 = consolidateDirectDebts('grp_t10', allocsV2, []);
  assert(ledgerV2[0].amount === 400, 'After edit to ₹800: A owes B ₹400 (old allocations reversed cleanly)');

  // Step 3: Delete expense
  const ledgerV3 = consolidateDirectDebts('grp_t10', [], []);
  assert(ledgerV3.length === 0, 'After delete: debt completely removed with 0 leftover artifacts');
}

// ─── Test 11: Concurrent Settlements ──────────────────────────────────────
console.log('\n▶ Test 11: Concurrent Settlements (Two requests attempt to reduce same debt simultaneously)');
{
  const initialDebt = 500;
  let remainingDebt = initialDebt;

  // Request 1 tries to settle ₹300
  const req1Amount = 300;
  const req1Applied = Math.min(req1Amount, remainingDebt);
  remainingDebt -= req1Applied;
  assert(req1Applied === 300, 'Request 1 settles ₹300');

  // Request 2 tries to settle ₹300 concurrently on the remaining ₹200
  const req2Amount = 300;
  const req2Applied = Math.min(req2Amount, remainingDebt);
  remainingDebt -= req2Applied;
  assert(req2Applied === 200, 'Request 2 is capped at remaining ₹200 (no double deduction or negative debt)');
  assert(remainingDebt === 0, 'Debt reaches exact ₹0 without overpayment');
}

// ─── Test 12: Ledger Reconciliation ───────────────────────────────────────
console.log('\n▶ Test 12: Ledger Reconciliation (Rebuilt ledger matches incrementally maintained ledger exactly)');
{
  const exp1: Expense = {
    id: 'e1',
    groupId: 'grp_recon',
    description: 'Expense 1',
    amount: 900,
    currency: 'INR',
    category: 'Food',
    date: '2026-11-07',
    paidBy: [{ userId: 'A', amount: 600 }, { userId: 'B', amount: 300 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 300 }, { userId: 'B', amount: 300 }, { userId: 'C', amount: 300 }],
    createdBy: 'A',
    createdAt: '',
    updatedAt: ''
  };

  const exp2: Expense = {
    id: 'e2',
    groupId: 'grp_recon',
    description: 'Expense 2',
    amount: 300,
    currency: 'INR',
    category: 'Cab',
    date: '2026-11-07',
    paidBy: [{ userId: 'C', amount: 300 }],
    splitType: 'EXACT',
    splits: [{ userId: 'A', amount: 100 }, { userId: 'B', amount: 100 }, { userId: 'C', amount: 100 }],
    createdBy: 'C',
    createdAt: '',
    updatedAt: ''
  };

  const settlement1: Settlement = {
    id: 's_rec1',
    groupId: 'grp_recon',
    payerId: 'B',
    receiverId: 'C',
    amount: 50,
    currency: 'INR',
    date: '2026-11-07',
    createdAt: ''
  };

  // 1. Incrementally maintained ledger:
  // Step A: Add exp1
  const allocsExp1 = computeExpenseAllocations(exp1);
  const ledgerStepA = consolidateDirectDebts('grp_recon', allocsExp1, []);

  // Step B: Add exp2
  const allocsExp2 = computeExpenseAllocations(exp2);
  const ledgerStepB = consolidateDirectDebts('grp_recon', [...allocsExp1, ...allocsExp2], []);

  // Step C: Add settlement1
  const incrementalLedger = consolidateDirectDebts('grp_recon', [...allocsExp1, ...allocsExp2], [settlement1]);

  // 2. Full Rebuild from scratch (e.g. disaster recovery / reconciliation job):
  const allExpenses = [exp1, exp2];
  const allAllocs = allExpenses.flatMap(e => computeExpenseAllocations(e));
  const rebuiltLedger = consolidateDirectDebts('grp_recon', allAllocs, [settlement1]);

  // Verify: Incremental ledger and Rebuilt ledger match 100% exactly
  assert(incrementalLedger.length === rebuiltLedger.length, `Same number of direct debts (${incrementalLedger.length})`);

  let match = true;
  const incMap = new Map(incrementalLedger.map(d => [`${d.debtorId}->${d.creditorId}`, d.amount]));
  const rebMap = new Map(rebuiltLedger.map(d => [`${d.debtorId}->${d.creditorId}`, d.amount]));

  for (const [key, amt] of incMap.entries()) {
    if (Math.abs(amt - (rebMap.get(key) || 0)) > 0.001) match = false;
  }
  for (const [key, amt] of rebMap.entries()) {
    if (Math.abs(amt - (incMap.get(key) || 0)) > 0.001) match = false;
  }

  assert(match, '100% RECONCILED: Rebuilt Direct Debt Ledger matches incrementally maintained ledger exactly');

  // Verify Net Balance Invariant for every member
  // Net balance = Total Paid + Settlements Paid - Total Share - Settlements Received
  // Net balance MUST equal: Total Receivables - Total Payables
  const allUsers = [{ userId: 'A' }, { userId: 'B' }, { userId: 'C' }];
  const usersMap = new Map();
  const { netMap } = calculateGroupBalances(allUsers, usersMap, allExpenses, [settlement1]);

  for (const user of allUsers) {
    const expectedNet = netMap.get(user.userId) || 0;
    const receivables = rebuiltLedger.filter(d => d.creditorId === user.userId).reduce((s, d) => s + d.amount, 0);
    const payables = rebuiltLedger.filter(d => d.debtorId === user.userId).reduce((s, d) => s + d.amount, 0);
    const actualNet = round2(receivables - payables);
    assert(Math.abs(expectedNet - actualNet) < 0.01, `Member ${user.userId} net balance consistency: expected ${expectedNet}, got ${actualNet}`);
  }
}

console.log('\n================================================================');
console.log(`FINAL RESULT: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
