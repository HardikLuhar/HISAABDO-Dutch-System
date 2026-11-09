import { Expense, Settlement, ExpenseSplit, ExpensePayer, SplitType, MemberBalance, PairwiseDebt, SimplifiedDebt, User, ExpenseDebtAllocation, DirectDebt } from './types.js';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round((rupees + Number.EPSILON) * 100);
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Validates and computes exact splits based on split type.
 * Uses integer paise to ensure 100% penny-conservation (sum of splits === total amount).
 */
export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: { userId: string; exactAmount?: number; percentage?: number; shares?: number }[]
): { valid: boolean; error?: string; splits: ExpenseSplit[] } {
  if (!participants.length) {
    return { valid: false, error: 'At least one participant is required', splits: [] };
  }

  const totalPaise = rupeesToPaise(totalAmount);
  if (totalPaise <= 0) {
    return { valid: false, error: 'Total amount must be greater than zero', splits: [] };
  }

  const splits: ExpenseSplit[] = [];

  if (splitType === 'EQUAL') {
    const count = participants.length;
    const baseSharePaise = Math.floor(totalPaise / count);
    let distributedPaise = 0;

    for (let i = 0; i < count; i++) {
      let sharePaise = baseSharePaise;
      // allocate remaining pennies to the last participant
      if (i === count - 1) {
        sharePaise = totalPaise - distributedPaise;
      } else {
        distributedPaise += sharePaise;
      }
      splits.push({
        userId: participants[i].userId,
        amount: paiseToRupees(sharePaise)
      });
    }
    return { valid: true, splits };
  }

  if (splitType === 'EXACT') {
    let sumPaise = 0;
    for (const p of participants) {
      const amtPaise = rupeesToPaise(p.exactAmount ?? 0);
      if (amtPaise < 0) {
        return { valid: false, error: 'Exact amounts cannot be negative', splits: [] };
      }
      sumPaise += amtPaise;
      splits.push({
        userId: p.userId,
        amount: paiseToRupees(amtPaise)
      });
    }

    if (Math.abs(sumPaise - totalPaise) > 5) {
      return {
        valid: false,
        error: `Sum of exact amounts (${paiseToRupees(sumPaise)}) must equal total amount (${totalAmount})`,
        splits: []
      };
    }
    return { valid: true, splits };
  }

  if (splitType === 'PERCENTAGE') {
    let sumPct = 0;
    for (const p of participants) {
      const pct = p.percentage ?? 0;
      if (pct < 0) {
        return { valid: false, error: 'Percentages cannot be negative', splits: [] };
      }
      sumPct = round2(sumPct + pct);
    }

    if (Math.abs(sumPct - 100) > 0.05) {
      return {
        valid: false,
        error: `Sum of percentages (${sumPct}%) must equal 100%`,
        splits: []
      };
    }

    let distributedPaise = 0;
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const pct = p.percentage ?? 0;
      let amtPaise = 0;
      if (i === participants.length - 1) {
        amtPaise = totalPaise - distributedPaise;
      } else {
        amtPaise = Math.round((totalPaise * pct) / 100);
        distributedPaise += amtPaise;
      }
      splits.push({
        userId: p.userId,
        amount: paiseToRupees(amtPaise),
        percentage: pct
      });
    }
    return { valid: true, splits };
  }

  if (splitType === 'SHARES') {
    let totalShares = 0;
    for (const p of participants) {
      const sh = Math.max(0, p.shares ?? 1);
      totalShares += sh;
    }

    if (totalShares <= 0) {
      return { valid: false, error: 'Total shares must be greater than zero', splits: [] };
    }

    let distributedPaise = 0;
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const sh = Math.max(0, p.shares ?? 1);
      let amtPaise = 0;
      if (i === participants.length - 1) {
        amtPaise = totalPaise - distributedPaise;
      } else {
        amtPaise = Math.round((totalPaise * sh) / totalShares);
        distributedPaise += amtPaise;
      }
      splits.push({
        userId: p.userId,
        amount: paiseToRupees(amtPaise),
        shares: sh
      });
    }
    return { valid: true, splits };
  }

  return { valid: false, error: 'Invalid split type', splits: [] };
}

/**
 * DIRECT DEBT ENGINE: Computes deterministic debtor-creditor allocations for a single expense.
 * 
 * Rules:
 * 1. Calculate each participant's contribution difference: paid - share (in integer paise).
 * 2. Positive difference = Creditor (paid more than share).
 * 3. Negative difference = Debtor (paid less than share).
 * 4. Generates debtor-creditor relationships ONLY among actual expense participants.
 * 5. Multi-payer debts are distributed proportionally to each creditor's surplus contribution.
 * 6. Never creates self-debts.
 * 7. 100% exact conservation of integer paise (no money created or lost).
 */
