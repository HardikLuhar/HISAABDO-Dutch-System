import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './auth.js';
import { createSessionToken } from '../auth.js';
import { calculateGroupBalances, calculatePairwiseDebts, simplifyDebts } from '../engine.js';
import { Group, GroupCategory, CurrencyCode, User, GroupMember } from '../types.js';

export const groupsRouter = Router();

// Helper to determine if a user has site administrator privileges (Hardik)
export function checkIsSiteAdmin(user: any): boolean {
  if (!user) return false;
  const nameMatch = user.name && user.name.trim().toLowerCase() === 'hardik';
  const emailMatch = user.email && user.email.toLowerCase().includes('hardik');
  return Boolean(nameMatch || emailMatch);
}

// Public Group Info for Shared Links (No auth required)
groupsRouter.get('/:id/public', async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await db.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const usersMap = new Map<string, User>((await db.getUsers()).map(u => [u.id, u]));
    const members = group.members.map(m => {
      const u = usersMap.get(m.userId);
      return {
        userId: m.userId,
        name: u ? u.name : 'Member',
        avatarUrl: u ? u.avatarUrl : '',
        role: m.role
      };
    });

    return res.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        category: group.category,
        defaultCurrency: group.defaultCurrency,
        inviteCode: group.inviteCode,
        members
      }
    });
  } catch (err: any) {
    console.error('public group error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Member Login with Unique Member Passcode via Shared Link
groupsRouter.post('/:id/member-login', async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId, passcode } = req.body;

    if (!userId || !passcode) {
      return res.status(400).json({ error: 'Please select your name and enter your member password' });
    }

    const group = await db.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const member = group.members.find(m => m.userId === userId);
    if (!member) {
      return res.status(404).json({ error: 'Selected person is not a member of this group' });
    }

    const cleanPasscode = String(passcode).trim();
    if (member.memberPasscode !== cleanPasscode) {
      return res.status(401).json({ error: 'Incorrect member password. Please check the code provided for you.' });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const token = createSessionToken(user.id);
    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      user: safeUser,
      token,
      group: {
        id: group.id,
        name: group.name,
        defaultCurrency: group.defaultCurrency
      }
    });
  } catch (err: any) {
    console.error('member-login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Member Change Password (using current password to set new password without prior auth session)
groupsRouter.post('/:id/member-change-password', async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId, currentPasscode, newPasscode } = req.body;

    if (!userId || !currentPasscode || !newPasscode) {
      return res.status(400).json({ error: 'Please provide your member ID, current password, and new password' });
    }

    const group = await db.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const member = group.members.find(m => m.userId === userId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    const cleanCurrent = String(currentPasscode).trim();
    if (member.memberPasscode !== cleanCurrent) {
      return res.status(401).json({ error: 'Current password does not match' });
    }

    const cleanNew = String(newPasscode).trim();
    if (cleanNew.length < 2) {
      return res.status(400).json({ error: 'New password must be at least 2 characters long' });
    }

    // Check if another member in this group already has this passcode
    const isTaken = group.members.some(m => m.userId !== userId && m.memberPasscode === cleanNew);
    if (isTaken) {
      return res.status(400).json({ error: 'This password is already taken by another member in this group. Please choose a different one.' });
    }

    const updated = await db.updateGroupMemberPasscode(groupId, userId, cleanNew);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to save new password' });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const token = createSessionToken(user.id);
    const { passwordHash: _, ...safeUser } = user;

    // Add activity log
    await db.createActivity({
      id: `act_${Date.now()}`,
      groupId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl,
      action: 'MEMBER_JOINED' as any,
      description: `${user.name} set their personal password`,
      createdAt: new Date().toISOString()
    });

    return res.json({
      message: 'Password changed successfully! You can now log in anytime with your new password.',
      user: safeUser,
      token,
      passcode: cleanNew,
      group: {
        id: group.id,
        name: group.name,
        defaultCurrency: group.defaultCurrency
      }
    });
  } catch (err: any) {
    console.error('member-change-password error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// List user's groups with balance summaries (Site Admin Hardik sees all groups)
groupsRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const isSiteAdmin = checkIsSiteAdmin(req.user);
    // 1. Fetch user's groups (all groups if site admin) and users list in parallel
    const [groups, allUsers] = await Promise.all([
      isSiteAdmin ? db.getGroups() : db.getGroupsForUser(userId),
      db.getUsers()
    ]);

    if (!groups || groups.length === 0) {
      return res.json({ groups: [] });
    }

    const groupIds = groups.map(g => g.id);
    const usersMap = new Map<string, User>(allUsers.map(u => [u.id, u]));

    // 2. Batch fetch all expenses, settlements, and activities in parallel
    const [expensesByGroup, settlementsByGroup, activitiesByGroup] = await Promise.all([
      db.getExpensesByGroupIds(groupIds),
      db.getSettlementsByGroupIds(groupIds),
      db.getLatestActivitiesByGroupIds(groupIds)
    ]);

    // 3. Compute group balance summaries in memory instantly (<1ms)
    const enrichedGroups = groups.map(g => {
      const expenses = expensesByGroup.get(g.id) || [];
      const settlements = settlementsByGroup.get(g.id) || [];
      const { netMap } = calculateGroupBalances(g.members, usersMap, expenses, settlements);

      const userBalance = netMap.get(userId) || 0;
      const lastActivity = activitiesByGroup.get(g.id) || g.createdAt;

      // Enriched member details including passcode for the group members
      const membersSummary = g.members.map(m => {
        const u = usersMap.get(m.userId);
        return {
          userId: m.userId,
          name: u ? u.name : 'Unknown',
          email: u ? u.email : '',
          avatarUrl: u ? u.avatarUrl : '',
          role: m.role,
          memberPasscode: m.memberPasscode
        };
      });

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        category: g.category,
        defaultCurrency: g.defaultCurrency,
        inviteCode: g.inviteCode,
        createdAt: g.createdAt,
        membersCount: g.members.length,
        members: membersSummary,
        userBalance, // >0: user is owed, <0: user owes
        expensesCount: expenses.length,
        lastActivity
      };
    });

    return res.json({ groups: enrichedGroups });
  } catch (err: any) {
    console.error('get groups error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Create Group
groupsRouter.post('/', requireAuth, async (req: any, res) => {
  try {
    const { name, description = '', category = 'Trip', defaultCurrency = 'INR', memberEmails = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const groupId = `grp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const inviteCode = (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) + Math.floor(1000 + Math.random() * 9000)).toUpperCase();

    const members: GroupMember[] = [
      {
        userId: req.user.id,
        role: 'admin',
        joinedAt: new Date().toISOString()
      }
    ];

    // If member names or emails provided, find existing registered users only
    const skippedNames: string[] = [];
    if (Array.isArray(memberEmails)) {
      const allUsers = await db.getUsers();
      for (const rawItem of memberEmails) {
        const cleanItem = (rawItem || '').trim();
        if (!cleanItem || cleanItem.toLowerCase() === req.user.email.toLowerCase() || cleanItem.toLowerCase() === req.user.name.toLowerCase()) continue;
        const existingUser = allUsers.find(u =>
          u.email.toLowerCase() === cleanItem.toLowerCase() ||
          u.name.toLowerCase() === cleanItem.toLowerCase()
        );
        if (!existingUser) {
          // Skip non-registered users — don't create stubs
          skippedNames.push(cleanItem);
          continue;
        }

        if (!members.some(m => m.userId === existingUser.id)) {
          members.push({
            userId: existingUser.id,
            role: 'member' as const,
            joinedAt: new Date().toISOString()
          });
        }
      }
    }

    const newGroup: Group = {
      id: groupId,
      name: name.trim(),
      description: description.trim(),
      category: category as GroupCategory,
      defaultCurrency: defaultCurrency as CurrencyCode,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      inviteCode,
      members
    };

    await db.createGroup(newGroup);

    await db.createActivity({
      id: `act_${Date.now()}`,
      groupId,
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatarUrl,
      action: 'JOINED_GROUP',
      description: `${req.user.name} created group "${newGroup.name}"`,
      createdAt: new Date().toISOString()
    });

    // Notify only the group creator / admin
    await db.createNotification({
      id: `notif_${Date.now()}_grp`,
      userId: req.user.id,
      type: 'GROUP_INVITE',
      title: 'Group Created',
      message: `You created group "${newGroup.name}" as admin.`,
      groupId,
      read: false,
      createdAt: new Date().toISOString()
    });

    const response: any = { group: newGroup };
    if (skippedNames.length > 0) {
      response.skippedNames = skippedNames;
      response.warning = `The following names were not found as registered users and were skipped: ${skippedNames.join(', ')}. They need to register first before being added.`;
    }

    return res.status(201).json(response);
  } catch (err: any) {
    console.error('create group error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get single group details with complete calculations
groupsRouter.get('/:id', requireAuth, async (req: any, res) => {
  try {
    const groupId = req.params.id;
    const group = await db.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => m.userId === req.user.id);
    const isSiteAdmin = checkIsSiteAdmin(req.user);
    if (!isMember && !isSiteAdmin) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const usersMap = new Map<string, User>((await db.getUsers()).map(u => [u.id, u]));
    const expenses = await db.getExpensesByGroup(groupId);
    const settlements = await db.getSettlementsByGroup(groupId);

    // Calculate Net Balances
    const { balances, netMap } = calculateGroupBalances(group.members, usersMap, expenses, settlements);

    // Calculate Raw Pairwise Debts (Before Simplification)
    const pairwiseDebts = calculatePairwiseDebts(group.members, expenses, settlements);

    // Calculate Smart Simplified Debts (After Simplification)
    const simplifiedResult = simplifyDebts(netMap);
    simplifiedResult.unsimplifiedCount = pairwiseDebts.length;
    simplifiedResult.transactionsSaved = Math.max(0, pairwiseDebts.length - simplifiedResult.transactions.length);

    // Map user details to debts
    const formatDebt = (debt: { fromUserId: string; toUserId: string; amount: number }) => {
      const fromUser = usersMap.get(debt.fromUserId);
      const toUser = usersMap.get(debt.toUserId);
      return {
        fromUserId: debt.fromUserId,
        fromName: fromUser ? fromUser.name : 'Unknown',
        fromAvatar: fromUser ? fromUser.avatarUrl : '',
        toUserId: debt.toUserId,
        toName: toUser ? toUser.name : 'Unknown',
        toAvatar: toUser ? toUser.avatarUrl : '',
        amount: debt.amount
      };
    };

    const detailedPairwise = pairwiseDebts.map(formatDebt);
    const detailedSimplified = simplifiedResult.transactions.map(formatDebt);

    // Total Group Spending
    const totalSpending = expenses.reduce((acc, e) => acc + e.amount, 0);

    // Current user's specific status
    const myNet = netMap.get(req.user.id) || 0;
    const myDebtsOwed = detailedSimplified.filter(d => d.fromUserId === req.user.id);
    const myDebtsDueToMe = detailedSimplified.filter(d => d.toUserId === req.user.id);

    return res.json({
      group,
      totalSpending,
      balances,
      myNet,
      myDebtsOwed,
      myDebtsDueToMe,
      debtSimplification: {
        unsimplified: detailedPairwise,
        simplified: detailedSimplified,
        unsimplifiedCount: pairwiseDebts.length,
        simplifiedCount: detailedSimplified.length,
        transactionsSaved: simplifiedResult.transactionsSaved
      }
    });
  } catch (err: any) {
    console.error('get group detail error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update Group Settings
groupsRouter.put('/:id', requireAuth, async (req: any, res) => {
  try {
    const groupId = req.params.id;
    const group = await db.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const member = group.members.find(m => m.userId === req.user.id);
    const isSiteAdmin = checkIsSiteAdmin(req.user);
    if ((!member || member.role !== 'admin') && !isSiteAdmin) {
      return res.status(403).json({ error: 'Only group admins can modify group settings' });
    }

    const { name, description, category, defaultCurrency } = req.body;
    const updates: Partial<Group> = {};

    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category) updates.category = category;
    if (defaultCurrency) updates.defaultCurrency = defaultCurrency;

    const updated = await db.updateGroup(groupId, updates);
    return res.json({ group: updated });
  } catch (err: any) {
    console.error('update group error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete Group
groupsRouter.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const groupId = req.params.id;
    const group = await db.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const member = group.members.find(m => m.userId === req.user.id);
    const isSiteAdmin = checkIsSiteAdmin(req.user);
    if ((!member || member.role !== 'admin') && !isSiteAdmin) {
      return res.status(403).json({ error: 'Only group admins can delete the group' });
    }

    await db.deleteGroup(groupId);
    return res.json({ message: 'Group deleted successfully' });
  } catch (err: any) {
    console.error('delete group error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Add Member by Email or Username (Admin or Site Admin only, must be existing registered user)
groupsRouter.post('/:id/members', requireAuth, async (req: any, res) => {
  try {
    const groupId = req.params.id;
    const { identifier } = req.body; // email or name

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Email or name is required' });
    }

    const group = await db.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Permission check: Only group admin or site admin (Hardik) can add members
    const isGroupAdmin = group.members.some(m => m.userId === req.user.id && m.role === 'admin');
    const isSiteAdmin = checkIsSiteAdmin(req.user);

    if (!isGroupAdmin && !isSiteAdmin) {
      return res.status(403).json({ error: 'Only the group admin can add members' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const allUsers = await db.getUsers();
    let user = allUsers.find(u =>
      u.email.toLowerCase() === cleanId ||
      u.name.toLowerCase() === cleanId
    );

    if (!user) {
      return res.status(404).json({ error: `No registered user found with the name or email "${identifier.trim()}". The person must register first before they can be added to a group.` });
    }

    const result = await db.addGroupMember(groupId, user.id, 'member');
    if (!result.success) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Notify user
    await db.createNotification({
      id: `notif_${Date.now()}`,
      userId: user.id,
      type: 'GROUP_INVITE',
      title: 'Added to Group',
      message: `${req.user.name} added you to "${group.name}".`,
      groupId,
      read: false,
      createdAt: new Date().toISOString()
    });

    await db.createActivity({
      id: `act_${Date.now()}`,
      groupId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl,
      action: 'JOINED_GROUP',
      description: `${user.name} joined "${group.name}"`,
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Member added successfully', user, passcode: result.passcode });
  } catch (err: any) {
    console.error('add member error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update Member Passcode (admin or member themselves)
groupsRouter.put('/:id/members/:userId/passcode', requireAuth, async (req: any, res) => {
  try {
    const { id: groupId, userId } = req.params;
    const { passcode } = req.body;

    if (!passcode || !String(passcode).trim()) {
      return res.status(400).json({ error: 'Passcode cannot be empty' });
    }

    const group = await db.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => m.userId === req.user.id);
    const isSiteAdmin = checkIsSiteAdmin(req.user);
    if (!isMember && !isSiteAdmin) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const isAdmin = isSiteAdmin || group.members.some(m => m.userId === req.user.id && m.role === 'admin');
    if (!isAdmin && req.user.id !== userId) {
      return res.status(403).json({ error: 'You can only update your own password' });
    }

    const cleanPasscode = String(passcode).trim();
    if (cleanPasscode.length < 2) {
      return res.status(400).json({ error: 'Password must be at least 2 characters long' });
    }

    const isTaken = group.members.some(m => m.userId !== userId && m.memberPasscode === cleanPasscode);
    if (isTaken) {
      return res.status(400).json({ error: 'This password is already taken by another member in this group. Please choose a different one.' });
    }

    const updated = await db.updateGroupMemberPasscode(groupId, userId, cleanPasscode);
    if (!updated) {
      return res.status(400).json({ error: 'Failed to update passcode' });
    }

    return res.json({ message: 'Passcode updated successfully', passcode: cleanPasscode });
  } catch (err: any) {
    console.error('update passcode error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Remove Member (Preserves history rule!)
groupsRouter.delete('/:id/members/:userId', requireAuth, async (req: any, res) => {
  try {
    const { id: groupId, userId } = req.params;
    const group = await db.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const admin = group.members.find(m => m.userId === req.user.id);
    const isSiteAdmin = checkIsSiteAdmin(req.user);
    if ((!admin || admin.role !== 'admin') && !isSiteAdmin) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    const result = await db.removeGroupMember(groupId, userId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ message: 'Member removed successfully' });
  } catch (err: any) {
    console.error('remove member error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Join group via Invite Code
groupsRouter.post('/join', requireAuth, async (req: any, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const group = await db.getGroupByInviteCode(inviteCode.trim());
    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const added = await db.addGroupMember(group.id, req.user.id, 'member');
    if (!added.success) {
      return res.json({ message: 'You are already a member of this group', group });
    }

    return res.json({ message: `Joined ${group.name} successfully!`, group });
  } catch (err: any) {
    console.error('join group error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
