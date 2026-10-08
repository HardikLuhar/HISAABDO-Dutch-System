import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabase.js';

// VAPID keys for Web Push Notifications
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BFrKqPBc12_8yUaLYo3A-4AkeJKdMx3pbW0zuI2OJnes5jQIM-nWC4S1cC3L9tAL6ZUBFOUfb8eq7APaW0tlXxo';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'pNmFkMVCHUi-MT3WxSlhcYIxPf37D63qEA53w8FDrPw';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@hisaabdo.app';

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push (VAPID) service initialized');
} catch (err) {
  console.error('Failed to configure webpush VAPID:', err);
}

export interface PushSubscriptionItem {
  id: string;
  userId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent?: string;
  createdAt: string;
}

// Local persistent file fallback
const DATA_DIR = path.join(process.cwd(), 'data');
const SUBS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

function loadLocalSubscriptions(): PushSubscriptionItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SUBS_FILE)) {
      const content = fs.readFileSync(SUBS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local push subscriptions:', err);
  }
  return [];
}

function saveLocalSubscriptions(subs: PushSubscriptionItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local push subscriptions:', err);
  }
}

// In-memory cache
let inMemorySubs: PushSubscriptionItem[] = loadLocalSubscriptions();

export async function savePushSubscription(userId: string, subscription: any, userAgent?: string) {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Invalid subscription payload');
  }

  const endpoint = subscription.endpoint;
  const existingIdx = inMemorySubs.findIndex(s => s.subscription.endpoint === endpoint);

  const item: PushSubscriptionItem = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId,
    subscription,
    userAgent,
    createdAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    inMemorySubs[existingIdx] = { ...inMemorySubs[existingIdx], userId, subscription, userAgent };
  } else {
    inMemorySubs.push(item);
  }

  saveLocalSubscriptions(inMemorySubs);

  // Also try saving to Supabase if table exists
  if (supabase) {
    try {
      await supabase.from('push_subscriptions').upsert({
        endpoint: subscription.endpoint,
        user_id: userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });
    } catch {
      // Ignore if table not created in Supabase yet
    }
  }

  console.log(`[Push] Saved subscription for user ${userId}. Total subscriptions: ${inMemorySubs.length}`);
  return true;
}

export async function removePushSubscription(endpoint: string) {
  inMemorySubs = inMemorySubs.filter(s => s.subscription.endpoint !== endpoint);
  saveLocalSubscriptions(inMemorySubs);

  if (supabase) {
    try {
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    } catch {}
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: any;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const userSubs = inMemorySubs.filter(s => s.userId === userId);
  if (userSubs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const pushPayload = JSON.stringify({
    title: payload.title || 'Hisaabdo',
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    url: payload.url || '/',
    data: payload.data || { url: payload.url || '/' }
  });

  let sent = 0;
  let failed = 0;

  for (const item of userSubs) {
    try {
      await webpush.sendNotification(item.subscription, pushPayload, {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: 'high'
      });
      sent++;
    } catch (err: any) {
      failed++;
      console.warn(`[Push] Failed to send push to ${item.subscription.endpoint.slice(0, 35)}...:`, err.statusCode || err.message);
      // Remove stale / unregistered subscriptions (HTTP 410 or 404)
      if (err.statusCode === 410 || err.statusCode === 404) {
        await removePushSubscription(item.subscription.endpoint);
      }
    }
  }

  console.log(`[Push] Delivered notification to user ${userId} (${sent} sent, ${failed} failed)`);
  return { sent, failed };
}
