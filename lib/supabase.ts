import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate Supabase credentials
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Supabase Configuration Error:\n' +
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
    'Please create a .env file in the root directory with:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=your_supabase_url\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key'
  );
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  throw new Error(
    '❌ Invalid Supabase URL format.\n' +
    'URL should start with https:// (e.g., https://your-project.supabase.co)'
  );
}

// Export the Supabase client as a singleton with better error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});