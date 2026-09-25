import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabasePublishableKey,
} from './supabaseConfig.ts';

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClientInstance) {
    const url = getSupabaseUrl();
    const key = getSupabasePublishableKey();
    supabaseClientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseClientInstance;
}

export const supabase = {
  get client(): SupabaseClient | null {
    return getSupabase();
  },
  isConfigured: isSupabaseConfigured,
};

/**
 * Upload a video file to Supabase Storage bucket 'videos'
 * Stores in path: {userId}/{uniqueId}.{ext}
 */
export async function uploadVideoFile(
  file: File,
  userId: string = 'anonymous'
): Promise<{ url: string; path: string; storagePath: string }> {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Please paste your Supabase Project URL and Key in src/lib/supabaseConfig.ts'
    );
  }

  // Format validation
  const lowerName = file.name.toLowerCase();
  const validExtensions = ['.mp4', '.webm', '.mov'];
  const isValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));
  const isValidMime =
    file.type.startsWith('video/') ||
    file.type === 'video/mp4' ||
    file.type === 'video/webm' ||
    file.type === 'video/quicktime';

  if (!isValidExt && !isValidMime) {
    throw new Error('Unsupported video format. Please upload an MP4, WebM, or MOV video file.');
  }

  // Max 100MB file limit
  const maxBytes = 100 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 100MB.`);
  }

  let fileExt = lowerName.split('.').pop() || 'mp4';
  if (fileExt === 'mov') fileExt = 'mov';

  const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueVideoId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const filePath = `${cleanUserId}/${uniqueVideoId}.${fileExt}`;

  const { data, error } = await client.storage.from('videos').upload(filePath, file, {
    cacheControl: '3600',
    contentType: file.type || `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload video to Supabase Storage: ${error.message}`);
  }

  const { data: publicUrlData } = client.storage.from('videos').getPublicUrl(data.path);
  return {
    url: publicUrlData.publicUrl,
    path: data.path,
    storagePath: data.path,
  };
}

/**
 * Remove an uploaded video file from Supabase Storage (prevents orphaned files on failure or delete)
 */
export async function deleteVideoStorageFile(storagePath: string): Promise<boolean> {
  const client = getSupabase();
  if (!client || !storagePath) return false;

  try {
    const { error } = await client.storage.from('videos').remove([storagePath]);
    if (error) {
      console.warn('Could not remove file from storage:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('deleteVideoStorageFile exception:', err);
    return false;
  }
}

/**
 * Upload an avatar image to Supabase Storage bucket 'avatars'
 */
export async function uploadAvatarFile(file: File): Promise<{ url: string; path?: string }> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured. Please paste your Supabase Project URL and Key in src/lib/supabaseConfig.ts');
  }

  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { data, error } = await client.storage.from('avatars').upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload avatar to Supabase Storage: ${error.message}`);
  }

  const { data: publicUrlData } = client.storage.from('avatars').getPublicUrl(data.path);
  return { url: publicUrlData.publicUrl, path: data.path };
}
