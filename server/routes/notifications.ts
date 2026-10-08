import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './auth.js';
import { VAPID_PUBLIC_KEY, savePushSubscription, removePushSubscription, sendPushToUser } from '../push.js';

export const notificationsRouter = Router();

// Get public VAPID key for frontend registration
notificationsRouter.get('/vapid-key', (req, res) => {
  return res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe device for Web Push notifications
notificationsRouter.post('/subscribe', requireAuth, async (req: any, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Valid subscription object is required' });
    }
    await savePushSubscription(req.user.id, subscription, req.headers['user-agent']);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Push subscribe error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Unsubscribe device
notificationsRouter.post('/unsubscribe', requireAuth, async (req: any, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await removePushSubscription(endpoint);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Send test push to the logged-in user's device
notificationsRouter.post('/test-push', requireAuth, async (req: any, res) => {
  try {
    const testBody = `💸 ${req.user.name} paid ₹500 for dinner and you have to give ₹250 to him`;
    const result = await sendPushToUser(req.user.id, {
      title: 'Hisaabdo',
      body: testBody,
      url: '/'
    });
    return res.json({ success: true, ...result, message: 'Test notification sent to your device!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

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

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const groupMemberIds = new Set(group.members.map((m: any) => m.userId));
    if (!groupMemberIds.has(req.user.id) || !groupMemberIds.has(toUserId)) {
      return res.status(403).json({ error: 'Only members within the group can send or receive reminders for this group' });
    }

    const groupName = group.name;
    const currSymbol = currency === 'INR' ? '₹' : currency;
    const reminderMessage = `⏰ ${req.user.name} reminded you: You have to give ${currSymbol}${amount} to him`;

    // Create notification for the debtor
    const notif = await db.createNotification({
      id: `notif_${Date.now()}_remind`,
      userId: toUserId,
      type: 'PAYMENT_REMINDER',
      title: 'Payment Reminder',
      message: reminderMessage,
      groupId,
      relatedId: JSON.stringify({
        senderName: req.user.name,
        senderId: req.user.id,
        amount: Number(amount),
        currency: currency,
        groupName: groupName
      }),
      read: false,
      createdAt: new Date().toISOString()
    });

    // Send push notification directly to Android notification tray
    await sendPushToUser(toUserId, {
      title: 'Payment Reminder',
      body: reminderMessage,
      url: `/?group=${groupId}`
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
