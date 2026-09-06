import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';
import { env } from '@/config/env';

/**
 * Creates a Supabase client for use in browser client components.
 * Employs the public anon key, protected strictly by database Row Level Security.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey
  );
}
