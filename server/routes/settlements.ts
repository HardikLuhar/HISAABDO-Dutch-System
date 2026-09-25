import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './auth.js';
import { round2 } from '../engine.js';
import { Settlement } from '../types.js';

export const settlementsRouter = Router();

// List settlements for group
settlementsRouter.get('/:groupId/settlements', requireAuth, async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const settlements = await db.getSettlementsByGroup(groupId);
    const usersMap = new Map((await db.getUsers()).map(u => [u.id, u]));

    const enriched = settlements.map(s => {
      const payer = usersMap.get(s.payerId);
      const receiver = usersMap.get(s.receiverId);
      return {
        ...s,
        payerName: payer ? payer.name : 'Unknown',
        payerAvatar: payer ? payer.avatarUrl : '',
        receiverName: receiver ? receiver.name : 'Unknown',
        receiverAvatar: receiver ? receiver.avatarUrl : ''
      };
    });

    return res.json({ settlements: enriched });
  } catch (err: any) {
    console.error('get settlements error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Record new Settlement (full or partial payment)
settlementsRouter.post('/:groupId/settlements', requireAuth, async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const group = await db.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const {
      payerId,
      receiverId,
      amount,
      date = new Date().toISOString().split('T')[0],
      notes
    } = req.body;

    if (!payerId || !receiverId) {
      return res.status(400).json({ error: 'Both payer and receiver are required' });
    }

    if (payerId === receiverId) {
      return res.status(400).json({ error: 'Payer and receiver cannot be the same person' });
    }

    // Only the debt payer or receiver can record a settlement
    const currentUserId = req.user?.id;
    if (currentUserId !== payerId && currentUserId !== receiverId) {
      return res.status(403).json({ error: 'Only the debt provider or debt taker can settle this debt' });
    }

    const settleAmount = round2(Number(amount));
    if (isNaN(settleAmount) || settleAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const payer = await db.getUserById(payerId);
    const receiver = await db.getUserById(receiverId);

    const settlementId = `set_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const settlement: Settlement = {
      id: settlementId,
      groupId,
      payerId,
      receiverId,
      amount: settleAmount,
      currency: group.defaultCurrency,
      date,
      notes: notes ? notes.trim() : undefined,
      createdAt: new Date().toISOString()
    };

    await db.createSettlement(settlement);

    // Notify receiver
    await db.createNotification({
      id: `notif_${Date.now()}`,
      userId: receiverId,
      type: 'SETTLEMENT_RECORDED',
      title: 'Payment Received',
      message: `${payer ? payer.name : 'Someone'} recorded a payment of ${group.defaultCurrency} ${settleAmount} to you in "${group.name}".`,
      groupId,
      relatedId: settlementId,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Log activity
    await db.createActivity({
      id: `act_${Date.now()}`,
      groupId,
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatarUrl,
      action: 'RECORDED_SETTLEMENT',
      description: `${payer ? payer.name : 'Unknown'} settled ${group.defaultCurrency} ${settleAmount} with ${receiver ? receiver.name : 'Unknown'}`,
      amount: settleAmount,
      currency: group.defaultCurrency,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({ settlement });
  } catch (err: any) {
    console.error('create settlement error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete settlement
settlementsRouter.delete('/:groupId/settlements/:id', requireAuth, async (req: any, res) => {
  try {
    const { groupId, id } = req.params;
    await db.deleteSettlement(id);
    return res.json({ message: 'Settlement deleted successfully' });
  } catch (err: any) {
    console.error('delete settlement error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