export function computeExpenseAllocations(expense: {
  id: string;
  groupId: string;
  amount: number;
  paidBy: ExpensePayer[];
  splits: ExpenseSplit[];
}): ExpenseDebtAllocation[] {
  const allocations: ExpenseDebtAllocation[] = [];
  const totalExpensePaise = rupeesToPaise(expense.amount);
  if (totalExpensePaise <= 0) return [];

  // 1. Tally payments in paise per participant
  const paidMap = new Map<string, number>();
  for (const payer of expense.paidBy) {
    const pPaise = rupeesToPaise(payer.amount);
    paidMap.set(payer.userId, (paidMap.get(payer.userId) || 0) + pPaise);
  }

  // 2. Tally shares in paise per participant
  const shareMap = new Map<string, number>();
  for (const split of expense.splits) {
    const sPaise = rupeesToPaise(split.amount);
    shareMap.set(split.userId, (shareMap.get(split.userId) || 0) + sPaise);
  }

  // 3. Collect all unique participants in this expense
  const allUserIds = new Set<string>([...paidMap.keys(), ...shareMap.keys()]);

  // 4. Determine creditors and debtors
  interface Party {
    userId: string;
    amountPaise: number;
  }

  const creditors: Party[] = [];
  const debtors: Party[] = [];

  for (const userId of allUserIds) {
    const paid = paidMap.get(userId) || 0;
    const share = shareMap.get(userId) || 0;
    const diff = paid - share;

    if (diff > 0) {
      creditors.push({ userId, amountPaise: diff });
    } else if (diff < 0) {
      debtors.push({ userId, amountPaise: Math.abs(diff) });
    }
  }

  if (creditors.length === 0 || debtors.length === 0) {
    return [];
  }

  // Total surplus must equal total deficit
  const totalSurplusPaise = creditors.reduce((sum, c) => sum + c.amountPaise, 0);

  // Deterministic sorting: highest amount first, tie-break by userId
  creditors.sort((a, b) => b.amountPaise - a.amountPaise || a.userId.localeCompare(b.userId));
  debtors.sort((a, b) => b.amountPaise - a.amountPaise || a.userId.localeCompare(b.userId));

  // 5. Track remaining capacity for each creditor
  const creditorCapacity = new Map<string, number>();
  for (const c of creditors) {
    creditorCapacity.set(c.userId, c.amountPaise);
  }

  // 6. Proportional Biproportional Allocation with Penny-Exact Conservation
  for (let dIdx = 0; dIdx < debtors.length; dIdx++) {
    const debtor = debtors[dIdx];
    let debtorRemaining = debtor.amountPaise;

    // For the last debtor, assign exactly the remaining capacities of all creditors
    if (dIdx === debtors.length - 1) {
      for (const creditor of creditors) {
        const remainingCap = creditorCapacity.get(creditor.userId) || 0;
        if (remainingCap > 0 && debtor.userId !== creditor.userId) {
          allocations.push({
            id: `eda_${expense.id}_${debtor.userId}_${creditor.userId}`,
            expenseId: expense.id,
            groupId: expense.groupId,
            debtorId: debtor.userId,
            creditorId: creditor.userId,
            amountPaise: remainingCap,
            amount: paiseToRupees(remainingCap),
            createdAt: new Date().toISOString()
          });
          creditorCapacity.set(creditor.userId, 0);
        }
      }
      continue;
    }

    // For non-last debtors, compute ideal proportional allocations
    const rawAllocations: { creditorId: string; floorPaise: number; remainder: number }[] = [];
    let allocatedSum = 0;

    for (const creditor of creditors) {
      const remainingCap = creditorCapacity.get(creditor.userId) || 0;
      if (remainingCap <= 0 || debtor.userId === creditor.userId) continue;

      const ideal = (debtor.amountPaise * creditor.amountPaise) / totalSurplusPaise;
      const floorPaise = Math.min(remainingCap, Math.floor(ideal));
      const remainder = ideal - Math.floor(ideal);

      rawAllocations.push({
        creditorId: creditor.userId,
        floorPaise,
        remainder
      });
      allocatedSum += floorPaise;
    }

    // Distribute remaining fractional paise to creditors with highest remainder
    let leftover = debtorRemaining - allocatedSum;
    rawAllocations.sort((a, b) => b.remainder - a.remainder);

    for (const item of rawAllocations) {
      const remainingCap = creditorCapacity.get(item.creditorId) || 0;
      if (leftover > 0 && item.floorPaise < remainingCap) {
        item.floorPaise += 1;
        leftover -= 1;
      }
    }

    // Finalize allocations for this debtor
    for (const item of rawAllocations) {
      if (item.floorPaise > 0) {
        allocations.push({
          id: `eda_${expense.id}_${debtor.userId}_${item.creditorId}`,
          expenseId: expense.id,
          groupId: expense.groupId,
          debtorId: debtor.userId,
          creditorId: item.creditorId,
          amountPaise: item.floorPaise,
          amount: paiseToRupees(item.floorPaise),
          createdAt: new Date().toISOString()
        });

        const currentCap = creditorCapacity.get(item.creditorId) || 0;
        creditorCapacity.set(item.creditorId, currentCap - item.floorPaise);
      }
    }
  }

  return allocations;
}

