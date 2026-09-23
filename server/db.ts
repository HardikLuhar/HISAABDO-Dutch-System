import { supabase } from './supabase.js';
import { User, Group, GroupMember, Expense, Settlement, NotificationItem, ActivityItem } from './types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert snake_case DB row to camelCase User object */
function rowToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash ?? '',
    avatarUrl: row.avatar_url ?? '',
    phone: row.phone ?? undefined,
    preferredCurrency: row.preferred_currency ?? 'INR',
    createdAt: row.created_at,
  };
}

/** Convert snake_case DB row to camelCase Expense object */
function rowToExpense(row: any): Expense {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    date: row.date,
    notes: row.notes ?? undefined,
    receiptUrl: row.receipt_url ?? undefined,
    receiptData: row.receipt_data ?? undefined,
    paidBy: row.paid_by ?? [],
    splitType: row.split_type,
    splits: row.splits ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert snake_case DB row to camelCase Settlement object */
function rowToSettlement(row: any): Settlement {
  return {
    id: row.id,
    groupId: row.group_id,
    payerId: row.payer_id,
    receiverId: row.receiver_id,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.date,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

/** Convert snake_case DB row to camelCase NotificationItem */
function rowToNotification(row: any): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    groupId: row.group_id ?? undefined,
    relatedId: row.related_id ?? undefined,
    read: row.read ?? false,
    createdAt: row.created_at,
  };
}

/** Convert snake_case DB row to camelCase ActivityItem */
function rowToActivity(row: any): ActivityItem {
  return {
    id: row.id,
    groupId: row.group_id ?? undefined,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar ?? '',
    action: row.action,
    description: row.description,
    amount: row.amount != null ? Number(row.amount) : undefined,
    currency: row.currency ?? undefined,
    createdAt: row.created_at,
  };
}

/** Convert snake_case group_members row to GroupMember */
function rowToGroupMember(row: any): GroupMember {
  return {
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    memberPasscode: row.member_passcode ?? undefined,
  };
}

// ─── Database Class ─────────────────────────────────────────────────────────

class Database {

  // ─── User Operations ────────────────────────────────────────────────────

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    if (error) { console.error('getUsers error:', error); return []; }
    return (data || []).map(rowToUser);
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return undefined;
    return rowToUser(data);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const clean = (email || '').toLowerCase().trim();
    if (!clean) return undefined;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', clean)
      .maybeSingle();
    if (error || !data) return undefined;
    return rowToUser(data);
  }

  async findUserByIdentifier(identifier: string): Promise<User | undefined> {
    const clean = (identifier || '').trim();
    if (!clean) return undefined;
    const cleanLower = clean.toLowerCase();

    // 1. Exact email match (case-insensitive)
    let { data } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanLower)
      .maybeSingle();
    if (data) return rowToUser(data);

    // 2. Exact name match (case-insensitive)
    ({ data } = await supabase
      .from('users')
      .select('*')
      .ilike('name', cleanLower)
      .maybeSingle());
    if (data) return rowToUser(data);

    // 3. Broader search — fetch all users and do in-memory matching for edge cases
    const allUsers = await this.getUsers();

    // Name match with collapsed spaces
    const collapsed = cleanLower.replace(/\s+/g, ' ');
    let user = allUsers.find(u => (u.name || '').trim().toLowerCase().replace(/\s+/g, ' ') === collapsed);
    if (user) return user;

    // Email prefix matching
    if (cleanLower.includes('@')) {
      const prefix = cleanLower.split('@')[0];
      user = allUsers.find(u =>
        (u.name || '').trim().toLowerCase() === prefix ||
        (u.email || '').toLowerCase().startsWith(prefix + '_') ||
        (u.email || '').toLowerCase().startsWith(prefix + '@')
      );
      if (user) return user;
    } else {
      user = allUsers.find(u =>
        (u.email || '').toLowerCase().startsWith(cleanLower + '_') ||
        (u.email || '').toLowerCase().startsWith(cleanLower + '@')
      );
      if (user) return user;
    }

    return undefined;
  }

  async createUser(user: User): Promise<User> {
    const { error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.passwordHash || '',
        avatar_url: user.avatarUrl || '',
        phone: user.phone || null,
        preferred_currency: user.preferredCurrency || 'INR',
        created_at: user.createdAt || new Date().toISOString(),
      });
    if (error) console.error('createUser error:', error);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.passwordHash !== undefined) dbUpdates.password_hash = updates.passwordHash;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.preferredCurrency !== undefined) dbUpdates.preferred_currency = updates.preferredCurrency;

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error || !data) { console.error('updateUser error:', error); return null; }
    return rowToUser(data);
  }

  // ─── Group Operations ────────────────────────────────────────────────────

  /** Fetch a group row + its members from group_members table */
  private async assembleGroup(groupRow: any): Promise<Group> {
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupRow.id);

    return {
      id: groupRow.id,
      name: groupRow.name,
      description: groupRow.description ?? '',
      category: groupRow.category ?? 'Trip',
      defaultCurrency: groupRow.default_currency ?? 'INR',
      createdBy: groupRow.created_by,
      createdAt: groupRow.created_at,
      inviteCode: groupRow.invite_code,
      members: (memberRows || []).map(rowToGroupMember),
    };
  }

  async getGroups(): Promise<Group[]> {
    const { data, error } = await supabase.from('groups').select('*');
    if (error || !data) return [];
    const groups: Group[] = [];
    for (const row of data) {
      groups.push(await this.assembleGroup(row));
    }
    return groups;
  }

  async getGroupsForUser(userId: string): Promise<Group[]> {
    const user = await this.getUserById(userId);

    // Get all group_ids where user is a member
    const { data: membershipRows } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    const memberGroupIds = new Set((membershipRows || []).map(r => r.group_id));

    // Also get groups the user created (self-healing)
    const { data: createdRows } = await supabase
      .from('groups')
      .select('id')
      .eq('created_by', userId);

    const createdGroupIds = (createdRows || []).map(r => r.id);

    // Merge and deduplicate
    for (const gid of createdGroupIds) {
      if (!memberGroupIds.has(gid)) {
        // Self-healing: creator should be a member
        await supabase.from('group_members').upsert({
          group_id: gid,
          user_id: userId,
          role: 'admin',
          joined_at: new Date().toISOString(),
        }, { onConflict: 'group_id,user_id' });
        memberGroupIds.add(gid);
      }
    }

    if (memberGroupIds.size === 0) return [];

    // Fetch all groups
    const { data: groupRows } = await supabase
      .from('groups')
      .select('*')
      .in('id', Array.from(memberGroupIds));

    if (!groupRows) return [];

    const groups: Group[] = [];
    for (const row of groupRows) {
      groups.push(await this.assembleGroup(row));
    }

    // Self-healing: match by email/name for re-registered users
    if (user) {
      const userEmail = (user.email || '').toLowerCase().trim();
      const userName = (user.name || '').toLowerCase().trim();

      // Get ALL group_members where userId matches a user with same email/name
      const allUsers = await this.getUsers();
      const matchingUserIds = allUsers
        .filter(u => u.id !== userId && (
          (userEmail && (u.email || '').toLowerCase() === userEmail) ||
          (userName && (u.name || '').toLowerCase() === userName)
        ))
        .map(u => u.id);

      if (matchingUserIds.length > 0) {
        const { data: extraMemberships } = await supabase
          .from('group_members')
          .select('group_id')
          .in('user_id', matchingUserIds);

        for (const row of (extraMemberships || [])) {
          if (!memberGroupIds.has(row.group_id)) {
            // Update the member entry to point to the current userId
            await supabase
              .from('group_members')
              .update({ user_id: userId })
              .eq('group_id', row.group_id)
              .in('user_id', matchingUserIds);

            memberGroupIds.add(row.group_id);
            // Fetch and add this group
            const { data: gRow } = await supabase
              .from('groups')
              .select('*')
              .eq('id', row.group_id)
              .maybeSingle();
            if (gRow) {
              groups.push(await this.assembleGroup(gRow));
            }
          }
        }
      }
    }

    return groups;
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return undefined;

    const group = await this.assembleGroup(data);

    // Ensure all members have unique memberPasscode
    let changed = false;
    const usedCodes = new Set<string>();
    group.members.forEach(m => {
      if (m.memberPasscode) usedCodes.add(m.memberPasscode);
    });

    for (const m of group.members) {
      if (!m.memberPasscode) {
        let code = Math.floor(1000 + Math.random() * 9000).toString();
        while (usedCodes.has(code)) {
          code = Math.floor(1000 + Math.random() * 9000).toString();
        }
        usedCodes.add(code);
        m.memberPasscode = code;
        changed = true;

        // Persist to DB
        await supabase
          .from('group_members')
          .update({ member_passcode: code })
          .eq('group_id', id)
          .eq('user_id', m.userId);
      }
    }

    return group;
  }

  async getGroupByInviteCode(code: string): Promise<Group | undefined> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .ilike('invite_code', code.toUpperCase())
      .maybeSingle();
    if (error || !data) return undefined;
    return this.assembleGroup(data);
  }

  async createGroup(group: Group): Promise<Group> {
    // Ensure each member has a unique passcode
    const usedCodes = new Set<string>();
    group.members.forEach(m => {
      if (m.memberPasscode) {
        usedCodes.add(m.memberPasscode);
      } else {
        let code = Math.floor(1000 + Math.random() * 9000).toString();
        while (usedCodes.has(code)) {
          code = Math.floor(1000 + Math.random() * 9000).toString();
        }
        usedCodes.add(code);
        m.memberPasscode = code;
      }
    });

    // Insert the group
    const { error: groupError } = await supabase
      .from('groups')
      .insert({
        id: group.id,
        name: group.name,
        description: group.description || '',
        category: group.category || 'Trip',
        default_currency: group.defaultCurrency || 'INR',
        created_by: group.createdBy,
        created_at: group.createdAt || new Date().toISOString(),
        invite_code: group.inviteCode,
      });
    if (groupError) console.error('createGroup error:', groupError);

    // Insert members
    if (group.members.length > 0) {
      const memberRows = group.members.map(m => ({
        group_id: group.id,
        user_id: m.userId,
        role: m.role || 'member',
        joined_at: m.joinedAt || new Date().toISOString(),
        member_passcode: m.memberPasscode || null,
      }));
      const { error: memError } = await supabase.from('group_members').insert(memberRows);
      if (memError) console.error('createGroup members error:', memError);
    }

    return group;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | null> {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.defaultCurrency !== undefined) dbUpdates.default_currency = updates.defaultCurrency;

    const { error } = await supabase
      .from('groups')
      .update(dbUpdates)
      .eq('id', id);
    if (error) { console.error('updateGroup error:', error); return null; }

    const group = await this.getGroupById(id);
    return group || null;
  }

  async updateGroupMemberPasscode(groupId: string, userId: string, newPasscode: string): Promise<boolean> {
    const { error } = await supabase
      .from('group_members')
      .update({ member_passcode: newPasscode.trim() })
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) { console.error('updateGroupMemberPasscode error:', error); return false; }
    return true;
  }

  async deleteGroup(id: string): Promise<boolean> {
    // Delete associated expenses and settlements first
    await supabase.from('expenses').delete().eq('group_id', id);
    await supabase.from('settlements').delete().eq('group_id', id);
    // group_members deleted via CASCADE

    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) { console.error('deleteGroup error:', error); return false; }
    return true;
  }

  async addGroupMember(groupId: string, userId: string, role: 'admin' | 'member' = 'member', customPasscode?: string): Promise<{ success: boolean; passcode: string }> {
    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return { success: false, passcode: existing.member_passcode || '' };
    }

    // Get existing passcodes to avoid duplicates
    const { data: allMembers } = await supabase
      .from('group_members')
      .select('member_passcode')
      .eq('group_id', groupId);

    const usedCodes = new Set<string>((allMembers || []).map(m => m.member_passcode || ''));
    let passcode = customPasscode?.trim() || Math.floor(1000 + Math.random() * 9000).toString();
    while (usedCodes.has(passcode)) {
      passcode = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString(),
        member_passcode: passcode,
      });
    if (error) { console.error('addGroupMember error:', error); return { success: false, passcode: '' }; }

    return { success: true, passcode };
  }

  async removeGroupMember(groupId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    // Check if member has expense history — preserve historical records
    const { data: expenseCheck } = await supabase
      .from('expenses')
      .select('id')
      .eq('group_id', groupId)
      .limit(1);

    // Check paid_by and splits JSONB for userId
    const expenses = await this.getExpensesByGroup(groupId);
    const hasExpenses = expenses.some(e =>
      e.paidBy.some((p: any) => p.userId === userId) ||
      e.splits.some((s: any) => s.userId === userId)
    );

    if (hasExpenses) {
      return {
        success: false,
        error: 'Cannot remove member with existing expense history. Historical records must be preserved.',
      };
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) { console.error('removeGroupMember error:', error); return { success: false, error: 'Failed to remove member' }; }
    return { success: true };
  }

  // ─── Expense Operations ────────────────────────────────────────────────────

  async getExpensesByGroup(groupId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToExpense);
  }

  async getAllExpensesForUser(userId: string): Promise<Expense[]> {
    // Need to query JSONB fields — get all expenses and filter in memory
    // (Supabase doesn't easily support filtering inside JSONB arrays)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    if (error || !data) return [];
    return data
      .map(rowToExpense)
      .filter(e =>
        e.paidBy.some((p: any) => p.userId === userId) ||
        e.splits.some((s: any) => s.userId === userId)
      );
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return undefined;
    return rowToExpense(data);
  }

  async createExpense(expense: Expense): Promise<Expense> {
    const { error } = await supabase
      .from('expenses')
      .insert({
        id: expense.id,
        group_id: expense.groupId,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        date: expense.date,
        notes: expense.notes || null,
        receipt_url: expense.receiptUrl || null,
        receipt_data: expense.receiptData || null,
        paid_by: expense.paidBy,
        split_type: expense.splitType,
        splits: expense.splits,
        created_by: expense.createdBy,
        created_at: expense.createdAt || new Date().toISOString(),
        updated_at: expense.updatedAt || new Date().toISOString(),
      });
    if (error) console.error('createExpense error:', error);
    return expense;
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    const dbUpdates: any = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.receiptUrl !== undefined) dbUpdates.receipt_url = updates.receiptUrl;
    if (updates.receiptData !== undefined) dbUpdates.receipt_data = updates.receiptData;
    if (updates.paidBy !== undefined) dbUpdates.paid_by = updates.paidBy;
    if (updates.splitType !== undefined) dbUpdates.split_type = updates.splitType;
    if (updates.splits !== undefined) dbUpdates.splits = updates.splits;
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('expenses')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error || !data) { console.error('updateExpense error:', error); return null; }
    return rowToExpense(data);
  }

  async deleteExpense(id: string): Promise<boolean> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('deleteExpense error:', error); return false; }
    return true;
  }

  async findPossibleDuplicate(groupId: string, description: string, amount: number, date: string): Promise<Expense | undefined> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('group_id', groupId)
      .eq('date', date)
      .gte('amount', amount - 0.01)
      .lte('amount', amount + 0.01);

    if (error || !data || data.length === 0) return undefined;

    const match = data.find(row =>
      row.description.trim().toLowerCase() === description.trim().toLowerCase()
    );
    return match ? rowToExpense(match) : undefined;
  }

  // ─── Settlement Operations ────────────────────────────────────────────────

  async getSettlementsByGroup(groupId: string): Promise<Settlement[]> {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToSettlement);
  }

  async getAllSettlementsForUser(userId: string): Promise<Settlement[]> {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .or(`payer_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('date', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToSettlement);
  }

  async createSettlement(settlement: Settlement): Promise<Settlement> {
    const { error } = await supabase
      .from('settlements')
      .insert({
        id: settlement.id,
        group_id: settlement.groupId,
        payer_id: settlement.payerId,
        receiver_id: settlement.receiverId,
        amount: settlement.amount,
        currency: settlement.currency,
        date: settlement.date,
        notes: settlement.notes || null,
        created_at: settlement.createdAt || new Date().toISOString(),
      });
    if (error) console.error('createSettlement error:', error);
    return settlement;
  }

  async deleteSettlement(id: string): Promise<boolean> {
    const { error } = await supabase.from('settlements').delete().eq('id', id);
    if (error) { console.error('deleteSettlement error:', error); return false; }
    return true;
  }

  // ─── Notifications Operations ──────────────────────────────────────────────

  async getNotificationsForUser(userId: string): Promise<NotificationItem[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToNotification);
  }

  async createNotification(notif: NotificationItem): Promise<NotificationItem> {
    const { error } = await supabase
      .from('notifications')
      .insert({
        id: notif.id,
        user_id: notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        group_id: notif.groupId || null,
        related_id: notif.relatedId || null,
        read: notif.read ?? false,
        created_at: notif.createdAt || new Date().toISOString(),
      });
    if (error) console.error('createNotification error:', error);
    return notif;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) { console.error('markNotificationAsRead error:', error); return false; }
    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) console.error('markAllNotificationsAsRead error:', error);
  }

  // ─── Activity Log ──────────────────────────────────────────────────────────

  async getActivities(groupId?: string, limit: number = 20): Promise<ActivityItem[]> {
    let query = supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(rowToActivity);
  }

  async createActivity(act: ActivityItem): Promise<ActivityItem> {
    const { error } = await supabase
      .from('activities')
      .insert({
        id: act.id,
        group_id: act.groupId || null,
        user_id: act.userId,
        user_name: act.userName,
        user_avatar: act.userAvatar || '',
        action: act.action,
        description: act.description,
        amount: act.amount ?? null,
        currency: act.currency || null,
        created_at: act.createdAt || new Date().toISOString(),
      });
    if (error) console.error('createActivity error:', error);
    return act;
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  async clearAllData(): Promise<void> {
    await supabase.from('activities').delete().neq('id', '');
    await supabase.from('notifications').delete().neq('id', '');
    await supabase.from('settlements').delete().neq('id', '');
    await supabase.from('expenses').delete().neq('id', '');
    await supabase.from('group_members').delete().neq('group_id', '');
    await supabase.from('groups').delete().neq('id', '');
    await supabase.from('users').delete().neq('id', '');
  }
}

export const db = new Database();
