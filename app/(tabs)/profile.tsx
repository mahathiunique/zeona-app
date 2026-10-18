/**
 * Zeona — Profile Tab
 * User info, live stats from stores, responsive container, and sub-feature navigation.
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ZText, ZCard, ZDivider } from '@/components/ui';
import { colors, spacing, radii, shadows } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { isSupabaseConfigured } from '@/services/supabase';
import { useJournalStore } from '@/store/journalStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useAuthStore } from '@/store/authStore';
import { useHabitStore } from '@/store/habitStore';
import { triggerHaptic } from '@/utils/haptics';

interface ProfileLinkProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
}

function ProfileLink({ icon, label, subtitle, color = colors.primary, onPress }: ProfileLinkProps) {
  return (
    <Pressable
      onPress={() => {
        triggerHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.linkIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.linkText}>
        <ZText variant="label" color={colors.textPrimary}>{label}</ZText>
        {subtitle && (
          <ZText variant="caption" color={colors.textSecondary}>{subtitle}</ZText>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { entries } = useJournalStore();
  const { tasks, habits } = useCalendarStore();
  const { user, isGuest, signOut } = useAuthStore();
  const habitStoreHabits = useHabitStore((s) => s.habits);
  const habitStoreLogs = useHabitStore((s) => s.logs);

  const overallHabitStats = useMemo(() => {
    return useHabitStore.getState().getOverallStats();
  }, [habitStoreHabits, habitStoreLogs]);

  const maxStreak = overallHabitStats.bestStreak;
  const tasksDone = tasks.filter((t) => t.is_completed).length;

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : isGuest ? 'Guest Sanctuary' : 'Mahathi 💜');

  const displaySubtitle = user?.email
    ? user.email
    : isGuest
    ? 'Exploring in guest sanctuary'
    : '"A gentle heart turning dreams into plans."';

  const STATS = [
    { value: `${maxStreak}`, label: 'Day Streak' },
    { value: `${entries.length}`, label: 'Journal Entries' },
    { value: `${tasksDone}`, label: 'Tasks Done' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveContainer}>
          {/* ── Header actions ───────────────────────────────────────────── */}
          <View style={styles.topRow}>
            <ZText variant="displayMedium" color={colors.textBrand}>Profile</ZText>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() => triggerHaptic()}
              >
                <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() => triggerHaptic()}
              >
                <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* ── Avatar + name ────────────────────────────────────────────── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <ZText style={styles.avatarEmoji}>🌸</ZText>
            </View>
            <View style={styles.avatarText}>
              <ZText variant="headingLarge" color={colors.textPrimary}>
                {displayName}
              </ZText>
              <ZText variant="bodySmall" color={colors.textSecondary} align="center">
                {displaySubtitle}
              </ZText>
            </View>

            {/* Supabase status banner */}
            {!isSupabaseConfigured && (
              <View style={styles.warningBanner}>
                <Ionicons name="leaf-outline" size={18} color={colors.primary} />
                <ZText variant="caption" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
                  Running securely in local offline mode.{'\n'}
                  Add Supabase URL and anon key to <ZText variant="caption" style={{ fontWeight: '700' }}>.env</ZText> for cross-device cloud sync.
                </ZText>
              </View>
            )}
          </View>

          {/* ── Stats ────────────────────────────────────────────────────── */}
          <ZCard style={styles.statsCard} elevation="sm" radius={radii['2xl']}>
            <View style={styles.statsRow}>
              {STATS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <View style={styles.statItem}>
                    <ZText variant="headingLarge" color={colors.textBrand}>
                      {s.value}
                    </ZText>
                    <ZText variant="caption" color={colors.textSecondary} align="center">
                      {s.label}
                    </ZText>
                  </View>
                  {i < STATS.length - 1 && (
                    <View style={styles.statDivider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </ZCard>

          {/* ── Navigation Links ─────────────────────────────────────────── */}
          <ZCard elevation="sm" style={styles.linksCard} radius={radii['2xl']}>
            <ProfileLink
              icon="book-outline"
              label="Journal Reflections"
              subtitle={`${entries.length} reflections captured`}
              color={colors.primary}
              onPress={() => router.push('/(tabs)/journal')}
            />
            <ZDivider marginV={spacing[1.5]} />
            <ProfileLink
              icon="repeat-outline"
              label="Habit Streaks"
              subtitle={`${overallHabitStats.activeHabitsCount} habits in progress`}
              color={colors.sage}
              onPress={() => router.push('/habits')}
            />
            <ZDivider marginV={spacing[1.5]} />
            <ProfileLink
              icon="calendar-outline"
              label="Important Dates & Milestones"
              subtitle="Birthdays, events & reminders"
              color={colors.accent}
              onPress={() => router.push('/(tabs)/calendar')}
            />
            <ZDivider marginV={spacing[1.5]} />
            <ProfileLink
              icon="heart-outline"
              label="Favorites"
              subtitle="Cherished reflections and memories"
              color="#e879f9"
              onPress={() => router.push('/(tabs)/journal')}
            />
            <ZDivider marginV={spacing[1.5]} />
            <ProfileLink
              icon="shield-checkmark-outline"
              label="Privacy & Offline Security"
              subtitle="All personal entries stored securely"
              color={colors.sky}
              onPress={() => triggerHaptic()}
            />
            <ZDivider marginV={spacing[1.5]} />
            <ProfileLink
              icon="sparkles-outline"
              label="Replay Onboarding"
              subtitle="View Zeona's welcome and guided tour"
              color={colors.accent}
              onPress={() => router.push('/onboarding')}
            />
            <ZDivider marginV={spacing[1.5]} />
            <ProfileLink
              icon="log-out-outline"
              label="Sign Out"
              subtitle={user ? `Signed in as ${user.email}` : 'Exit sanctuary session'}
              color={colors.error}
              onPress={async () => {
                await signOut();
              }}
            />
          </ZCard>

          <View style={{ height: spacing[12] }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll:   { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[4],
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: spacing[4],
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xs,
  },

  avatarSection: {
    alignItems: 'center',
    gap: spacing[3],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    backgroundColor: colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  avatarEmoji: { fontSize: 44 },
  avatarText:  { alignItems: 'center', gap: spacing[1] },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.primarySubtle,
    borderRadius: radii.xl,
    padding: spacing[3.5],
    borderWidth: 1,
    borderColor: colors.primaryLight,
    width: '100%',
  },

  statsCard: { paddingVertical: spacing[4] },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center', gap: spacing[1], flex: 1 },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },

  linksCard: {
    padding: spacing[4],
    gap: spacing[1],
  },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1.5],
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: { flex: 1, gap: 2 },
});
