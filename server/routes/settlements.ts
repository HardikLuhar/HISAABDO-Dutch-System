import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './auth.js';
import { round2 } from '../engine.js';
import { Settlement } from '../types.js';
import { sendPushToUser } from '../push.js';

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

    // Only the payment receiver can record a settlement
    const currentUserId = req.user?.id;
    if (currentUserId !== receiverId) {
      return res.status(403).json({ error: 'Only the payment receiver can settle this debt' });
    }

    const settleAmount = round2(Number(amount));
    if (isNaN(settleAmount) || settleAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const groupMemberIds = new Set(group.members.map((m: any) => m.userId));
    if (!groupMemberIds.has(payerId) || !groupMemberIds.has(receiverId)) {
      return res.status(400).json({ error: 'Both payer and receiver must be members of this group' });
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

    // Notify the payer that the receiver has marked/confirmed the settlement
    if (groupMemberIds.has(payerId)) {
      const currSymbol = group.defaultCurrency === 'INR' ? '₹' : `${group.defaultCurrency} `;
      const settleMessage = `🤝 ${req.user.name} settled ${currSymbol}${settleAmount} with you in ${group.name}`;

      await db.createNotification({
        id: `notif_${Date.now()}`,
        userId: payerId,
        type: 'SETTLEMENT_RECORDED',
        title: 'Payment Settled',
        message: settleMessage,
        groupId,
        relatedId: settlementId,
        read: false,
        createdAt: new Date().toISOString()
      });

      // Send push notification directly to Android notification tray
      await sendPushToUser(payerId, {
        title: 'Payment Settled',
        body: settleMessage,
        url: `/?group=${groupId}`
      });
    }

    // Log activity
    await db.createActivity({
      id: `act_${Date.now()}`,
      groupId,
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatarUrl,
      action: 'RECORDED_SETTLEMENT',
      description: `${receiver ? receiver.name : 'Unknown'} marked ${group.defaultCurrency} ${settleAmount} settled from ${payer ? payer.name : 'Unknown'}`,
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
    const settlements = await db.getSettlementsByGroup(groupId);
    const settlement = settlements.find(s => s.id === id);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    if (req.user?.id !== settlement.receiverId) {
      return res.status(403).json({ error: 'Only the payment receiver can delete this settlement' });
    }

    await db.deleteSettlement(id);
    return res.json({ message: 'Settlement deleted successfully' });
  } catch (err: any) {
    console.error('delete settlement error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
