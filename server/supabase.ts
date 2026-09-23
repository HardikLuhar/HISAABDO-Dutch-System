import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// dotenv is for local dev — on Vercel, env vars are injected automatically.
// dotenv.config() will silently do nothing if no .env file exists.
try { dotenv.config(); } catch {}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Available env keys:', Object.keys(process.env).filter(k => k.startsWith('SUPA') || k.startsWith('SESSION')).join(', ') || '(none found)');
}

// Clean the URL — ensure it's the project base URL, not the REST API URL
const cleanUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

let supabase: SupabaseClient;

if (cleanUrl && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(cleanUrl, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  });
  console.log(`✅ Supabase client initialized: ${cleanUrl}`);
} else {
  console.error('⚠️  Supabase client NOT initialized — missing credentials');
  supabase = null as any;
}

export { supabase };
