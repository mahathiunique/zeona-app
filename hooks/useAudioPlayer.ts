/**
 * Zeona — useAudioPlayer Hook
 * Unified playback hook for Web and Mobile (Expo)
 * Supports play, pause, seek, duration, current time, and signed Supabase storage URLs.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { getPrivateAudioPlaybackUrl } from '@/services/audioStorage';

export function useAudioPlayer(initialAudioSource: string | null, knownDuration?: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(knownDuration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Web Audio Element ref
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  // Native Sound ref
  const nativeSoundRef = useRef<Audio.Sound | null>(null);

  // Resolve signed URL if needed
  useEffect(() => {
    let isCancelled = false;
    if (!initialAudioSource) {
      setResolvedUrl(null);
      return;
    }

    setIsLoading(true);
    getPrivateAudioPlaybackUrl(initialAudioSource)
      .then((url) => {
        if (!isCancelled) {
          setResolvedUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('[Zeona Audio Player] Failed to resolve audio URL:', err);
          setResolvedUrl(initialAudioSource);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [initialAudioSource]);

  // Setup Web Audio
  useEffect(() => {
    if (Platform.OS !== 'web' || !resolvedUrl) return;

    const audio = new window.Audio(resolvedUrl);
    webAudioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(Math.floor(audio.currentTime));
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setError('Unable to load audio playback.');
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
      audio.src = '';
      webAudioRef.current = null;
    };
  }, [resolvedUrl]);

  // Setup Native Sound
  useEffect(() => {
    if (Platform.OS === 'web' || !resolvedUrl) return;

    let soundInstance: Audio.Sound | null = null;

    async function loadNativeSound() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const { sound, status } = await Audio.Sound.createAsync(
          { uri: resolvedUrl! },
          { shouldPlay: false },
          (playbackStatus) => {
            if (!playbackStatus.isLoaded) return;
            setCurrentTime(Math.floor(playbackStatus.positionMillis / 1000));
            if (playbackStatus.durationMillis) {
              setDuration(Math.round(playbackStatus.durationMillis / 1000));
            }
            if (playbackStatus.didJustFinish) {
              setIsPlaying(false);
              setCurrentTime(0);
            }
          }
        );

        soundInstance = sound;
        nativeSoundRef.current = sound;
      } catch (err: any) {
        console.warn('[Zeona Native Player] Load error:', err);
        setError('Failed to load native audio playback.');
      }
    }

    loadNativeSound();

    return () => {
      if (soundInstance) {
        soundInstance.unloadAsync().catch(() => {});
      }
    };
  }, [resolvedUrl]);

  const play = useCallback(async () => {
    setError(null);
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        try {
          await webAudioRef.current.play();
          setIsPlaying(true);
        } catch {
          setError('Playback blocked by browser or failed.');
        }
      }
    } else if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.playAsync();
        setIsPlaying(true);
      } catch {
        setError('Failed to start playback.');
      }
    }
  }, []);

  const pause = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        setIsPlaying(false);
      }
    } else if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.pauseAsync();
        setIsPlaying(false);
      } catch (err) {
        console.warn('Native pause error:', err);
      }
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback(async (seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, duration || 1000));
    setCurrentTime(clamped);

    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.currentTime = clamped;
      }
    } else if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.setPositionAsync(clamped * 1000);
      } catch (err) {
        console.warn('Native seek error:', err);
      }
    }
  }, [duration]);

  return {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    play,
    pause,
    togglePlay,
    seekTo,
  };
}
