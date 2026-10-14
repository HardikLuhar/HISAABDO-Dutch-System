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
      description: `${receiver ? receiver.name : 'Unknown'} marked ${group.defaultCurrency} ${settleAmount} settled from ${payer ? payer.name : 'Unknown'} in group "${group.name}"`,
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

// ─── Settlement Claims API (Multi-Group Settle & Anti-Fake Verification) ───────

// 1. Payer submits a settlement claim (QR or Cash)
settlementsRouter.post('/claims', requireAuth, async (req: any, res) => {
  try {
    const { receiverId, totalAmount, paymentMethod, groupDebts } = req.body;

    if (!receiverId || !totalAmount || !Array.isArray(groupDebts) || !groupDebts.length) {
      return res.status(400).json({ error: 'Receiver ID, total amount, and group debts are required.' });
    }

    if (receiverId === req.user.id) {
      return res.status(400).json({ error: 'You cannot submit a settlement claim to yourself.' });
    }

    let receiver = await db.getUserById(receiverId);
    if (!receiver) {
      receiver = (await db.getUsers()).find(u => u.id === receiverId);
    }
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver user not found.' });
    }

    const claimId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newClaim = await db.createSettlementClaim({
      id: claimId,
      payerId: req.user.id,
      payerName: req.user.name,
      payerAvatar: req.user.avatarUrl || '',
      receiverId,
      receiverName: receiver.name,
      totalAmount: round2(Number(totalAmount)),
      paymentMethod: paymentMethod === 'CASH' ? 'CASH' : 'UPI',
      groupDebts,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const methodLabel = paymentMethod === 'CASH' ? 'Cash' : 'UPI';
    const groupNames = groupDebts.map((g: any) => g.groupName).join(', ');
    const claimMessage = `🔔 ${req.user.name} claims to have paid you ₹${totalAmount} via ${methodLabel} to settle debts in [${groupNames}]. Please confirm receipt!`;

    // Notify receiver
    await db.createNotification({
      id: `notif_${Date.now()}`,
      userId: receiverId,
      type: 'SETTLEMENT_CLAIM',
      title: 'Payment Verification Request',
      message: claimMessage,
      relatedId: claimId,
      read: false,
      createdAt: new Date().toISOString()
    });

    await sendPushToUser(receiverId, {
      title: 'Payment Verification Request',
      body: claimMessage,
      url: `/?claim=${claimId}`
    });

    return res.status(201).json({ claim: newClaim });
  } catch (err: any) {
    console.error('create claim error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 2. Get pending settlement claims for current user (as receiver)
settlementsRouter.get('/claims/pending', requireAuth, async (req: any, res) => {
  try {
    const claims = await db.getPendingClaimsForReceiver(req.user.id);
    return res.json({ claims });
  } catch (err: any) {
    console.error('get pending claims error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 3. Receiver ACCEPTS payment claim -> automatically settles all groups in one go!
settlementsRouter.post('/claims/:id/accept', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const claim = await db.getClaimById(id);

    if (!claim) {
      return res.status(404).json({ error: 'Settlement claim not found.' });
    }

    if (claim.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the payment receiver can confirm and settle this claim.' });
    }

    if (claim.status !== 'PENDING') {
      return res.status(400).json({ error: `This claim has already been ${claim.status.toLowerCase()}.` });
    }

    // Automatically settle each group in one atomic sweep
    let settledCount = 0;
    const errors: string[] = [];

    for (const gd of claim.groupDebts) {
      try {
        const group = await db.getGroupById(gd.groupId);
        if (!group) continue;

        const settlementId = `set_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await db.createSettlement({
          id: settlementId,
          groupId: gd.groupId,
          payerId: claim.payerId,
          receiverId: req.user.id,
          amount: round2(Number(gd.amount)),
          currency: gd.currency || group.defaultCurrency || 'INR',
          date: new Date().toISOString().split('T')[0],
          notes: `Verified settlement (${claim.paymentMethod === 'CASH' ? 'Cash' : 'UPI'}) across multi-group claim`,
          createdAt: new Date().toISOString()
        });

        // Log activity for this group
        await db.createActivity({
          id: `act_${Date.now()}_${settledCount}`,
          groupId: gd.groupId,
          userId: req.user.id,
          userName: req.user.name,
          userAvatar: req.user.avatarUrl,
          action: 'RECORDED_SETTLEMENT',
          description: `${req.user.name} confirmed ₹${gd.amount} payment from ${claim.payerName} in group "${group.name}"`,
          amount: gd.amount,
          currency: gd.currency || group.defaultCurrency,
          createdAt: new Date().toISOString()
        });

        settledCount++;
      } catch (e: any) {
        errors.push(`${gd.groupName}: ${e.message}`);
      }
    }

    // Mark claim accepted
    await db.updateClaim(id, { status: 'ACCEPTED' });

    // Notify payer that receiver accepted!
    const groupList = claim.groupDebts.map(g => g.groupName).join(', ');
    const acceptedMsg = `🤝 ${req.user.name} confirmed receipt of ₹${claim.totalAmount} (${claim.paymentMethod === 'CASH' ? 'Cash' : 'UPI'}). Debts in [${groupList}] are now completely settled!`;

    await db.createNotification({
      id: `notif_${Date.now()}`,
      userId: claim.payerId,
      type: 'SETTLEMENT_RECORDED',
      title: 'Payment Confirmed & Settled!',
      message: acceptedMsg,
      relatedId: id,
      read: false,
      createdAt: new Date().toISOString()
    });

    await sendPushToUser(claim.payerId, {
      title: 'Payment Confirmed & Settled!',
      body: acceptedMsg,
      url: '/?tab=summary'
    });

    return res.json({ success: true, settledCount, errors });
  } catch (err: any) {
    console.error('accept claim error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 4. Receiver REJECTS payment claim (Fake claim defense)
settlementsRouter.post('/claims/:id/reject', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const claim = await db.getClaimById(id);

    if (!claim) {
      return res.status(404).json({ error: 'Settlement claim not found.' });
    }

    if (claim.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Only the payment receiver can reject this claim.' });
    }

    if (claim.status !== 'PENDING') {
      return res.status(400).json({ error: `This claim has already been ${claim.status.toLowerCase()}.` });
    }

    // Mark claim rejected
    await db.updateClaim(id, { status: 'REJECTED', rejectionReason: reason || 'Not received' });

    // Send notification to payer that receiver rejected payment
    const rejectedMsg = `❌ Payment is declined. ${req.user.name} ne bola paise nahi mile. Pay again or settle again.`;

    await db.createNotification({
      id: `notif_${Date.now()}`,
      userId: claim.payerId,
      type: 'SETTLEMENT_CLAIM',
      title: 'Payment is declined',
      message: rejectedMsg,
      relatedId: id,
      read: false,
      createdAt: new Date().toISOString()
    });

    await sendPushToUser(claim.payerId, {
      title: 'Payment is declined',
      body: rejectedMsg,
      url: '/?tab=summary'
    });

    return res.json({ success: true, message: 'Claim rejected. Payer has been notified.' });
  } catch (err: any) {
    console.error('reject claim error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
