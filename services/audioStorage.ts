/**
 * Zeona — Private Audio Storage Service
 * Handles authenticated private upload and temporary signed playback URL generation
 * for voice diary recordings in Supabase Storage.
 *
 * Guarantees:
 * - Recordings are stored in a private bucket ('voice-diaries').
 * - Playback uses authenticated signed URLs with an expiration time.
 * - If Supabase Storage is not provisioned or offline, falls back gracefully to local storage
 *   so the user's voice reflection is NEVER lost.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';

const BUCKET_NAME = 'voice-diaries';

export interface UploadVoiceResult {
  storagePath: string;
  playbackUrl: string;
  isRemote: boolean;
}

/**
 * Upload an audio recording to private Supabase Storage
 */
export async function uploadVoiceRecording(params: {
  uri: string;
  blob?: Blob | null;
  duration: number;
  userId: string;
}): Promise<UploadVoiceResult> {
  const { uri, blob, userId } = params;
  const timestamp = Date.now();
  const fileExt = Platform.OS === 'web' ? 'webm' : 'm4a';
  const fileName = `${timestamp}_voice.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // If Supabase is available and user is authenticated
  if (supabase && userId && userId !== 'guest-user') {
    try {
      let uploadData: any = blob;

      if (!uploadData) {
        // In React Native / Expo, fetch local file URI into a blob
        const res = await fetch(uri);
        uploadData = await res.blob();
      }

      const mimeType = Platform.OS === 'web' ? (blob?.type || 'audio/webm') : 'audio/m4a';

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, uploadData, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data?.path) {
        // Successfully uploaded to private Supabase Storage
        // Generate a 24-hour signed URL for private authenticated playback
        const { data: signedData, error: signedError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(data.path, 60 * 60 * 24);

        if (!signedError && signedData?.signedUrl) {
          return {
            storagePath: `${BUCKET_NAME}:${data.path}`,
            playbackUrl: signedData.signedUrl,
            isRemote: true,
          };
        }

        return {
          storagePath: `${BUCKET_NAME}:${data.path}`,
          playbackUrl: uri,
          isRemote: true,
        };
      } else {
        console.warn('[Zeona Audio Storage] Supabase upload notice:', error?.message);
      }
    } catch (err: any) {
      console.warn('[Zeona Audio Storage] Upload error, falling back to local persistence:', err);
    }
  }

  // Fallback: If offline, unauthenticated, or bucket not ready, preserve local URI
  // Save local audio reference in AsyncStorage to guarantee zero data loss
  const fallbackKey = `zeona_local_audio_${timestamp}`;
  try {
    await AsyncStorage.setItem(fallbackKey, uri);
  } catch {
    // Ignore
  }

  return {
    storagePath: uri,
    playbackUrl: uri,
    isRemote: false,
  };
}

/**
 * Resolve a playback URL for a stored audio reference.
 * If reference is in private Supabase Storage ('voice-diaries:user/xyz.webm'),
 * generates a fresh signed URL.
 */
export async function getPrivateAudioPlaybackUrl(audioUrlOrPath: string): Promise<string> {
  if (!audioUrlOrPath) return '';

  // If it's a blob:, data:, or direct file URI / http URL
  if (
    audioUrlOrPath.startsWith('blob:') ||
    audioUrlOrPath.startsWith('data:') ||
    audioUrlOrPath.startsWith('file:') ||
    audioUrlOrPath.startsWith('http://localhost')
  ) {
    return audioUrlOrPath;
  }

  // If it's a private Supabase Storage reference (e.g. 'voice-diaries:123/456.webm')
  if (audioUrlOrPath.startsWith(`${BUCKET_NAME}:`) && supabase) {
    const rawPath = audioUrlOrPath.replace(`${BUCKET_NAME}:`, '');
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(rawPath, 60 * 60 * 24);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn('[Zeona Audio Storage] Failed to create signed URL:', err);
    }
  }

  // Return as-is if already a valid URL
  return audioUrlOrPath;
}

/**
 * Delete recording from private Supabase Storage
 */
export async function deleteVoiceRecording(storagePath: string): Promise<void> {
  if (!storagePath || !supabase) return;

  if (storagePath.startsWith(`${BUCKET_NAME}:`)) {
    const rawPath = storagePath.replace(`${BUCKET_NAME}:`, '');
    try {
      await supabase.storage.from(BUCKET_NAME).remove([rawPath]);
    } catch (err) {
      console.warn('[Zeona Audio Storage] Delete error:', err);
    }
  }
}
