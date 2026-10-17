/**
 * Zeona — AudioWaveform Component
 * Renders a soothing, feminine waveform with gentle rounding.
 *
 * In Recording Mode: Driven dynamically by live microphone amplitude data.
 * In Playback Mode: Renders interactive waveform bars where progress is filled
 *                   and clicking/tapping any bar seeks directly to that timestamp.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { colors, radii } from '@/constants/theme';
import { triggerHaptic } from '@/utils/haptics';

interface AudioWaveformProps {
  /** Array of normalized amplitude values (0.0 to 1.0) */
  bars: number[];
  /** Mode: 'live' (recording) or 'playback' */
  mode?: 'live' | 'playback';
  /** Progress percentage for playback mode (0.0 to 1.0) */
  progress?: number;
  /** Max bar height in pixels (defaults to 36) */
  maxHeight?: number;
  /** Optional callback when user taps a bar to seek */
  onSeek?: (percentage: number) => void;
  activeColor?: string;
  inactiveColor?: string;
}

export function AudioWaveform({
  bars,
  mode = 'live',
  progress = 0,
  maxHeight = 36,
  onSeek,
  activeColor = colors.primary,
  inactiveColor = colors.primarySubtle,
}: AudioWaveformProps) {
  const totalBars = bars.length;

  return (
    <View style={styles.container}>
      {bars.map((amplitude, index) => {
        // Calculate height
        const barHeight = Math.max(4, amplitude * maxHeight);
        const barProgress = index / (totalBars - 1 || 1);
        const isFilled = mode === 'playback' ? barProgress <= progress : amplitude > 0.3;

        const barColor = isFilled ? activeColor : inactiveColor;

        if (mode === 'playback' && onSeek) {
          return (
            <Pressable
              key={index}
              onPress={() => {
                triggerHaptic();
                onSeek(barProgress);
              }}
              hitSlop={4}
              style={styles.barPressable}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </Pressable>
          );
        }

        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: barColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 48,
    paddingHorizontal: 4,
  },
  barPressable: {
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bar: {
    width: 3.5,
    borderRadius: radii.full,
    transitionDuration: '100ms',
  } as any,
});
