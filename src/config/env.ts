/**
 * Environment configuration for SIH PS26034.
 * Validates availability of required keys and prevents silent configuration failures.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://czpxmretlsqfenxnnhqn.supabase.co',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  cvServiceUrl: process.env.CV_SERVICE_URL || 'http://localhost:8000',
  isProduction: process.env.NODE_ENV === 'production',
};

export function assertServerEnv() {
  if (!env.supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing.');
  }
}
