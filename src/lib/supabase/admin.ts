import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { env } from '@/config/env';

/**
 * Creates an administrative Supabase client using the Service Role Key.
 *
 * CRITICAL SECURITY NOTICE:
 * This client bypasses Row Level Security (RLS).
 * MUST NEVER BE EXPOSED TO CLIENT-SIDE BUNDLES.
 * Must only be invoked in secure server-side cron jobs, migrations, or internal webhooks.
 */
export function createAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to initialize the admin client.');
  }

  return createClient<Database>(
    env.supabaseUrl,
    env.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
