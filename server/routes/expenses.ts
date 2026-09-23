import { Router } from 'express';
import { db } from '../db';
import { requireAuth } from './auth';
import { calculateSplits, round2 } from '../engine';
import { Expense, ExpensePayer, SplitType } from '../types';

export const expensesRouter = Router();

// Check for duplicate expense before submission (Section 25)
expensesRouter.post('/:groupId/expenses/check-duplicate', requireAuth, async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const { description, amount, date } = req.body;

    if (!description || !amount || !date) {
      return res.json({ isDuplicate: false });
    }

    const dup = await db.findPossibleDuplicate(groupId, description, Number(amount), date);
    if (dup) {
      return res.json({
        isDuplicate: true,
        message: `"${dup.description} ${dup.currency} ${dup.amount}" was already added on ${dup.date}. Are you sure you want to add another?`
      });
    }

    return res.json({ isDuplicate: false });
  } catch (err: any) {
    console.error('check-duplicate error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// List expenses for a group with filtering & search
expensesRouter.get('/:groupId/expenses', requireAuth, async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const { search, category, payerId, participantId, startDate, endDate } = req.query;

    let expenses = await db.getExpensesByGroup(groupId);
    const usersMap = new Map((await db.getUsers()).map(u => [u.id, u]));

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      expenses = expenses.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      expenses = expenses.filter(e => e.category.toLowerCase() === category.toLowerCase());
    }

    if (payerId && typeof payerId === 'string' && payerId !== 'ALL') {
      expenses = expenses.filter(e => e.paidBy.some(p => p.userId === payerId));
    }

    if (participantId && typeof participantId === 'string' && participantId !== 'ALL') {
      expenses = expenses.filter(e => e.splits.some(s => s.userId === participantId));
    }

    if (startDate && typeof startDate === 'string') {
      expenses = expenses.filter(e => e.date >= startDate);
    }

    if (endDate && typeof endDate === 'string') {
      expenses = expenses.filter(e => e.date <= endDate);
    }

    // Enrich with user names and avatars
    const enriched = expenses.map(exp => {
      const paidByWithDetails = exp.paidBy.map(p => {
        const u = usersMap.get(p.userId);
        return {
          ...p,
          userName: u ? u.name : 'Unknown',
          userAvatar: u ? u.avatarUrl : ''
        };
      });

      const splitsWithDetails = exp.splits.map(s => {
        const u = usersMap.get(s.userId);
        return {
          ...s,
          userName: u ? u.name : 'Unknown',
          userAvatar: u ? u.avatarUrl : ''
        };
      });

      const creator = usersMap.get(exp.createdBy);

      return {
        ...exp,
        paidBy: paidByWithDetails,
        splits: splitsWithDetails,
        createdByName: creator ? creator.name : 'Unknown'
      };
    });

    return res.json({ expenses: enriched });
  } catch (err: any) {
    console.error('get expenses error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Create Expense
expensesRouter.post('/:groupId/expenses', requireAuth, async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const group = await db.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const {
      description,
      amount,
      date = new Date().toISOString().split('T')[0],
      category = 'Food',
      notes,
      receiptUrl,
      receiptData,
      paidBy, // Array<{ userId: string, amount: number }> or single payer object
      splitType = 'EQUAL',
      participants // Array<{ userId: string, exactAmount?: number, percentage?: number, shares?: number }>
    } = req.body;

    const totalAmount = round2(Number(amount));
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // 1. Process Payers
    let payersList: ExpensePayer[] = [];
    if (Array.isArray(paidBy) && paidBy.length > 0) {
      let payerSum = 0;
      for (const p of paidBy) {
        const pAmt = round2(Number(p.amount));
        if (pAmt <= 0) continue;
        payerSum = round2(payerSum + pAmt);
        payersList.push({ userId: p.userId, amount: pAmt });
      }
      if (Math.abs(payerSum - totalAmount) > 0.05) {
        return res.status(400).json({
          error: `Sum of amounts paid by members (${payerSum}) does not match total expense (${totalAmount})`
        });
      }
    } else if (typeof paidBy === 'string') {
      // Single payer userId provided
      payersList = [{ userId: paidBy, amount: totalAmount }];
    } else if (paidBy && paidBy.userId) {
      payersList = [{ userId: paidBy.userId, amount: totalAmount }];
    } else {
      // Default to current user
      payersList = [{ userId: req.user.id, amount: totalAmount }];
    }

    // 2. Process Splits
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'Please select at least one participant' });
    }

    const splitResult = calculateSplits(totalAmount, splitType as SplitType, participants);
    if (!splitResult.valid) {
      return res.status(400).json({ error: splitResult.error });
    }

    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newExpense: Expense = {
      id: expenseId,
      groupId,
      description: description.trim(),
      amount: totalAmount,
      currency: group.defaultCurrency,
      category,
      date,
      notes: notes ? notes.trim() : undefined,
      receiptUrl: receiptUrl || undefined,
      receiptData: receiptData || undefined,
      paidBy: payersList,
      splitType: splitType as SplitType,
      splits: splitResult.splits,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.createExpense(newExpense);

    // 3. Log Activity
    const payerNames = [];
    for (const p of payersList) {
      const u = await db.getUserById(p.userId);
      payerNames.push(u ? u.name : 'Unknown');
    }

    await db.createActivity({
      id: `act_${Date.now()}`,
      groupId,
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatarUrl,
      action: 'CREATED_EXPENSE',
      description: `${req.user.name} added "${newExpense.description}" (${group.defaultCurrency} ${newExpense.amount})`,
      amount: totalAmount,
      currency: group.defaultCurrency,
      createdAt: new Date().toISOString()
    });

    // 4. Send Notifications to participants (excluding the creator)
    for (const s of splitResult.splits) {
      if (s.userId !== req.user.id) {
        await db.createNotification({
          id: `notif_${Date.now()}_${s.userId}`,
          userId: s.userId,
          type: 'EXPENSE_ADDED',
          title: 'New Expense Added',
          message: `${req.user.name} added "${newExpense.description}" (${group.defaultCurrency} ${totalAmount}). Your share: ${group.defaultCurrency} ${s.amount}.`,
          groupId,
          relatedId: expenseId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    return res.status(201).json({ expense: newExpense });
  } catch (err: any) {
    console.error('create expense error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update Expense
expensesRouter.put('/:groupId/expenses/:id', requireAuth, async (req: any, res) => {
  try {
    const { groupId, id } = req.params;
    const existing = await db.getExpenseById(id);

    if (!existing || existing.groupId !== groupId) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const {
      description,
      amount,
      date,
      category,
      notes,
      receiptUrl,
      receiptData,
      paidBy,
      splitType,
      participants
    } = req.body;

    const totalAmount = amount !== undefined ? round2(Number(amount)) : existing.amount;
    const currentSplitType = splitType || existing.splitType;

    let payersList = existing.paidBy;
    if (paidBy) {
      if (Array.isArray(paidBy)) {
        const sum = paidBy.reduce((acc: number, p: any) => acc + round2(Number(p.amount)), 0);
        if (Math.abs(sum - totalAmount) > 0.05) {
          return res.status(400).json({ error: 'Payer sum does not match total amount' });
        }
        payersList = paidBy.map((p: any) => ({ userId: p.userId, amount: round2(Number(p.amount)) }));
      } else {
        payersList = [{ userId: paidBy.userId || req.user.id, amount: totalAmount }];
      }
    }

    let newSplits = existing.splits;
    if (participants && Array.isArray(participants)) {
      const splitResult = calculateSplits(totalAmount, currentSplitType as SplitType, participants);
      if (!splitResult.valid) {
        return res.status(400).json({ error: splitResult.error });
      }
      newSplits = splitResult.splits;
    }

    const updated = await db.updateExpense(id, {
      description: description ? description.trim() : existing.description,
      amount: totalAmount,
      date: date || existing.date,
      category: category || existing.category,
      notes: notes !== undefined ? notes : existing.notes,
      receiptUrl: receiptUrl !== undefined ? receiptUrl : existing.receiptUrl,
      receiptData: receiptData !== undefined ? receiptData : existing.receiptData,
      paidBy: payersList,
      splitType: currentSplitType,
      splits: newSplits
    });

    await db.createActivity({
      id: `act_${Date.now()}`,
      groupId,
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatarUrl,
      action: 'UPDATED_EXPENSE',
      description: `${req.user.name} updated "${updated?.description}"`,
      amount: totalAmount,
      currency: existing.currency,
      createdAt: new Date().toISOString()
    });

    return res.json({ expense: updated });
  } catch (err: any) {
    console.error('update expense error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete Expense - Disabled (expenses can be edited but cannot be deleted)
expensesRouter.delete('/:groupId/expenses/:id', requireAuth, (req: any, res) => {
  return res.status(403).json({
    error: 'Expenses cannot be deleted once added to maintain financial integrity. You can edit the expense details instead.'
  });
});
