/**
 * Zeona — Supabase client
 *
 * Reads credentials from environment variables.
 * If credentials are absent, the client is null and services should
 * gracefully degrade to local/offline mode.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const supabaseUrl: string | undefined =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  Constants.expoConfig?.extra?.supabaseUrl;

const supabaseAnonKey: string | undefined =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  Constants.expoConfig?.extra?.supabaseAnonKey;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
} else {
  console.warn(
    '[Zeona] Supabase credentials not found. ' +
      'Copy .env.example → .env and fill in your project URL and anon key. ' +
      'The app will run in offline/local mode until credentials are provided.',
  );
}

export { supabase };
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabase);
