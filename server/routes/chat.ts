import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './auth.js';
import { ChatMessage } from '../types.js';

export const chatRouter = Router();

// Get chat messages for a group
chatRouter.get('/:groupId/chat', requireAuth, async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const group = await db.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only members can read chat
    const isMember = group.members.some((m: any) => m.userId === req.user?.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Only group members can access chat' });
    }

    const messages = await db.getChatMessages(groupId, limit);
    const usersMap = new Map((await db.getUsers()).map(u => [u.id, u]));

    const enriched = messages.map(m => {
      const u = usersMap.get(m.userId);
      return {
        ...m,
        userName: u ? u.name : 'Unknown',
        userAvatar: u ? u.avatarUrl : '',
      };
    });

    return res.json({ messages: enriched });
  } catch (err: any) {
    console.error('get chat messages error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Send a chat message
chatRouter.post('/:groupId/chat', requireAuth, async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
    }

    const group = await db.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some((m: any) => m.userId === req.user?.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Only group members can send messages' });
    }

    const chatMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      groupId,
      userId: req.user.id,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.createChatMessage(chatMsg);

    return res.status(201).json({
      message: {
        ...chatMsg,
        userName: req.user.name,
        userAvatar: req.user.avatarUrl || '',
      }
    });
  } catch (err: any) {
    console.error('send chat message error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
