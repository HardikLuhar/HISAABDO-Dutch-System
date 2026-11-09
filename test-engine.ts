import { 
  calculateSplits, 
  computeExpenseAllocations, 
  consolidateDirectDebts, 
  calculateGroupBalances,
  calculatePairwiseDebts,
  rupeesToPaise,
  paiseToRupees 
} from './server/engine.js';
import { Expense, Settlement, ExpensePayer, ExpenseSplit, SplitType } from './server/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('--- Test 1: Equal Split (₹600 among A, B, C) ---');
const split1 = calculateSplits(600, 'EQUAL', [{ userId: 'A' }, { userId: 'B' }, { userId: 'C' }]);
assert(split1.valid, 'Split 1 is valid');
assert(split1.splits.length === 3, '3 participants');
assert(split1.splits[0].amount === 200 && split1.splits[1].amount === 200 && split1.splits[2].amount === 200, 'Equal shares of ₹200');

const alloc1 = computeExpenseAllocations({
  id: 'exp1',
  groupId: 'grp1',
  amount: 600,
  paidBy: [{ userId: 'A', amount: 600 }],
  splits: split1.splits
});
assert(alloc1.length === 2, 'Allocations length is 2 (B->A, C->A)');
const bToA = alloc1.find(a => a.debtorId === 'B' && a.creditorId === 'A');
const cToA = alloc1.find(a => a.debtorId === 'C' && a.creditorId === 'A');
assert(bToA?.amount === 200, 'B owes A ₹200');
assert(cToA?.amount === 200, 'C owes A ₹200');
assert(!alloc1.some(a => a.debtorId === a.creditorId), 'No self-debt');

console.log('\n--- Test 2: Multiple Payers (A paid ₹600, B paid ₹400, shared equally ₹250 among A, B, C, D) ---');
const split2 = calculateSplits(1000, 'EQUAL', [{ userId: 'A' }, { userId: 'B' }, { userId: 'C' }, { userId: 'D' }]);
const alloc2 = computeExpenseAllocations({
  id: 'exp2',
  groupId: 'grp1',
  amount: 1000,
  paidBy: [{ userId: 'A', amount: 600 }, { userId: 'B', amount: 400 }],
  splits: split2.splits
});

// A paid 600, share 250 -> surplus 350
// B paid 400, share 250 -> surplus 150
// C paid 0, share 250 -> deficit 250
// D paid 0, share 250 -> deficit 250
// Creditors: A (350), B (150). Surplus ratio = 350:150 = 7:3
// C owes A: 250 * (350/500) = 175
// C owes B: 250 * (150/500) = 75
// D owes A: 250 * (350/500) = 175
// D owes B: 250 * (150/500) = 75
const cToA2 = alloc2.find(a => a.debtorId === 'C' && a.creditorId === 'A');
const cToB2 = alloc2.find(a => a.debtorId === 'C' && a.creditorId === 'B');
const dToA2 = alloc2.find(a => a.debtorId === 'D' && a.creditorId === 'A');
const dToB2 = alloc2.find(a => a.debtorId === 'D' && a.creditorId === 'B');

assert(cToA2?.amount === 175, 'C owes A ₹175');
assert(cToB2?.amount === 75, 'C owes B ₹75');
assert(dToA2?.amount === 175, 'D owes A ₹175');
assert(dToB2?.amount === 75, 'D owes B ₹75');
assert(!alloc2.some(a => a.debtorId === 'B'), 'B is a net creditor, B owes NO ONE');
assert(!alloc2.some(a => a.debtorId === 'A'), 'A is a net creditor, A owes NO ONE');
const totalAlloc2 = alloc2.reduce((s, a) => s + a.amount, 0);
assert(totalAlloc2 === 500, 'Total allocated debt = ₹500 (sum of net deficits)');

