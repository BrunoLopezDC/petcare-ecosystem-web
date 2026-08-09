/**
 * ENVIRONMENT FILE TEMPLATE (versioned) — copy this to environment.ts and fill in real values.
 *
 * HOW TO SET UP (no hardcoded credentials in code):
 * 1. Copy this file to `src/environments/environment.ts` (development) and
 *    `src/environments/environment.prod.ts` (production).
 * 2. Replace the placeholder URLs/keys with your real Supabase project values
 *    (Project Settings -> API -> Project URL and anon/public key).
 * 3. NEVER commit environment.ts / environment.prod.ts — they are gitignored.
 *
 * These files are referenced by angular.json fileReplacements in the build
 * configuration; the Supabase client reads them via src/app/core/supabase/supabase.client.ts.
 */
export const environment = {
  production: false,
  supabaseUrl: 'PASTE_SUPABASE_PROJECT_URL_HERE',
  supabaseAnonKey: 'PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE'
};