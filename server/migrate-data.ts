/**
 * One-time Migration Script: JSON File → Supabase
 * 
 * Reads your existing data/splitwise_db.json and inserts all records
 * into the Supabase PostgreSQL database.
 * 
 * Usage: npx tsx server/migrate-data.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DB_FILE = path.join(process.cwd(), 'data', 'splitwise_db.json');

interface JsonDb {
  users: any[];
  groups: any[];
  expenses: any[];
  settlements: any[];
  notifications: any[];
  activities: any[];
}

async function migrate() {
  console.log('📂 Reading JSON database from:', DB_FILE);

  if (!fs.existsSync(DB_FILE)) {
    console.log('⚠️  No JSON database file found. Nothing to migrate.');
    process.exit(0);
  }

  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const data: JsonDb = JSON.parse(raw);

  console.log(`Found: ${data.users?.length || 0} users, ${data.groups?.length || 0} groups, ${data.expenses?.length || 0} expenses, ${data.settlements?.length || 0} settlements, ${data.notifications?.length || 0} notifications, ${data.activities?.length || 0} activities`);

  // 1. Migrate Users
  if (data.users?.length > 0) {
    console.log('\n👤 Migrating users...');
    for (const u of data.users) {
      const { error } = await supabase.from('users').upsert({
        id: u.id,
        name: u.name,
        email: u.email,
        password_hash: u.passwordHash || '',
        avatar_url: u.avatarUrl || '',
        phone: u.phone || null,
        preferred_currency: u.preferredCurrency || 'INR',
        created_at: u.createdAt || new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) {
        console.error(`  ❌ User "${u.name}" (${u.id}):`, error.message);
      } else {
        console.log(`  ✅ User "${u.name}" (${u.id})`);
      }
    }
  }

  // 2. Migrate Groups + Members
  if (data.groups?.length > 0) {
    console.log('\n👥 Migrating groups...');
    for (const g of data.groups) {
      // Insert group
      const { error: groupErr } = await supabase.from('groups').upsert({
        id: g.id,
        name: g.name,
        description: g.description || '',
        category: g.category || 'Trip',
        default_currency: g.defaultCurrency || 'INR',
        created_by: g.createdBy,
        created_at: g.createdAt || new Date().toISOString(),
        invite_code: g.inviteCode,
      }, { onConflict: 'id' });

      if (groupErr) {
        console.error(`  ❌ Group "${g.name}" (${g.id}):`, groupErr.message);
        continue;
      }
      console.log(`  ✅ Group "${g.name}" (${g.id})`);

      // Insert members
      if (Array.isArray(g.members)) {
        for (const m of g.members) {
          const { error: memErr } = await supabase.from('group_members').upsert({
            group_id: g.id,
            user_id: m.userId,
            role: m.role || 'member',
            joined_at: m.joinedAt || new Date().toISOString(),
            member_passcode: m.memberPasscode || null,
          }, { onConflict: 'group_id,user_id' });
          if (memErr) {
            console.error(`    ❌ Member ${m.userId}:`, memErr.message);
          } else {
            console.log(`    ✅ Member ${m.userId} (${m.role})`);
          }
        }
      }
    }
  }

  // 3. Migrate Expenses
  if (data.expenses?.length > 0) {
    console.log('\n💰 Migrating expenses...');
    for (const e of data.expenses) {
      const { error } = await supabase.from('expenses').upsert({
        id: e.id,
        group_id: e.groupId,
        description: e.description,
        amount: e.amount,
        currency: e.currency || 'INR',
        category: e.category || 'Food',
        date: e.date,
        notes: e.notes || null,
        receipt_url: e.receiptUrl || null,
        receipt_data: e.receiptData || null,
        paid_by: e.paidBy || [],
        split_type: e.splitType,
        splits: e.splits || [],
        created_by: e.createdBy,
        created_at: e.createdAt || new Date().toISOString(),
        updated_at: e.updatedAt || new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) {
        console.error(`  ❌ Expense "${e.description}":`, error.message);
      } else {
        console.log(`  ✅ Expense "${e.description}" (${e.currency} ${e.amount})`);
      }
    }
  }

  // 4. Migrate Settlements
  if (data.settlements?.length > 0) {
    console.log('\n🤝 Migrating settlements...');
    for (const s of data.settlements) {
      const { error } = await supabase.from('settlements').upsert({
        id: s.id,
        group_id: s.groupId,
        payer_id: s.payerId,
        receiver_id: s.receiverId,
        amount: s.amount,
        currency: s.currency || 'INR',
        date: s.date,
        notes: s.notes || null,
        created_at: s.createdAt || new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) {
        console.error(`  ❌ Settlement ${s.id}:`, error.message);
      } else {
        console.log(`  ✅ Settlement ${s.id}`);
      }
    }
  }

  // 5. Migrate Notifications
  if (data.notifications?.length > 0) {
    console.log('\n🔔 Migrating notifications...');
    for (const n of data.notifications) {
      const { error } = await supabase.from('notifications').upsert({
        id: n.id,
        user_id: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        group_id: n.groupId || null,
        related_id: n.relatedId || null,
        read: n.read ?? false,
        created_at: n.createdAt || new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) {
        console.error(`  ❌ Notification ${n.id}:`, error.message);
      } else {
        console.log(`  ✅ Notification ${n.id}`);
      }
    }
  }

  // 6. Migrate Activities
  if (data.activities?.length > 0) {
    console.log('\n📋 Migrating activities...');
    for (const a of data.activities) {
      const { error } = await supabase.from('activities').upsert({
        id: a.id,
        group_id: a.groupId || null,
        user_id: a.userId,
        user_name: a.userName,
        user_avatar: a.userAvatar || '',
        action: a.action,
        description: a.description,
        amount: a.amount ?? null,
        currency: a.currency || null,
        created_at: a.createdAt || new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) {
        console.error(`  ❌ Activity ${a.id}:`, error.message);
      } else {
        console.log(`  ✅ Activity ${a.id}`);
      }
    }
  }

  console.log('\n🎉 Migration complete!');
  console.log('Your existing JSON data has been migrated to Supabase.');
  console.log('You can now start the server with: npm run dev');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