console.log('\n--- Test 3: Repeated Expenses (A owes B ₹100 from dinner, ₹200 from groceries) ---');
const expA = {
  id: 'expA',
  groupId: 'grp1',
  amount: 200,
  paidBy: [{ userId: 'B', amount: 200 }],
  splits: [{ userId: 'A', amount: 100 }, { userId: 'B', amount: 100 }]
};
const expB = {
  id: 'expB',
  groupId: 'grp1',
  amount: 400,
  paidBy: [{ userId: 'B', amount: 400 }],
  splits: [{ userId: 'A', amount: 200 }, { userId: 'B', amount: 200 }]
};
const allocA = computeExpenseAllocations(expA);
const allocB = computeExpenseAllocations(expB);
const consolidated3 = consolidateDirectDebts('grp1', [...allocA, ...allocB], []);
assert(consolidated3.length === 1, 'Only one combined debt between A and B');
assert(consolidated3[0].debtorId === 'A' && consolidated3[0].creditorId === 'B', 'A owes B');
assert(consolidated3[0].amount === 300, 'Combined debt is ₹300');

console.log('\n--- Test 4: Direct Settlement (A owes B ₹500, settles ₹300) ---');
const exp4 = {
  id: 'exp4',
  groupId: 'grp1',
  amount: 1000,
  paidBy: [{ userId: 'B', amount: 1000 }],
  splits: [{ userId: 'A', amount: 500 }, { userId: 'B', amount: 500 }]
};
const alloc4 = computeExpenseAllocations(exp4);
const settlement4: Settlement = {
  id: 'set1',
  groupId: 'grp1',
  payerId: 'A',
  receiverId: 'B',
  amount: 300,
  currency: 'INR',
  date: '2026-11-07',
  createdAt: '2026-11-07T00:00:00Z'
};
const consolidated4 = consolidateDirectDebts('grp1', alloc4, [settlement4]);
assert(consolidated4.length === 1, 'One remaining debt');
assert(consolidated4[0].amount === 200, 'Remaining debt is ₹200 (500 - 300)');

console.log('\n--- Test 5: Unrelated Creditor (A owes B ₹500. P is owed ₹500 by X. A must NEVER owe P!) ---');
const expA_B = {
  id: 'expAB',
  groupId: 'grp1',
  amount: 1000,
  paidBy: [{ userId: 'B', amount: 1000 }],
  splits: [{ userId: 'A', amount: 500 }, { userId: 'B', amount: 500 }]
};
const expX_P = {
  id: 'expXP',
  groupId: 'grp1',
  amount: 1000,
  paidBy: [{ userId: 'P', amount: 1000 }],
  splits: [{ userId: 'X', amount: 500 }, { userId: 'P', amount: 500 }]
};
const allocAB = computeExpenseAllocations(expA_B);
const allocXP = computeExpenseAllocations(expX_P);
const consolidated5 = consolidateDirectDebts('grp1', [...allocAB, ...allocXP], []);
const aOwesP = consolidated5.find(d => d.debtorId === 'A' && d.creditorId === 'P');
assert(aOwesP === undefined, 'A NEVER owes P! Creditor relationship strictly preserved.');
const aOwesB = consolidated5.find(d => d.debtorId === 'A' && d.creditorId === 'B');
assert(aOwesB?.amount === 500, 'A owes B ₹500');
const xOwesP = consolidated5.find(d => d.debtorId === 'X' && d.creditorId === 'P');
assert(xOwesP?.amount === 500, 'X owes P ₹500');

console.log('\n--- Test 6: Rounding exactness (₹100 divided equally among 3 people) ---');
const split6 = calculateSplits(100, 'EQUAL', [{ userId: 'A' }, { userId: 'B' }, { userId: 'C' }]);
const sum6 = split6.splits.reduce((s, x) => s + x.amount, 0);
assert(Math.abs(sum6 - 100) < 0.001, 'Splits sum exactly to ₹100');
assert(split6.splits[0].amount === 33.33, 'A share is 33.33');
assert(split6.splits[1].amount === 33.33, 'B share is 33.33');
assert(split6.splits[2].amount === 33.34, 'C share absorbs penny (33.34)');

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);
if (failed > 0) process.exit(1);

