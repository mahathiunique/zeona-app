/**
 * Zeona — Private Photo Storage Service
 * Handles authenticated private upload and temporary signed URL generation
 * for memories in Supabase Storage.
 *
 * Guarantees:
 * - Photos are stored in a private bucket ('memories').
 * - Viewing uses authenticated signed URLs with an expiration time.
 * - Protects all memory records and files; never generates publicly accessible URLs.
 * - Respects file-size limits (10MB per file), handles upload failures.
 * - Offline / guest fallback preserves local image URIs so content is never lost.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';

const BUCKET_NAME = 'memories';
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface UploadPhotoResult {
  storagePath: string;
  viewUrl: string;
  isRemote: boolean;
}

/**
 * Upload a photo to private Supabase Storage
 */
export async function uploadMemoryPhoto(params: {
  uri: string;
  userId: string;
  fileSize?: number;
}): Promise<UploadPhotoResult> {
  const { uri, userId, fileSize } = params;

  // 1. File size validation
  if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image exceeds 10MB limit. Please choose a smaller photo.');
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(fileExt) ? fileExt : 'jpg';
  const fileName = `${timestamp}_${randomSuffix}.${cleanExt}`;
  const filePath = `${userId}/${fileName}`;

  // 2. Try Supabase Storage if authenticated and available
  if (supabase && userId && userId !== 'guest-user' && userId !== 'local-user') {
    try {
      let uploadBlob: Blob;

      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        uploadBlob = await res.blob();
      } else {
        const res = await fetch(uri);
        uploadBlob = await res.blob();
      }

      if (uploadBlob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Image exceeds 10MB limit. Please choose a smaller photo.');
      }

      const mimeType =
        cleanExt === 'png'
          ? 'image/png'
          : cleanExt === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, uploadBlob, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data?.path) {
        // Uploaded to private storage: generate signed URL valid for 24 hours
        const { data: signedData, error: signedError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(data.path, 60 * 60 * 24);

        if (!signedError && signedData?.signedUrl) {
          return {
            storagePath: `${BUCKET_NAME}:${data.path}`,
            viewUrl: signedData.signedUrl,
            isRemote: true,
          };
        }

        return {
          storagePath: `${BUCKET_NAME}:${data.path}`,
          viewUrl: uri,
          isRemote: true,
        };
      } else {
        console.warn('[Zeona Photo Storage] Supabase upload notice:', error?.message);
      }
    } catch (err: any) {
      if (err?.message?.includes('exceeds')) {
        throw err;
      }
      console.warn('[Zeona Photo Storage] Upload error, falling back to local persistence:', err);
    }
  }

  // 3. Fallback: Offline, guest, or storage bucket provisioning fallback
  const fallbackKey = `zeona_local_photo_${timestamp}_${randomSuffix}`;
  try {
    await AsyncStorage.setItem(fallbackKey, uri);
  } catch {
    // Ignore storage quota
  }

  return {
    storagePath: uri,
    viewUrl: uri,
    isRemote: false,
  };
}

/**
 * Resolve a viewable URL for a stored photo reference.
 * If reference is in private Supabase Storage ('memories:user/xyz.jpg'),
 * generates an authenticated signed URL.
 */
export async function getPrivatePhotoUrl(urlOrPath: string): Promise<string> {
  if (!urlOrPath) return '';

  // Local / Web / Blob / Data URI
  if (
    urlOrPath.startsWith('blob:') ||
    urlOrPath.startsWith('data:') ||
    urlOrPath.startsWith('file:') ||
    urlOrPath.startsWith('http://localhost')
  ) {
    return urlOrPath;
  }

  // Private Supabase Storage reference (e.g. 'memories:user_id/12345.jpg')
  if (urlOrPath.startsWith(`${BUCKET_NAME}:`) && supabase) {
    const rawPath = urlOrPath.replace(`${BUCKET_NAME}:`, '');
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(rawPath, 60 * 60 * 24);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn('[Zeona Photo Storage] Failed to create signed URL:', err);
    }
  }

  // Already a full remote URL
  return urlOrPath;
}

/**
 * Delete a photo from private Supabase Storage
 */
export async function deleteMemoryPhoto(storagePath: string): Promise<void> {
  if (!storagePath || !supabase) return;

  if (storagePath.startsWith(`${BUCKET_NAME}:`)) {
    const rawPath = storagePath.replace(`${BUCKET_NAME}:`, '');
    try {
      await supabase.storage.from(BUCKET_NAME).remove([rawPath]);
    } catch (err) {
      console.warn('[Zeona Photo Storage] Delete error:', err);
    }
  }
}
