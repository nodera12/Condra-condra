import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL as CONFIG_URL,
  SUPABASE_PUBLISHABLE_KEY as CONFIG_ANON_KEY,
} from '../src/lib/supabaseConfig.ts';

let adminClient: SupabaseClient | null = null;

export function isServerSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || CONFIG_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || CONFIG_ANON_KEY;

  if (!url || !key) return false;
  if (url.includes('PASTE_YOUR_SUPABASE') || url.includes('YOUR_SUPABASE')) return false;
  if (key.includes('PASTE_YOUR_SUPABASE') || key.includes('YOUR_SUPABASE')) return false;

  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Returns a server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY if set, otherwise falls back to anon key.
 * 
 * CRITICAL SECURITY NOTE:
 * SUPABASE_SERVICE_ROLE_KEY gives full administrative access (bypassing RLS).
 * It is only instantiated here on the Node.js server and NEVER sent to the browser.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isServerSupabaseConfigured()) {
    return null;
  }

  if (!adminClient) {
    const url = process.env.SUPABASE_URL || CONFIG_URL;
    // Prefer service role key for administrative server routes, otherwise use anon key
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || CONFIG_ANON_KEY;

    adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('⚡ Server connected to Supabase using elevated SERVICE_ROLE credentials.');
    } else {
      console.log('⚡ Server connected to Supabase using standard credentials.');
    }

    // Auto-verify / create 'videos' and 'avatars' buckets in Supabase Storage if admin key or permissions allow
    ensureStorageBuckets(adminClient).catch((err) => {
      console.warn('Storage bucket auto-check notice (run supabase-schema.sql to initialize manually):', err?.message || err);
    });
  }

  return adminClient;
}

/**
 * Ensures 'videos' and 'avatars' storage buckets exist in Supabase Storage
 */
async function ensureStorageBuckets(client: SupabaseClient): Promise<void> {
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const bucketNames = (buckets || []).map((b) => b.name);

    if (!bucketNames.includes('videos')) {
      const { error } = await client.storage.createBucket('videos', {
        public: true,
        fileSizeLimit: 104857600, // 100MB
        allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg'],
      });
      if (error) {
        console.warn('Could not auto-create "videos" storage bucket via client (may need service_role):', error.message);
      } else {
        console.log('✅ Supabase "videos" storage bucket created successfully.');
      }
    }

    if (!bucketNames.includes('avatars')) {
      await client.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      }).catch(() => {});
    }

    if (!bucketNames.includes('storage_files')) {
      await client.storage.createBucket('storage_files', {
        public: true,
        fileSizeLimit: 104857600, // 100MB
      }).catch(() => {});
    }
  } catch (err: any) {
    // Non-fatal, buckets might already exist or need direct SQL execution via dashboard
  }
}
