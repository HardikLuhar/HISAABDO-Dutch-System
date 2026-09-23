import { Expense, Settlement, ExpenseSplit, ExpensePayer, SplitType, MemberBalance, PairwiseDebt, SimplifiedDebt, User } from './types';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Validates and computes exact splits based on split type.
 */
export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: { userId: string; exactAmount?: number; percentage?: number; shares?: number }[]
): { valid: boolean; error?: string; splits: ExpenseSplit[] } {
  if (!participants.length) {
    return { valid: false, error: 'At least one participant is required', splits: [] };
  }

  if (totalAmount <= 0) {
    return { valid: false, error: 'Total amount must be greater than zero', splits: [] };
  }

  const splits: ExpenseSplit[] = [];

  if (splitType === 'EQUAL') {
    const count = participants.length;
    const baseShare = Math.floor((totalAmount / count) * 100) / 100;
    let distributed = 0;

    for (let i = 0; i < count; i++) {
      let share = baseShare;
      // allocate remaining pennies to the first few participants
      if (i === count - 1) {
        share = round2(totalAmount - distributed);
      } else {
        distributed += share;
      }
      splits.push({
        userId: participants[i].userId,
        amount: share
      });
    }
    return { valid: true, splits };
  }

  if (splitType === 'EXACT') {
    let sum = 0;
    for (const p of participants) {
      const amt = round2(p.exactAmount ?? 0);
      if (amt < 0) {
        return { valid: false, error: 'Exact amounts cannot be negative', splits: [] };
      }
      sum = round2(sum + amt);
      splits.push({
        userId: p.userId,
        amount: amt
      });
    }

    if (Math.abs(sum - totalAmount) > 0.05) {
      return {
        valid: false,
        error: `Sum of exact amounts (${sum}) must equal total amount (${totalAmount})`,
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

    let distributed = 0;
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const pct = p.percentage ?? 0;
      let amt = 0;
      if (i === participants.length - 1) {
        amt = round2(totalAmount - distributed);
      } else {
        amt = round2((totalAmount * pct) / 100);
        distributed = round2(distributed + amt);
      }
      splits.push({
        userId: p.userId,
        amount: amt,
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

    let distributed = 0;
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const sh = Math.max(0, p.shares ?? 1);
      let amt = 0;
      if (i === participants.length - 1) {
        amt = round2(totalAmount - distributed);
      } else {
        amt = round2((totalAmount * sh) / totalShares);
        distributed = round2(distributed + amt);
      }
      splits.push({
        userId: p.userId,
        amount: amt,
        shares: sh
      });
    }
    return { valid: true, splits };
  }

  return { valid: false, error: 'Invalid split type', splits: [] };
}

/**
 * Calculate net balances for each group member.
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

    // Net calculation:
    // What I paid (expenses) + what I gave in settlements - what I owed (share) - what I received in settlements
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
 * Calculates raw pairwise debts before debt simplification.
 */
export function calculatePairwiseDebts(
  members: { userId: string }[],
  expenses: Expense[],
  settlements: Settlement[]
): PairwiseDebt[] {
  // Map of `${from}->${to}` to amount
  const debtMatrix = new Map<string, number>();

  const getKey = (from: string, to: string) => `${from}->${to}`;

  // Process expenses
  for (const exp of expenses) {
    const totalExpense = exp.amount;
    if (totalExpense <= 0) continue;

    for (const split of exp.splits) {
      const debtorId = split.userId;
      const debtorAmount = split.amount;

      // Distribute debtor's debt across payers proportionally to what each payer paid
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

  // Process settlements (reduces debt from payer to receiver)
  for (const s of settlements) {
    const key = getKey(s.payerId, s.receiverId);
    debtMatrix.set(key, round2((debtMatrix.get(key) || 0) - s.amount));
  }

  // Consolidate reciprocal debts (A owes B 500, B owes A 200 -> A owes B 300)
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
 * Smart Debt Simplification Algorithm (Min-Cash-Flow Greedy Solver)
 * Takes net balances and computes the minimum number of practical transactions needed.
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

  // Sort descending by amount
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
    unsimplifiedCount: 0, // will be attached with actual pairwise count
    simplifiedCount: transactions.length,
    transactionsSaved: 0
  };
}
