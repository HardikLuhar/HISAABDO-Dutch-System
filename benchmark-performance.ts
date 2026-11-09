/**
 * HISABDO — Comprehensive Financial Engine Performance Benchmarking
 * 
 * Benchmarks:
 * 1. Split calculation
 * 2. Expense debt allocations calculation
 * 3. Incremental Direct Debt ledger consolidation vs Full Historical Recalculation
 * 4. Datasets:
 *    - 10 members / 100 expenses
 *    - 50 members / 1,000 expenses
 *    - 100 members / 5,000 expenses
 *    - 500 members / 10,000 expenses
 * 
 * Usage: npx tsx benchmark-performance.ts
 */

import { 
  calculateSplits, 
  computeExpenseAllocations, 
  consolidateDirectDebts, 
  calculateGroupBalances,
  calculatePairwiseDebts,
  simplifyDebts 
} from './server/engine.js';
import { Expense, Settlement, ExpensePayer, ExpenseSplit } from './server/types.js';

interface BenchmarkResult {
  scale: string;
  members: number;
  expenses: number;
  allocationsTimeMs: number;
  ledgerConsolidationTimeMs: number;
  oldGreedyTimeMs: number;
  speedup: string;
}

function generateMockData(memberCount: number, expenseCount: number) {
  const members = Array.from({ length: memberCount }, (_, i) => ({ userId: `user_${i + 1}` }));
  const expenses: Expense[] = [];

  for (let e = 0; e < expenseCount; e++) {
    const totalAmount = Math.floor(100 + Math.random() * 9900); // 100 to 10,000
    // Pick 1-3 payers
    const numPayers = Math.min(memberCount, Math.floor(1 + Math.random() * 3));
    const payers: ExpensePayer[] = [];
    let remPayerAmt = totalAmount;

    for (let p = 0; p < numPayers; p++) {
      const payerId = members[(e + p) % memberCount].userId;
      if (p === numPayers - 1) {
        payers.push({ userId: payerId, amount: remPayerAmt });
      } else {
        const amt = Math.floor(remPayerAmt / (numPayers - p));
        payers.push({ userId: payerId, amount: amt });
        remPayerAmt -= amt;
      }
    }

    // Pick 3-10 participants for this expense
    const numParts = Math.min(memberCount, Math.floor(3 + Math.random() * 8));
    const partList = members.slice(0, numParts).map(m => ({ userId: m.userId }));
    const splitResult = calculateSplits(totalAmount, 'EQUAL', partList);

    expenses.push({
      id: `exp_${e + 1}`,
      groupId: 'bench_group',
      description: `Expense ${e + 1}`,
      amount: totalAmount,
      currency: 'INR',
      category: 'Food',
      date: '2026-11-07',
      paidBy: payers,
      splitType: 'EQUAL',
      splits: splitResult.splits,
      createdBy: payers[0].userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return { members, expenses };
}

async function runBenchmarks() {
  console.log('========================================================================');
  console.log('⚡ HISABDO Performance Benchmark: Direct Debt Ledger vs Old Greedy Solver');
  console.log('========================================================================\n');

  const testConfigs = [
    { scale: 'Small', members: 10, expenses: 100 },
    { scale: 'Medium', members: 50, expenses: 1000 },
    { scale: 'Large', members: 100, expenses: 5000 },
    { scale: 'Enterprise', members: 500, expenses: 10000 },
  ];

  const results: BenchmarkResult[] = [];

  for (const cfg of testConfigs) {
    console.log(`Testing [${cfg.scale}]: ${cfg.members} members, ${cfg.expenses.toLocaleString()} expenses...`);

    const { members, expenses } = generateMockData(cfg.members, cfg.expenses);

    // 1. Measure Direct Debt Allocations generation
    const t0 = performance.now();
    const allAllocations = expenses.flatMap(e => computeExpenseAllocations(e));
    const t1 = performance.now();
    const allocTime = t1 - t0;

    // 2. Measure Direct Debt Ledger Consolidation
    const t2 = performance.now();
    const directDebts = consolidateDirectDebts('bench_group', allAllocations, []);
    const t3 = performance.now();
    const ledgerTime = t3 - t2;

    // 3. Measure Old System (Group balances + Greedy min-cash-flow solver)
    const usersMap = new Map(members.map(m => [m.userId, { id: m.userId, name: m.userId, email: '', passwordHash: '', avatarUrl: '', preferredCurrency: 'INR' as const, createdAt: '' }]));
    const t4 = performance.now();
    const { netMap } = calculateGroupBalances(members, usersMap, expenses, []);
    const greedyResult = simplifyDebts(netMap);
    const t5 = performance.now();
    const oldTime = t5 - t4;

    const totalNewTime = ledgerTime; // Reading ledger is just reading directDebts!
    const speedup = `${(oldTime / Math.max(0.01, ledgerTime)).toFixed(1)}x`;

    results.push({
      scale: cfg.scale,
      members: cfg.members,
      expenses: cfg.expenses,
      allocationsTimeMs: Math.round(allocTime * 100) / 100,
      ledgerConsolidationTimeMs: Math.round(ledgerTime * 100) / 100,
      oldGreedyTimeMs: Math.round(oldTime * 100) / 100,
      speedup
    });

    console.log(`  - Direct Debt Allocations Generation: ${allocTime.toFixed(2)} ms (${allAllocations.length} total allocations)`);
    console.log(`  - Direct Debt Ledger Consolidation:   ${ledgerTime.toFixed(2)} ms (${directDebts.length} active debts)`);
    console.log(`  - Old Full Scan + Greedy Solver:      ${oldTime.toFixed(2)} ms`);
    console.log(`  - Steady-State Query Speedup:         ${speedup} faster\n`);
  }

  console.log('========================================================================');
  console.log('📊 PERFORMANCE BENCHMARK SUMMARY TABLE');
  console.log('========================================================================');
  console.table(results);
  console.log('========================================================================\n');
}

runBenchmarks().catch(console.error);