/**
 * Aggregates all expense debt allocations and confirmed settlements into
 * a consolidated Direct Debt Ledger for a group.
 * 
 * Rules:
 * 1. Accumulates repeated debts between the same debtor and creditor (A owes B ₹100 + ₹200 -> ₹300).
 * 2. Confirmed settlements reduce debt from payer to receiver.
 * 3. Consolidates reciprocal debts between the same two people (A owes B 500, B owes A 200 -> A owes B 300).
 * 4. NEVER redirects debt to an unrelated third party.
 */
export function consolidateDirectDebts(
  groupId: string,
  allocations: ExpenseDebtAllocation[],
  settlements: Settlement[]
): DirectDebt[] {
  // Directed debt matrix in paise: `${debtorId}->${creditorId}` => paise
  const matrix = new Map<string, number>();
  const getKey = (from: string, to: string) => `${from}->${to}`;

  // 1. Add all expense allocations
  for (const alloc of allocations) {
    if (alloc.debtorId === alloc.creditorId) continue;
    const key = getKey(alloc.debtorId, alloc.creditorId);
    matrix.set(key, (matrix.get(key) || 0) + alloc.amountPaise);
  }

  // 2. Subtract confirmed settlements
  for (const s of settlements) {
    if (s.payerId === s.receiverId) continue;
    const key = getKey(s.payerId, s.receiverId);
    const sPaise = rupeesToPaise(s.amount);
    matrix.set(key, (matrix.get(key) || 0) - sPaise);
  }

  // 3. Consolidate reciprocal debts between each pair
  const allUserIds = new Set<string>();
  for (const alloc of allocations) {
    allUserIds.add(alloc.debtorId);
    allUserIds.add(alloc.creditorId);
  }
  for (const s of settlements) {
    allUserIds.add(s.payerId);
    allUserIds.add(s.receiverId);
  }

  const userList = Array.from(allUserIds);
  const directDebts: DirectDebt[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < userList.length; i++) {
    for (let j = i + 1; j < userList.length; j++) {
      const u1 = userList[i];
      const u2 = userList[j];
      const pairKey = [u1, u2].sort().join(':');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const d1to2 = matrix.get(getKey(u1, u2)) || 0;
      const d2to1 = matrix.get(getKey(u2, u1)) || 0;
      const netPaise = d1to2 - d2to1;

      if (netPaise > 0) {
        directDebts.push({
          id: `dd_${groupId}_${u1}_${u2}`,
          groupId,
          debtorId: u1,
          creditorId: u2,
          outstandingPaise: netPaise,
          amount: paiseToRupees(netPaise),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else if (netPaise < 0) {
        directDebts.push({
          id: `dd_${groupId}_${u2}_${u1}`,
          groupId,
          debtorId: u2,
          creditorId: u1,
          outstandingPaise: Math.abs(netPaise),
          amount: paiseToRupees(Math.abs(netPaise)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  return directDebts;
}

/**
 * Calculate net balances for each group member.
 * Net = (Total Paid + Settlements Paid) - (Total Share + Settlements Received)
 */
export function calculateGroupBalances(
  members: { userId: string }[],
  usersMap: Map<string, User>,
  expenses: Expense[],
  settlements: Settlement[]
): {
  balances: MemberBalance[];
  netMap: Map<string, number>;
} {
  const paidMap = new Map<string, number>();
  const shareMap = new Map<string, number>();
  const netMap = new Map<string, number>();

  for (const m of members) {
    paidMap.set(m.userId, 0);
    shareMap.set(m.userId, 0);
    netMap.set(m.userId, 0);
  }

  // 1. Process Expenses
  for (const exp of expenses) {
    for (const payer of exp.paidBy) {
      const current = paidMap.get(payer.userId) || 0;
      paidMap.set(payer.userId, round2(current + payer.amount));
    }
    for (const split of exp.splits) {
      const current = shareMap.get(split.userId) || 0;
      shareMap.set(split.userId, round2(current + split.amount));
    }
  }

  // 2. Process Settlements
  const settlementsPaidMap = new Map<string, number>();
  const settlementsReceivedMap = new Map<string, number>();
  for (const s of settlements) {
    settlementsPaidMap.set(s.payerId, round2((settlementsPaidMap.get(s.payerId) || 0) + s.amount));
    settlementsReceivedMap.set(s.receiverId, round2((settlementsReceivedMap.get(s.receiverId) || 0) + s.amount));
  }

  const balances: MemberBalance[] = [];

  for (const m of members) {
    const user = usersMap.get(m.userId);
    const paid = paidMap.get(m.userId) || 0;
    const share = shareMap.get(m.userId) || 0;
    const sPaid = settlementsPaidMap.get(m.userId) || 0;
    const sRecv = settlementsReceivedMap.get(m.userId) || 0;

    const net = round2((paid + sPaid) - (share + sRecv));
    netMap.set(m.userId, net);

    balances.push({
      userId: m.userId,
      name: user ? user.name : 'Unknown Member',
      email: user ? user.email : '',
      avatarUrl: user ? user.avatarUrl : '',
      paid,
      share,
      net
    });
  }

  return { balances, netMap };
}

/**
 * RECONCILIATION & AUDIT TOOL:
 * Calculates raw pairwise debts directly from original expense records and settlements.
 * Kept strictly for verification, migration audits, and reconciliation.
 * Must NOT be used to generate simplified or redirected payment suggestions.
 */
export function calculatePairwiseDebts(
  members: { userId: string }[],
  expenses: Expense[],
  settlements: Settlement[]
): PairwiseDebt[] {
  const debtMatrix = new Map<string, number>();
  const getKey = (from: string, to: string) => `${from}->${to}`;

  for (const exp of expenses) {
    const totalExpense = exp.amount;
    if (totalExpense <= 0) continue;

    for (const split of exp.splits) {
      const debtorId = split.userId;
      const debtorAmount = split.amount;

      for (const payer of exp.paidBy) {
        const creditorId = payer.userId;
        if (debtorId === creditorId) continue;

        const payerProportion = payer.amount / totalExpense;
        const owedToCreditor = round2(debtorAmount * payerProportion);

        const key = getKey(debtorId, creditorId);
        debtMatrix.set(key, round2((debtMatrix.get(key) || 0) + owedToCreditor));
      }
    }
  }

  for (const s of settlements) {
    const key = getKey(s.payerId, s.receiverId);
    debtMatrix.set(key, round2((debtMatrix.get(key) || 0) - s.amount));
  }

  const result: PairwiseDebt[] = [];
  const processedPairs = new Set<string>();
  const allUserIds = members.map(m => m.userId);

  for (let i = 0; i < allUserIds.length; i++) {
    for (let j = i + 1; j < allUserIds.length; j++) {
      const u1 = allUserIds[i];
      const u2 = allUserIds[j];
      const pairKey = [u1, u2].sort().join(':');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const d1to2 = debtMatrix.get(getKey(u1, u2)) || 0;
      const d2to1 = debtMatrix.get(getKey(u2, u1)) || 0;
      const netDebt = round2(d1to2 - d2to1);

      if (netDebt > 0.01) {
        result.push({ fromUserId: u1, toUserId: u2, amount: netDebt });
      } else if (netDebt < -0.01) {
        result.push({ fromUserId: u2, toUserId: u1, amount: Math.abs(netDebt) });
      }
    }
  }

  return result;
}

/**
 * @deprecated
 * Legacy Greedy Min-Cash-Flow Solver.
 * Kept for interface compatibility, but redirected payments are permanently replaced
 * by the Direct Debt Ledger in all active settlement and display flows.
 */
export function simplifyDebts(netMap: Map<string, number>): {
  transactions: SimplifiedDebt[];
  unsimplifiedCount: number;
  simplifiedCount: number;
  transactionsSaved: number;
} {
  interface Node {
    userId: string;
    amount: number;
  }

  const debtors: Node[] = [];
  const creditors: Node[] = [];

  for (const [userId, net] of netMap.entries()) {
    if (net < -0.01) {
      debtors.push({ userId, amount: Math.abs(net) });
    } else if (net > 0.01) {
      creditors.push({ userId, amount: net });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedDebt[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = round2(Math.min(debtor.amount, creditor.amount));

    if (settledAmount > 0.01) {
      transactions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: settledAmount
      });
    }

    debtor.amount = round2(debtor.amount - settledAmount);
    creditor.amount = round2(creditor.amount - settledAmount);

    if (debtor.amount <= 0.01) {
      dIdx++;
    }
    if (creditor.amount <= 0.01) {
      cIdx++;
    }
  }

  return {
    transactions,
    unsimplifiedCount: 0,
    simplifiedCount: transactions.length,
    transactionsSaved: 0
  };
}
