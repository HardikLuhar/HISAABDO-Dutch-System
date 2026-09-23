import { Router } from 'express';
import { db } from '../db';
import { requireAuth } from './auth';
import { round2 } from '../engine';

export const analyticsRouter = Router();

analyticsRouter.get('/:groupId', requireAuth, async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const group = await db.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const expenses = await db.getExpensesByGroup(groupId);
    const usersMap = new Map((await db.getUsers()).map(u => [u.id, u]));

    // 1. Total spending and average
    const totalSpending = round2(expenses.reduce((sum, e) => sum + e.amount, 0));
    const expenseCount = expenses.length;
    const averageExpense = expenseCount > 0 ? round2(totalSpending / expenseCount) : 0;

    // 2. Spending by category
    const categoryMap = new Map<string, number>();
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      categoryMap.set(cat, round2((categoryMap.get(cat) || 0) + exp.amount));
    }

    const categoryData = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpending > 0 ? round2((amount / totalSpending) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    const mostExpensiveCategory = categoryData.length > 0 ? categoryData[0] : null;

    // 3. Spending by member (who paid)
    const memberPaidMap = new Map<string, number>();
    for (const exp of expenses) {
      for (const p of exp.paidBy) {
        memberPaidMap.set(p.userId, round2((memberPaidMap.get(p.userId) || 0) + p.amount));
      }
    }

    const memberData = group.members.map(m => {
      const user = usersMap.get(m.userId);
      const paid = memberPaidMap.get(m.userId) || 0;
      return {
        userId: m.userId,
        name: user ? user.name : 'Unknown',
        avatarUrl: user ? user.avatarUrl : '',
        paid,
        percentage: totalSpending > 0 ? round2((paid / totalSpending) * 100) : 0
      };
    }).sort((a, b) => b.paid - a.paid);

    const highestSpender = memberData.length > 0 ? memberData[0] : null;

    // 4. Monthly spending trend
    const monthMap = new Map<string, number>();
    for (const exp of expenses) {
      const month = exp.date.substring(0, 7); // YYYY-MM
      monthMap.set(month, round2((monthMap.get(month) || 0) + exp.amount));
    }

    const monthlyData = Array.from(monthMap.entries()).map(([month, amount]) => {
      const [year, m] = month.split('-');
      const dateObj = new Date(Number(year), Number(m) - 1, 1);
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return {
        monthKey: month,
        monthLabel,
        amount
      };
    }).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // 5. Intelligent Insights
    const insights: string[] = [];
    if (mostExpensiveCategory) {
      insights.push(`${mostExpensiveCategory.category} represents ${mostExpensiveCategory.percentage}% of all expenses (${group.defaultCurrency} ${mostExpensiveCategory.amount}).`);
    }
    if (highestSpender && highestSpender.paid > 0) {
      insights.push(`${highestSpender.name} has paid the most upfront (${group.defaultCurrency} ${highestSpender.paid}, ${highestSpender.percentage}% of total).`);
    }
    if (expenseCount > 0) {
      insights.push(`Average expense across ${expenseCount} items is ${group.defaultCurrency} ${averageExpense}.`);
    }

    return res.json({
      totalSpending,
      expenseCount,
      averageExpense,
      currency: group.defaultCurrency,
      categoryData,
      memberData,
      monthlyData,
      mostExpensiveCategory,
      highestSpender,
      insights
    });
  } catch (err: any) {
    console.error('analytics error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
