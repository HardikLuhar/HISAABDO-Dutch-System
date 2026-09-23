import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './auth.js';

export const notificationsRouter = Router();

// Get current user's notifications
notificationsRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const notifications = await db.getNotificationsForUser(req.user.id);
    const unreadCount = notifications.filter(n => !n.read).length;
    return res.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error('get notifications error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Mark single notification as read
notificationsRouter.post('/:id/read', requireAuth, async (req: any, res) => {
  try {
    await db.markNotificationAsRead(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('mark notification read error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Mark all as read
notificationsRouter.post('/read-all', requireAuth, async (req: any, res) => {
  try {
    await db.markAllNotificationsAsRead(req.user.id);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('mark all read error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Send payment reminder (Requirement 17)
notificationsRouter.post('/remind', requireAuth, async (req: any, res) => {
  try {
    const { toUserId, groupId, amount, currency = 'INR' } = req.body;

    if (!toUserId || !groupId) {
      return res.status(400).json({ error: 'Target member and group are required' });
    }

    const debtor = await db.getUserById(toUserId);
    const group = await db.getGroupById(groupId);

    if (!debtor) {
      return res.status(404).json({ error: 'Debtor not found' });
    }

    const groupName = group ? group.name : 'your shared group';

    // Create notification for the debtor
    const notif = await db.createNotification({
      id: `notif_${Date.now()}_remind`,
      userId: toUserId,
      type: 'PAYMENT_REMINDER',
      title: 'Payment Reminder',
      message: `${req.user.name} sent a friendly reminder: You owe ${currency} ${amount} in "${groupName}".`,
      groupId,
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
      action: 'SENT_REMINDER',
      description: `${req.user.name} sent a payment reminder to ${debtor.name} for ${currency} ${amount}`,
      amount,
      currency,
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `Reminder sent to ${debtor.name} for ${currency} ${amount}`
    });
  } catch (err: any) {
    console.error('send reminder error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Activity feed
export const activityRouter = Router();

activityRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const { groupId, limit } = req.query;
    const activities = await db.getActivities(
      typeof groupId === 'string' ? groupId : undefined,
      limit ? Number(limit) : 25
    );
    return res.json({ activities });
  } catch (err: any) {
    console.error('get activities error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
