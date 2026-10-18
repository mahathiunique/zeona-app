/**
 * Zeona — Mood Insights Screen
 *
 * Real mood check-in analytics & self-reflection:
 * - Week, Month, and Year period filters
 * - Total check-ins and check-in cadence in the selected period
 * - Multi-channel accessible mood distribution chart (icons, shapes, labels, percentages)
 * - Mood history over time (day-by-day week strip, weekly progression, and monthly trends)
 * - Comparison with previous period when sufficient data exists
 * - Chronological list of recorded check-ins and optional notes
 * - Non-clinical personal observations avoiding forced positivity and diagnosis
 * - Graceful loading, empty, and query error handling
 * - Scoped queries fetching only data for the selected period
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle, Line, Text as SvgText, G } from 'react-native-svg';

import { colors, spacing, radii, shadows } from '@/constants/theme';
import { ZText } from '@/components/ui/ZText';
import { ZCard } from '@/components/ui/ZCard';
import { ZButton } from '@/components/ui/ZButton';
import { ZBadge } from '@/components/ui/ZBadge';
import { ZDivider } from '@/components/ui/ZDivider';
import { triggerHaptic } from '@/utils/haptics';

import {
  useMoodStore,
  getPeriodDateRanges,
  calculatePeriodStats,
  getLocalTodayDateString,
  type PeriodRange,
} from '@/store/moodStore';
import type { CoreMood, MoodEntry, InsightPeriod, MoodPeriodStats } from '@/types';

// ── Accessible Mood Visual Config ─────────────────────────────────────────────
interface MoodVisualConfig {
  tag: CoreMood;
  label: string;
  emoji: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgSubtle: string;
  border: string;
}

const MOOD_VISUALS: Record<CoreMood, MoodVisualConfig> = {
  happy: {
    tag: 'happy',
    label: 'Happy',
    emoji: '☀️',
    icon: 'sunny-outline',
    color: '#d97706', // High-contrast amber
    bgSubtle: '#fffbeb',
    border: '#fde68a',
  },
  calm: {
    tag: 'calm',
    label: 'Calm',
    emoji: '🌿',
    icon: 'leaf-outline',
    color: '#059669', // High-contrast emerald
    bgSubtle: '#ecfdf5',
    border: '#a7f3d0',
  },
  neutral: {
    tag: 'neutral',
    label: 'Neutral',
    emoji: '☁️',
    icon: 'pause-circle-outline',
    color: '#7c3aed', // High-contrast violet
    bgSubtle: '#f5f3ff',
    border: '#ddd6fe',
  },
  anxious: {
    tag: 'anxious',
    label: 'Anxious',
    emoji: '🌊',
    icon: 'pulse-outline',
    color: '#ea580c', // High-contrast warm coral
    bgSubtle: '#fff7ed',
    border: '#fed7aa',
  },
  sad: {
    tag: 'sad',
    label: 'Sad',
    emoji: '🌧️',
    icon: 'rainy-outline',
    color: '#0284c7', // High-contrast sky blue
    bgSubtle: '#f0f9ff',
    border: '#bae6fd',
  },
};

const ALL_MOODS: CoreMood[] = ['happy', 'calm', 'neutral', 'anxious', 'sad'];

export default function MoodInsightsScreen() {
  const router = useRouter();
  const { fetchEntriesForPeriod } = useMoodStore();

  const [period, setPeriod] = useState<InsightPeriod>('week');
  const [currentEntries, setCurrentEntries] = useState<MoodEntry[]>([]);
  const [previousEntries, setPreviousEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Selected day detail popup in timeline
  const [activeDayDate, setActiveDayDate] = useState<string | null>(null);

  // Active period date ranges
  const range: PeriodRange = useMemo(() => {
    return getPeriodDateRanges(period);
  }, [period]);

  // Load data for the selected period only
  const loadPeriodData = useCallback(
    async (showLoadingSpinner = true) => {
      if (showLoadingSpinner) setIsLoading(true);
      setQueryError(null);

      try {
        // Scoped fetch: only fetch entries for the selected period and previous period
        const [current, previous] = await Promise.all([
          fetchEntriesForPeriod(range.currentStart, range.currentEnd),
          fetchEntriesForPeriod(range.previousStart, range.previousEnd),
        ]);

        setCurrentEntries(current);
        setPreviousEntries(previous);
        setIsLoading(false);
        setIsRefreshing(false);
      } catch (err) {
        console.warn('[Zeona Mood Insights] Error fetching period data:', err);
        setQueryError('Unable to load mood reflections for this period. Please try again.');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchEntriesForPeriod, range]
  );

  useEffect(() => {
    loadPeriodData(true);
  }, [loadPeriodData]);

  // Pull-to-refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    triggerHaptic();
    loadPeriodData(false);
  };

  // Compute calculated statistics
  const stats: MoodPeriodStats = useMemo(() => {
    return calculatePeriodStats(currentEntries, previousEntries, period, range);
  }, [currentEntries, previousEntries, period, range]);

  // Active day entry if user tapped on the week strip
  const activeDayEntry = useMemo(() => {
    if (!activeDayDate) return null;
    return currentEntries.find((e) => e.logged_date === activeDayDate) || null;
  }, [activeDayDate, currentEntries]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.responsiveWrapper}>
          {/* ── Top Header Bar ────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                triggerHaptic();
                router.back();
              }}
              style={styles.backButton}
              accessibilityLabel="Back to Mood Sanctuary"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTextWrapper}>
              <ZText variant="headingLarge" color={colors.textBrand}>
                Mood Insights
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Reflecting on emotional rhythms & self-care 🌸
              </ZText>
            </View>

            <Pressable
              hitSlop={8}
              onPress={() => {
                triggerHaptic();
                router.push('/mood');
              }}
              style={styles.checkInQuickButton}
              accessibilityLabel="Record new check-in"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <ZText variant="caption" color={colors.primary} style={{ fontWeight: '700', marginLeft: 4 }}>
                Check-in
              </ZText>
            </Pressable>
          </View>

          {/* ── Period Filter Control: Week | Month | Year ──────────────────── */}
          <View style={styles.periodSelectorWrapper}>
            <View style={styles.periodSegment}>
              {(['week', 'month', 'year'] as InsightPeriod[]).map((p) => {
                const isActive = period === p;
                const labels: Record<InsightPeriod, string> = {
                  week: 'Week',
                  month: 'Month',
                  year: 'Year',
                };
                return (
                  <Pressable
                    key={p}
                    onPress={() => {
                      triggerHaptic();
                      setPeriod(p);
                      setActiveDayDate(null);
                    }}
                    style={[
                      styles.periodButton,
                      isActive && styles.periodButtonActive,
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`Filter by ${labels[p]}`}
                  >
                    <ZText
                      variant="label"
                      color={isActive ? colors.primary : colors.textSecondary}
                      style={isActive ? { fontWeight: '700' } : undefined}
                    >
                      {labels[p]}
                    </ZText>
                  </Pressable>
                );
              })}
            </View>

            {/* Formatted Date Range Subtitle */}
            <View style={styles.dateRangeBadge}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <ZText variant="caption" color={colors.textSecondary} style={{ marginLeft: 6 }}>
                {stats.dateRangeFormatted} ({range.label})
              </ZText>
            </View>
          </View>

          {/* ── Loading State ─────────────────────────────────────────────── */}
          {isLoading ? (
            <ZCard elevation="sm" radius={radii.xl} style={styles.stateCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ZText variant="bodyMedium" color={colors.textSecondary} style={{ marginTop: spacing[3] }}>
                Gathering your reflections…
              </ZText>
            </ZCard>
          ) : queryError ? (
            /* ── Error State ─────────────────────────────────────────────── */
            <ZCard elevation="sm" radius={radii.xl} style={styles.stateCard}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
              <ZText variant="headingMedium" color={colors.textPrimary} style={{ marginTop: spacing[2] }}>
                Notice
              </ZText>
              <ZText
                variant="bodySmall"
                color={colors.textSecondary}
                style={{ textAlign: 'center', marginTop: spacing[1], marginBottom: spacing[3] }}
              >
                {queryError}
              </ZText>
              <ZButton
                label="Try Again"
                variant="outline"
                size="sm"
                onPress={() => loadPeriodData(true)}
              />
            </ZCard>
          ) : stats.totalCheckIns === 0 ? (
            /* ── Empty State ─────────────────────────────────────────────── */
            <ZCard elevation="sm" radius={radii.xl} style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="flower-outline" size={36} color={colors.primary} />
              </View>
              <ZText variant="headingMedium" color={colors.textBrand} style={{ marginTop: spacing[3] }}>
                No Reflections Recorded
              </ZText>
              <ZText
                variant="bodySmall"
                color={colors.textSecondary}
                style={{ textAlign: 'center', marginTop: spacing[2], maxWidth: 360, lineHeight: 20 }}
              >
                There are no mood check-ins logged for this {period}. Every moment is a welcoming opportunity
                to pause, listen to your heart, and record how you feel.
              </ZText>
              <View style={{ marginTop: spacing[4] }}>
                <ZButton
                  label="Record a Mood Check-in"
                  variant="primary"
                  size="md"
                  onPress={() => {
                    triggerHaptic();
                    router.push('/mood');
                  }}
                  leftIcon={<Ionicons name="heart" size={18} color="#fff" />}
                />
              </View>
            </ZCard>
          ) : (
            /* ── Full Insights Dashboard ─────────────────────────────────── */
            <View style={styles.insightsContent}>
              {/* 1. Cadence & Check-in Volume Metric Cards */}
              <View style={styles.statsRow}>
                {/* Total Check-ins Card */}
                <ZCard elevation="sm" radius={radii.xl} style={[styles.statCard, { flex: 1 }]}>
                  <View style={styles.statIconBadge}>
                    <Ionicons name="heart-circle-outline" size={20} color={colors.primary} />
                  </View>
                  <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 8 }}>
                    Total Check-ins
                  </ZText>
                  <ZText variant="headingLarge" color={colors.textPrimary} style={{ fontWeight: '800' }}>
                    {stats.totalCheckIns}
                  </ZText>
                  <ZText variant="caption" color={colors.textTertiary}>
                    Across {stats.daysInPeriod} days
                  </ZText>
                </ZCard>

                {/* Cadence Rhythm Card */}
                <ZCard elevation="sm" radius={radii.xl} style={[styles.statCard, { flex: 1 }]}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="sparkles-outline" size={20} color="#059669" />
                  </View>
                  <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 8 }}>
                    Logging Cadence
                  </ZText>
                  <ZText variant="headingLarge" color="#059669" style={{ fontWeight: '800' }}>
                    {stats.checkInRatePercent}%
                  </ZText>
                  <ZText variant="caption" color={colors.textTertiary}>
                    Frequency rhythm
                  </ZText>
                </ZCard>

                {/* Dominant Feeling Card */}
                {stats.dominantMood && (
                  <ZCard elevation="sm" radius={radii.xl} style={[styles.statCard, { flex: 1 }]}>
                    <View
                      style={[
                        styles.statIconBadge,
                        { backgroundColor: MOOD_VISUALS[stats.dominantMood].bgSubtle },
                      ]}
                    >
                      <Ionicons
                        name={MOOD_VISUALS[stats.dominantMood].icon}
                        size={20}
                        color={MOOD_VISUALS[stats.dominantMood].color}
                      />
                    </View>
                    <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 8 }}>
                      Prevalent Mood
                    </ZText>
                    <ZText
                      variant="headingLarge"
                      color={MOOD_VISUALS[stats.dominantMood].color}
                      style={{ fontWeight: '800' }}
                    >
                      {MOOD_VISUALS[stats.dominantMood].label}
                    </ZText>
                    <ZText variant="caption" color={colors.textTertiary}>
                      {stats.dominantPercentage}% of reflections
                    </ZText>
                  </ZCard>
                )}
              </View>

              {/* 2. Comparison With Previous Period Card */}
              <ZCard elevation="sm" radius={radii.xl} style={styles.comparisonCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleGroup}>
                    <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
                    <ZText variant="headingSmall" color={colors.textBrand} style={{ marginLeft: 8 }}>
                      Previous Period Comparison
                    </ZText>
                  </View>

                  {stats.comparison.hasSufficientData && stats.comparison.percentChange !== null && (
                    <View
                      style={[
                        styles.trendDeltaBadge,
                        stats.comparison.deltaCount >= 0
                          ? styles.trendDeltaPositive
                          : styles.trendDeltaNeutral,
                      ]}
                    >
                      <Ionicons
                        name={
                          stats.comparison.deltaCount >= 0
                            ? 'trending-up-outline'
                            : 'trending-down-outline'
                        }
                        size={14}
                        color={stats.comparison.deltaCount >= 0 ? '#059669' : '#d97706'}
                      />
                      <ZText
                        variant="caption"
                        color={stats.comparison.deltaCount >= 0 ? '#059669' : '#d97706'}
                        style={{ fontWeight: '700', marginLeft: 4 }}
                      >
                        {stats.comparison.percentChange > 0 ? `+${stats.comparison.percentChange}%` : `${stats.comparison.percentChange}%`}
                      </ZText>
                    </View>
                  )}
                </View>

                <ZText variant="bodySmall" color={colors.textPrimary} style={{ marginTop: 8, lineHeight: 20 }}>
                  {stats.comparison.textSummary}
                </ZText>

                {stats.comparison.hasSufficientData ? (
                  <View style={styles.comparisonMiniGrid}>
                    <View style={styles.comparisonItem}>
                      <ZText variant="caption" color={colors.textTertiary}>
                        Current {period}
                      </ZText>
                      <ZText variant="headingMedium" color={colors.primary} style={{ fontWeight: '700' }}>
                        {stats.comparison.currentCount} check-ins
                      </ZText>
                    </View>
                    <View style={styles.comparisonDivider} />
                    <View style={styles.comparisonItem}>
                      <ZText variant="caption" color={colors.textTertiary}>
                        Previous {period}
                      </ZText>
                      <ZText variant="headingMedium" color={colors.textSecondary} style={{ fontWeight: '700' }}>
                        {stats.comparison.previousCount} check-ins
                      </ZText>
                    </View>
                  </View>
                ) : (
                  <View style={styles.insufficientDataNotice}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                    <ZText variant="caption" color={colors.textSecondary} style={{ marginLeft: 6, flex: 1 }}>
                      Comparisons become active when you log reflections across successive periods.
                    </ZText>
                  </View>
                )}
              </ZCard>

              {/* 3. Accessible Mood Distribution Chart */}
              <ZCard elevation="sm" radius={radii.xl} style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleGroup}>
                    <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
                    <ZText variant="headingSmall" color={colors.textBrand} style={{ marginLeft: 8 }}>
                      Mood Distribution
                    </ZText>
                  </View>
                  <ZText variant="caption" color={colors.textTertiary}>
                    {stats.totalCheckIns} Total
                  </ZText>
                </View>

                <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 4, marginBottom: 12 }}>
                  Accessible proportion of recorded feelings. Shapes and labels ensure clarity beyond color alone.
                </ZText>

                {/* Multi-Segment Stacked Visual Bar */}
                <View
                  style={styles.segmentedProgressBar}
                  accessibilityLabel={`Mood distribution bar: ${ALL_MOODS.map(
                    (m) => `${stats.distribution[m].label} ${stats.distribution[m].percentage}%`
                  ).join(', ')}`}
                >
                  {ALL_MOODS.map((m) => {
                    const item = stats.distribution[m];
                    if (item.count === 0) return null;
                    return (
                      <View
                        key={m}
                        style={[
                          styles.progressSegment,
                          {
                            flex: item.count,
                            backgroundColor: MOOD_VISUALS[m].color,
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                {/* 5 Distinct Mood Breakdown Cards */}
                <View style={styles.moodBreakdownGrid}>
                  {ALL_MOODS.map((m) => {
                    const item = stats.distribution[m];
                    const visual = MOOD_VISUALS[m];
                    const isPresent = item.count > 0;

                    return (
                      <View
                        key={m}
                        style={[
                          styles.moodBreakdownCard,
                          isPresent && { borderColor: visual.border },
                          !isPresent && styles.moodBreakdownCardEmpty,
                        ]}
                        accessibilityLabel={`${visual.label} mood: ${item.count} check-ins, ${item.percentage} percent of period total`}
                      >
                        <View style={styles.moodBreakdownTop}>
                          <View
                            style={[
                              styles.moodIconWrap,
                              { backgroundColor: visual.bgSubtle },
                            ]}
                          >
                            <Ionicons name={visual.icon} size={18} color={visual.color} />
                          </View>
                          <ZText variant="caption" style={{ fontSize: 16 }}>
                            {visual.emoji}
                          </ZText>
                        </View>

                        <ZText variant="bodySmall" color={colors.textPrimary} style={{ fontWeight: '700', marginTop: 6 }}>
                          {visual.label}
                        </ZText>

                        <ZText variant="headingLarge" color={isPresent ? visual.color : colors.textTertiary} style={{ fontWeight: '800', marginTop: 2 }}>
                          {item.percentage}%
                        </ZText>

                        <ZText variant="caption" color={colors.textTertiary}>
                          {item.count} {item.count === 1 ? 'entry' : 'entries'}
                        </ZText>

                        {/* Mini Meter */}
                        <View style={styles.miniMeterTrack}>
                          <View
                            style={[
                              styles.miniMeterFill,
                              {
                                width: `${item.percentage}%`,
                                backgroundColor: visual.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ZCard>

              {/* 4. Mood History Over Time (Timeline Visual) */}
              <ZCard elevation="sm" radius={radii.xl} style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleGroup}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                    <ZText variant="headingSmall" color={colors.textBrand} style={{ marginLeft: 8 }}>
                      Mood History Over Time
                    </ZText>
                  </View>
                  <ZText variant="caption" color={colors.textTertiary}>
                    {period === 'week' ? 'Past 7 Days' : period === 'month' ? '30 Days' : '12 Months'}
                  </ZText>
                </View>

                <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 4, marginBottom: 14 }}>
                  {period === 'week'
                    ? 'Day-by-day reflection timeline. Tap any day to view notes and themes.'
                    : 'Emotional rhythm density across this time window.'}
                </ZText>

                {/* Week Day-by-Day Strip */}
                {period === 'week' ? (
                  <View>
                    <View style={styles.weekTimelineStrip}>
                      {Array.from({ length: 7 }).map((_, idx) => {
                        // Days from 6 days ago up to today
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - idx));
                        const dateStr = getLocalTodayDateString(d);
                        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayNum = d.getDate();

                        const entry = currentEntries.find((e) => e.logged_date === dateStr);
                        const isSelected = activeDayDate === dateStr;

                        return (
                          <Pressable
                            key={dateStr}
                            onPress={() => {
                              triggerHaptic();
                              setActiveDayDate(isSelected ? null : dateStr);
                            }}
                            style={[
                              styles.weekDayPill,
                              entry && { borderColor: MOOD_VISUALS[entry.mood].border },
                              isSelected && styles.weekDayPillSelected,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${dayName} ${dayNum}: ${entry ? entry.mood : 'Unrecorded'}`}
                          >
                            <ZText variant="caption" color={colors.textTertiary} style={{ fontSize: 11 }}>
                              {dayName}
                            </ZText>
                            <ZText
                              variant="label"
                              color={isSelected ? colors.primary : colors.textPrimary}
                              style={{ fontWeight: '700', marginTop: 2, marginBottom: 6 }}
                            >
                              {dayNum}
                            </ZText>

                            {entry ? (
                              <View
                                style={[
                                  styles.dayMoodDot,
                                  { backgroundColor: MOOD_VISUALS[entry.mood].bgSubtle },
                                ]}
                              >
                                <Ionicons
                                  name={MOOD_VISUALS[entry.mood].icon}
                                  size={16}
                                  color={MOOD_VISUALS[entry.mood].color}
                                />
                              </View>
                            ) : (
                              <View style={styles.dayUnrecordedDot}>
                                <Ionicons name="ellipse-outline" size={12} color={colors.border} />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Active Day Detail Highlight Card */}
                    {activeDayDate && (
                      <View style={styles.activeDayDetailCard}>
                        <View style={styles.activeDayHeader}>
                          <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                          <ZText variant="label" color={colors.textBrand} style={{ marginLeft: 6, fontWeight: '700' }}>
                            {activeDayDate}
                          </ZText>
                          <Pressable
                            hitSlop={6}
                            onPress={() => setActiveDayDate(null)}
                            style={{ marginLeft: 'auto' }}
                          >
                            <Ionicons name="close" size={16} color={colors.textTertiary} />
                          </Pressable>
                        </View>

                        {activeDayEntry ? (
                          <View style={{ marginTop: 8 }}>
                            <View style={styles.entryMoodPillRow}>
                              <ZBadge
                                label={`${MOOD_VISUALS[activeDayEntry.mood].emoji} ${MOOD_VISUALS[activeDayEntry.mood].label}`}
                                color={MOOD_VISUALS[activeDayEntry.mood].color}
                                backgroundColor={MOOD_VISUALS[activeDayEntry.mood].bgSubtle}
                              />
                            </View>
                            {activeDayEntry.note && (
                              <ZText variant="bodySmall" color={colors.textPrimary} style={styles.entryNoteQuote}>
                                “{activeDayEntry.note}”
                              </ZText>
                            )}
                            {activeDayEntry.tags && activeDayEntry.tags.length > 0 && (
                              <View style={styles.entryTagsRow}>
                                {activeDayEntry.tags.map((t) => (
                                  <ZText key={t} variant="caption" color={colors.primary} style={styles.tagText}>
                                    #{t}
                                  </ZText>
                                ))}
                              </View>
                            )}
                          </View>
                        ) : (
                          <ZText variant="bodySmall" color={colors.textTertiary} style={{ marginTop: 6 }}>
                            No reflection was recorded on this day.
                          </ZText>
                        )}
                      </View>
                    )}
                  </View>
                ) : (
                  /* Responsive SVG Timeline / Density Visual for Month & Year */
                  <View style={styles.svgChartContainer}>
                    <Svg width="100%" height={120} viewBox="0 0 320 120">
                      {/* Background grid lines */}
                      <Line x1="10" y1="20" x2="310" y2="20" stroke="#f4f4f5" strokeWidth="1" />
                      <Line x1="10" y1="60" x2="310" y2="60" stroke="#f4f4f5" strokeWidth="1" />
                      <Line x1="10" y1="100" x2="310" y2="100" stroke="#f4f4f5" strokeWidth="1" />

                      {/* Timeline Bars / Nodes */}
                      {currentEntries.slice(0, 15).map((entry, idx) => {
                        const x = 20 + idx * 19;
                        const visual = MOOD_VISUALS[entry.mood];
                        const barHeight = entry.mood === 'happy' ? 70 : entry.mood === 'calm' ? 55 : entry.mood === 'neutral' ? 45 : 35;
                        const y = 100 - barHeight;

                        return (
                          <G key={entry.id}>
                            <Rect
                              x={x}
                              y={y}
                              width={12}
                              height={barHeight}
                              rx={4}
                              fill={visual.color}
                              opacity={0.85}
                            />
                            <Circle cx={x + 6} cy={y} r={3} fill="#fff" stroke={visual.color} strokeWidth={2} />
                          </G>
                        );
                      })}

                      {/* Axis Labels */}
                      <SvgText x="20" y="115" fontSize="10" fill="#a1a1aa">
                        {stats.startDate.slice(5)}
                      </SvgText>
                      <SvgText x="270" y="115" fontSize="10" fill="#a1a1aa">
                        {stats.endDate.slice(5)}
                      </SvgText>
                    </Svg>

                    <ZText variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 4 }}>
                      Chronological reflection density across {stats.daysInPeriod} days
                    </ZText>
                  </View>
                )}
              </ZCard>

              {/* 5. Personal Observations (Non-Clinical) */}
              <ZCard elevation="sm" radius={radii.xl} style={styles.observationsCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleGroup}>
                    <Ionicons name="sparkles" size={18} color={colors.primary} />
                    <ZText variant="headingSmall" color={colors.textBrand} style={{ marginLeft: 8 }}>
                      Personal Observations
                    </ZText>
                  </View>
                  <ZBadge label="Non-Clinical" color={colors.primary} backgroundColor={colors.primarySubtle} />
                </View>

                <View style={styles.observationList}>
                  {stats.dominantMood && (
                    <View style={styles.observationItem}>
                      <Ionicons
                        name={MOOD_VISUALS[stats.dominantMood].icon}
                        size={18}
                        color={MOOD_VISUALS[stats.dominantMood].color}
                        style={{ marginTop: 2 }}
                      />
                      <ZText variant="bodySmall" color={colors.textPrimary} style={{ marginLeft: 8, flex: 1, lineHeight: 20 }}>
                        <ZText variant="bodySmall" style={{ fontWeight: '700' }}>
                          {MOOD_VISUALS[stats.dominantMood].label}
                        </ZText>{' '}
                        was your most frequently recorded mood ({stats.distribution[stats.dominantMood].count} of{' '}
                        {stats.totalCheckIns} check-ins, {stats.dominantPercentage}%).
                      </ZText>
                    </View>
                  )}

                  <View style={styles.observationItem}>
                    <Ionicons name="checkbox-outline" size={18} color="#059669" style={{ marginTop: 2 }} />
                    <ZText variant="bodySmall" color={colors.textPrimary} style={{ marginLeft: 8, flex: 1, lineHeight: 20 }}>
                      You checked in on{' '}
                      <ZText variant="bodySmall" style={{ fontWeight: '700' }}>
                        {new Set(currentEntries.map((e) => e.logged_date)).size} distinct days
                      </ZText>{' '}
                      out of {stats.daysInPeriod} days ({stats.checkInRatePercent}% cadence).
                    </ZText>
                  </View>

                  {stats.topTags.length > 0 && (
                    <View style={styles.observationItem}>
                      <Ionicons name="pricetag-outline" size={18} color="#7c3aed" style={{ marginTop: 2 }} />
                      <ZText variant="bodySmall" color={colors.textPrimary} style={{ marginLeft: 8, flex: 1, lineHeight: 20 }}>
                        Common contextual tags recorded:{' '}
                        <ZText variant="bodySmall" style={{ fontWeight: '700' }}>
                          {stats.topTags.map((t) => `#${t.tag} (${t.count})`).join(', ')}
                        </ZText>
                        .
                      </ZText>
                    </View>
                  )}
                </View>

                {/* Explicit Non-Clinical Disclaimer */}
                <View style={styles.disclaimerBox}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <ZText variant="caption" color={colors.textSecondary} style={styles.disclaimerText}>
                    Personal reflection only: Zeona summarizes self-reported moods to cultivate mindfulness.
                    This page does not provide mental health diagnoses or clinical evaluations.
                  </ZText>
                </View>
              </ZCard>

              {/* 6. List of Recorded Moods and Optional Notes */}
              <View style={styles.historyListSection}>
                <View style={styles.sectionTitleRow}>
                  <ZText variant="headingMedium" color={colors.textBrand}>
                    Recorded Reflections ({currentEntries.length})
                  </ZText>
                  <ZText variant="caption" color={colors.textTertiary}>
                    Newest first
                  </ZText>
                </View>

                {currentEntries.map((entry) => {
                  const visual = MOOD_VISUALS[entry.mood];
                  return (
                    <ZCard key={entry.id} elevation="sm" radius={radii.lg} style={styles.entryCard}>
                      <View style={styles.entryHeaderRow}>
                        <View style={styles.entryDateGroup}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                          <ZText variant="label" color={colors.textPrimary} style={{ marginLeft: 6, fontWeight: '700' }}>
                            {entry.logged_date}
                          </ZText>
                        </View>

                        <ZBadge
                          label={`${visual.emoji} ${visual.label}`}
                          color={visual.color}
                          backgroundColor={visual.bgSubtle}
                        />
                      </View>

                      {entry.note ? (
                        <View style={styles.entryNoteBox}>
                          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} style={{ marginTop: 2 }} />
                          <ZText variant="bodySmall" color={colors.textPrimary} style={styles.entryNoteText}>
                            “{entry.note}”
                          </ZText>
                        </View>
                      ) : (
                        <ZText variant="caption" color={colors.textTertiary} style={{ marginTop: 6, fontStyle: 'italic' }}>
                          No written note for this check-in.
                        </ZText>
                      )}

                      {entry.tags && entry.tags.length > 0 && (
                        <View style={styles.entryTagsContainer}>
                          {entry.tags.map((tag) => (
                            <View key={tag} style={styles.entryTagChip}>
                              <ZText variant="caption" color={colors.primary} style={{ fontSize: 11, fontWeight: '600' }}>
                                #{tag}
                              </ZText>
                            </View>
                          ))}
                        </View>
                      )}

                      <ZDivider style={{ marginVertical: spacing[2] }} />

                      <View style={styles.entryFooterRow}>
                        <ZText variant="caption" color={colors.textTertiary}>
                          Logged at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </ZText>
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            triggerHaptic();
                            router.push('/mood');
                          }}
                          style={styles.editActionLink}
                          accessibilityLabel={`Edit check-in from ${entry.logged_date}`}
                        >
                          <Ionicons name="create-outline" size={14} color={colors.primary} />
                          <ZText variant="caption" color={colors.primary} style={{ marginLeft: 4, fontWeight: '600' }}>
                            Edit
                          </ZText>
                        </Pressable>
                      </View>
                    </ZCard>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
    paddingTop: spacing[2],
  },
  responsiveWrapper: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2.5],
    ...shadows.sm,
  },
  headerTextWrapper: {
    flex: 1,
  },
  checkInQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },

  // Period Selector
  periodSelectorWrapper: {
    marginVertical: spacing[2.5],
    alignItems: 'center',
  },
  periodSegment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: radii.full,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 360,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#ffffff',
    ...shadows.sm,
  },
  dateRangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },

  // States
  stateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[5],
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[5],
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Insights Content
  insightsContent: {
    marginTop: spacing[2],
    gap: spacing[3.5],
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[3],
    alignItems: 'center',
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Comparison Card
  comparisonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[4],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendDeltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  trendDeltaPositive: {
    backgroundColor: '#ecfdf5',
  },
  trendDeltaNeutral: {
    backgroundColor: '#fffbeb',
  },
  comparisonMiniGrid: {
    flexDirection: 'row',
    marginTop: spacing[3],
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing[2],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  insufficientDataNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Section Card
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[4],
  },

  // Segmented Progress Bar
  segmentedProgressBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#e4e4e7',
    marginBottom: spacing[3],
  },
  progressSegment: {
    height: '100%',
  },

  // Mood Breakdown Grid
  moodBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  moodBreakdownCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodBreakdownCardEmpty: {
    opacity: 0.6,
  },
  moodBreakdownTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMeterTrack: {
    height: 4,
    backgroundColor: '#e4e4e7',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniMeterFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Week Timeline Strip
  weekTimelineStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekDayPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekDayPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  dayMoodDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayUnrecordedDot: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Active Day Highlight
  activeDayDetailCard: {
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryMoodPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryNoteQuote: {
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  entryTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tagText: {
    fontWeight: '600',
    fontSize: 11,
  },

  // SVG Chart Container
  svgChartContainer: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },

  // Observations Card
  observationsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[4],
  },
  observationList: {
    marginTop: spacing[2],
    gap: spacing[2],
  },
  observationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: spacing[2],
    borderRadius: radii.md,
    marginTop: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: {
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },

  // History List Section
  historyListSection: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  entryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[3],
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: spacing[2],
    borderRadius: radii.md,
    marginTop: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryNoteText: {
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  entryTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing[2],
  },
  entryTagChip: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  entryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
});
