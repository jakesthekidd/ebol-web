import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { Database } from './database.types';

const { url, anonKey } = environment.supabase;

if (!url || !anonKey) {
  throw new Error('Missing Supabase environment configuration. Check environment.ts.');
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
