import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  console.error('   Please set these environment variables before starting the server.');
  process.exit(1);
}

// Clean the URL — ensure it's the project base URL, not the REST API URL
const cleanUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

export const supabase: SupabaseClient = createClient(cleanUrl, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  // Use service role key — bypasses RLS
  db: {
    schema: 'public',
  },
});

console.log(`✅ Supabase client initialized: ${cleanUrl}`);
