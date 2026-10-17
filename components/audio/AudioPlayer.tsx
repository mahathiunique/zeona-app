/**
 * Zeona — AudioPlayer Component
 * Clean, calming audio player with Play/Pause, Seek, Current Time, Duration,
 * and interactive waveform seeking.
 */

import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText, ZCard } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { AudioWaveform } from './AudioWaveform';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { triggerHaptic } from '@/utils/haptics';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  title?: string;
  onDelete?: () => void;
  style?: any;
}

// Fixed visual baseline heights for saved recordings
const DEFAULT_WAVEFORM_BARS = [
  0.25, 0.4, 0.65, 0.85, 0.5, 0.35, 0.7, 0.95, 0.8, 0.45, 0.6, 0.9, 0.75, 0.35,
  0.55, 0.8, 0.9, 0.65, 0.4, 0.75, 0.85, 0.5, 0.3, 0.2,
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  audioUrl,
  duration: initialDuration,
  title,
  onDelete,
  style,
}: AudioPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    togglePlay,
    seekTo,
  } = useAudioPlayer(audioUrl, initialDuration);

  const effectiveDuration = duration || initialDuration || 0;
  const progress = effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;

  const handleSeek = (percentage: number) => {
    if (effectiveDuration > 0) {
      seekTo(percentage * effectiveDuration);
    }
  };

  return (
    <ZCard style={StyleSheet.flatten([styles.card, style])} elevation="xs" radius={radii.xl}>
      {title && (
        <View style={styles.titleRow}>
          <View style={styles.voiceBadge}>
            <Ionicons name="mic" size={13} color={colors.primary} />
            <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '700' }}>
              Voice Reflection
            </ZText>
          </View>
          {onDelete && (
            <Pressable
              onPress={() => {
                triggerHaptic();
                onDelete();
              }}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.playerRow}>
        {/* Play / Pause / Loading Button */}
        <Pressable
          onPress={() => {
            triggerHaptic();
            togglePlay();
          }}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.playButton,
            { opacity: pressed || isLoading ? 0.85 : 1 },
          ]}
          accessibilityLabel={isPlaying ? 'Pause reflection' : 'Play reflection'}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color={colors.textInverse}
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          )}
        </Pressable>

        {/* Interactive Waveform & Scrubber */}
        <View style={styles.waveformWrapper}>
          <AudioWaveform
            bars={DEFAULT_WAVEFORM_BARS}
            mode="playback"
            progress={progress}
            onSeek={handleSeek}
            activeColor={colors.primary}
            inactiveColor={colors.primarySubtle}
          />
        </View>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <ZText variant="caption" color={colors.textSecondary} style={{ fontWeight: '600' }}>
            {formatTime(currentTime)}
          </ZText>
          <ZText variant="caption" color={colors.textTertiary} style={{ fontSize: 10 }}>
            {formatTime(effectiveDuration)}
          </ZText>
        </View>
      </View>

      {/* Scrubbing slider bar */}
      <Pressable
        onPress={(e) => {
          // Tap progress bar to seek
          const nativeEvent = e.nativeEvent as any;
          if (nativeEvent && nativeEvent.locationX !== undefined) {
            // Target approximate width percentage
            const approxWidth = 260;
            const pct = Math.max(0, Math.min(1, nativeEvent.locationX / approxWidth));
            handleSeek(pct);
          }
        }}
        style={styles.progressBarTrack}
      >
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </Pressable>

      {error && (
        <ZText variant="caption" color={colors.error} style={{ marginTop: spacing[1] }}>
          {error}
        </ZText>
      )}
    </ZCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[3.5],
    backgroundColor: '#faf8fd',
    borderColor: '#ede7f6',
    borderWidth: 1,
    gap: spacing[2],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  waveformWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  timeContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 42,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.primarySubtle,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
});
