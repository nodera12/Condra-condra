/**
 * ============================================================================
 * SUPABASE CONFIGURATION
 * ============================================================================
 * 
 * Paste your Supabase project credentials below:
 * You can find these in your Supabase Dashboard:
 *   👉 Settings -> API -> Project URL & Project API Keys (anon / public)
 * 
 * IMPORTANT:
 * - Enter your public / anon key here (SUPABASE_PUBLISHABLE_KEY).
 * - NEVER enter your `service_role` key here!
 * - If you need server-side admin privileges, set SUPABASE_SERVICE_ROLE_KEY
 *   in your server environment variables (.env), NEVER in this file!
 * ============================================================================
 */

export const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
export const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

/**
 * Checks if real credentials have been provided instead of the default placeholder.
 */
export function isSupabaseConfigured(): boolean {
  const url = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) 
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) 
    || SUPABASE_URL;

  const key = (typeof process !== 'undefined' && (process.env?.SUPABASE_ANON_KEY || process.env?.SUPABASE_PUBLISHABLE_KEY)) 
    || (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY)) 
    || SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return false;
  if (url.includes('PASTE_YOUR_SUPABASE') || url.includes('YOUR_SUPABASE')) return false;
  if (key.includes('PASTE_YOUR_SUPABASE') || key.includes('YOUR_SUPABASE')) return false;

  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Retrieves the effective Supabase URL
 */
export function getSupabaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) {
    return (import.meta as any).env.VITE_SUPABASE_URL;
  }
  return SUPABASE_URL;
}

/**
 * Retrieves the effective Supabase publishable/anon key
 */
export function getSupabasePublishableKey(): string {
  if (typeof process !== 'undefined' && (process.env?.SUPABASE_ANON_KEY || process.env?.SUPABASE_PUBLISHABLE_KEY)) {
    return process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
  }
  if (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    return (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }
  return SUPABASE_PUBLISHABLE_KEY;
}
