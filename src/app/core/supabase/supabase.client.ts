import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

let client: SupabaseClient | null = null;

/**
 * Returns a lazily-initialized singleton Supabase client.
 * Credentials are read from the Angular environment files, never hardcoded.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
    throw new Error(
      'Supabase credentials not configured. Fill src/environments/environment.ts using environment.example as a template.'
    );
  }

  if (!client) {
    client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  return client;
}