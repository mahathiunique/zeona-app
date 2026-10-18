/**
 * Zeona — Profile Screen
 *
 * User profile, live wellness statistics, and sub-feature navigation:
 * - User avatar and display name with instant editing (photo upload or avatar presets)
 * - Real calculated statistics: Current habit streak, Journal entry count, Task completion count
 * - Navigation links: My Stats, My Habits, Mood Insights, Memories, and Reminders
 * - Account settings, privacy status, onboarding replay, and secure sign-out
 * - Soft pastel stat cards, Playfair Display headers, and graceful error/empty states
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ZText, ZCard, ZBadge, ZButton, ZDivider } from '@/components/ui';
import { colors, spacing, radii, shadows } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { isSupabaseConfigured } from '@/services/supabase';
import { triggerHaptic } from '@/utils/haptics';

import { useAuthStore } from '@/store/authStore';
import { useJournalStore } from '@/store/journalStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useHabitStore } from '@/store/habitStore';
import { useMemoryStore } from '@/store/memoryStore';
import { useMoodStore } from '@/store/moodStore';
import { calculateCurrentStreak } from '@/utils/habitCalculations';
import { uploadMemoryPhoto, MAX_FILE_SIZE_BYTES } from '@/services/photoStorage';

const AVATAR_PRESETS = ['🌸', '🌿', '🌙', '🦋', '✨', '☕'];

interface ProfileLinkProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  color?: string;
  badge?: string;
  onPress?: () => void;
}

function ProfileLink({
  icon,
  label,
  subtitle,
  color = colors.primary,
  badge,
  onPress,
}: ProfileLinkProps) {
  return (
    <Pressable
      onPress={() => {
        triggerHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.75 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.linkIconCircle, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.linkTextContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ZText variant="label" color={colors.textPrimary}>
            {label}
          </ZText>
          {badge && (
            <ZBadge label={badge} color={color} backgroundColor={`${color}15`} />
          )}
        </View>
        {subtitle && (
          <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {subtitle}
          </ZText>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  // Stores
  const { user, isGuest, signOut, updateProfile } = useAuthStore();
  const { entries: journalEntries } = useJournalStore();
  const { tasks } = useCalendarStore();
  const { habits, getLogsForHabit, getOverallStats } = useHabitStore();
  const { memories } = useMemoryStore();
  const { entries: moodEntries } = useMoodStore();

  // Edit Profile Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🌸');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Sign Out Modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // My Stats Breakdown Modal
  const [showStatsModal, setShowStatsModal] = useState(false);

  // ── Calculated Real Statistics ──────────────────────────────────────────────
  const currentHabitStreak = useMemo(() => {
    const active = habits.filter((h) => !h.is_archived);
    let maxCur = 0;
    for (const h of active) {
      const dates = getLogsForHabit(h.id);
      const cur = calculateCurrentStreak(h, dates);
      if (cur > maxCur) maxCur = cur;
    }
    return maxCur;
  }, [habits, getLogsForHabit]);

  const habitOverall = useMemo(() => {
    return getOverallStats();
  }, [getOverallStats]);

  const tasksCompletedCount = useMemo(() => {
    return tasks.filter((t) => t.is_completed).length;
  }, [tasks]);

  const journalEntriesCount = journalEntries.length;
  const memoriesCount = memories.length;
  const moodCheckInsCount = moodEntries.length;

  // Display Name and Details
  const meta = user?.user_metadata || {};
  const currentAvatar = meta.avatar_url || '🌸';
  const isImageAvatar = currentAvatar.startsWith('http') || currentAvatar.startsWith('file:') || currentAvatar.startsWith('blob:');

  const displayName =
    meta.display_name ||
    meta.full_name ||
    (user?.email ? user.email.split('@')[0] : isGuest ? 'Guest Sanctuary' : 'Mindful Soul 💜');

  const displayBio =
    meta.bio ||
    (user?.email
      ? 'A gentle heart turning dreams into plans.'
      : isGuest
      ? 'Exploring in guest sanctuary mode'
      : 'Honoring everyday moments with kind curiosity.');

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    triggerHaptic();
    setEditName(displayName);
    setEditBio(displayBio);
    setSelectedAvatar(currentAvatar);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');
    setShowEditModal(true);
  };

  // Upload Custom Photo for Avatar
  const handlePickAvatarPhoto = async () => {
    triggerHaptic();
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant photo library access to change your avatar.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
          setProfileErrorMsg('Image exceeds 10MB limit. Please choose a smaller photo.');
          return;
        }

        try {
          const res = await uploadMemoryPhoto({
            uri: asset.uri,
            userId: user?.id || 'local-user',
            fileSize: asset.fileSize,
          });
          setSelectedAvatar(res.viewUrl);
        } catch {
          setSelectedAvatar(asset.uri);
        }
      }
    } catch {
      setProfileErrorMsg('Could not pick photo. Please try again.');
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      triggerHaptic();
      setProfileErrorMsg('Display name cannot be empty');
      return;
    }

    setIsSavingProfile(true);
    triggerHaptic();

    try {
      await updateProfile({
        displayName: trimmedName,
        bio: editBio.trim() || undefined,
        avatarUrl: selectedAvatar,
      });

      setIsSavingProfile(false);
      setProfileSuccessMsg('Profile updated beautifully 🌸');
      setTimeout(() => {
        setShowEditModal(false);
        setProfileSuccessMsg('');
      }, 900);
    } catch {
      setIsSavingProfile(false);
      setProfileErrorMsg('Could not update profile. Please try again.');
    }
  };

  // Sign out handler
  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    triggerHaptic();
    try {
      await signOut();
      setIsSigningOut(false);
      setShowSignOutModal(false);
      router.replace('/(auth)/login');
    } catch {
      setIsSigningOut(false);
      setShowSignOutModal(false);
    }
  };

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
          {/* ── Top Header ──────────────────────────────────────────────── */}
          <View style={styles.topRow}>
            <View>
              <ZText variant="displayMedium" color={colors.textBrand}>
                Profile
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Your sanctuary progress & account settings
              </ZText>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={handleOpenEditModal}
                accessibilityLabel="Edit Profile"
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                hitSlop={8}
                style={styles.headerBtn}
                onPress={() => setShowStatsModal(true)}
                accessibilityLabel="My Stats"
              >
                <Ionicons name="stats-chart-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* ── User Avatar & Display Details ───────────────────────────── */}
          <View style={styles.avatarSection}>
            <Pressable
              onPress={handleOpenEditModal}
              style={styles.avatarWrapper}
              accessibilityLabel="Change profile picture"
            >
              {isImageAvatar ? (
                <Image source={{ uri: currentAvatar }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatarCircle}>
                  <ZText style={styles.avatarEmoji}>{currentAvatar}</ZText>
                </View>
              )}

              {/* Edit Pencil Badge */}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="pencil" size={12} color="#fff" />
              </View>
            </Pressable>

            <View style={styles.avatarText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ZText variant="headingLarge" color={colors.textPrimary}>
                  {displayName}
                </ZText>
                {isGuest && (
                  <ZBadge label="Guest" color={colors.primary} backgroundColor={colors.primarySubtle} />
                )}
              </View>
              <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ maxWidth: 360 }}>
                {displayBio}
              </ZText>
              {user?.email && (
                <ZText variant="caption" color={colors.textTertiary}>
                  {user.email}
                </ZText>
              )}
            </View>

            {/* Offline Mode Info Banner */}
            {!isSupabaseConfigured && (
              <View style={styles.offlineBanner}>
                <Ionicons name="leaf-outline" size={18} color={colors.primary} />
                <ZText variant="caption" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
                  Running securely in local offline mode.{'\n'}
                  Data is safely preserved on this device.
                </ZText>
              </View>
            )}
          </View>

          {/* ── Real Statistics Cards ───────────────────────────────────── */}
          <ZCard style={styles.statsCard} elevation="sm" radius={radii['2xl']}>
            <View style={styles.statsRow}>
              {/* Stat 1: Current Habit Streak */}
              <Pressable
                onPress={() => router.push('/habits')}
                style={styles.statItem}
                accessibilityLabel={`Current habit streak ${currentHabitStreak} days`}
              >
                <View style={[styles.statIconBadge, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="flame" size={18} color={colors.sage} />
                </View>
                <ZText variant="headingLarge" color={colors.textBrand} style={{ fontWeight: '800' }}>
                  {currentHabitStreak}d
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} align="center">
                  Habit Streak
                </ZText>
              </Pressable>

              <View style={styles.statDivider} />

              {/* Stat 2: Journal-Entry Count */}
              <Pressable
                onPress={() => router.push('/(tabs)/journal')}
                style={styles.statItem}
                accessibilityLabel={`Journal entries ${journalEntriesCount}`}
              >
                <View style={[styles.statIconBadge, { backgroundColor: colors.primarySubtle }]}>
                  <Ionicons name="book-outline" size={18} color={colors.primary} />
                </View>
                <ZText variant="headingLarge" color={colors.textBrand} style={{ fontWeight: '800' }}>
                  {journalEntriesCount}
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} align="center">
                  Journal Entries
                </ZText>
              </Pressable>

              <View style={styles.statDivider} />

              {/* Stat 3: Task-Completion Count */}
              <Pressable
                onPress={() => router.push('/tasks')}
                style={styles.statItem}
                accessibilityLabel={`Tasks completed ${tasksCompletedCount}`}
              >
                <View style={[styles.statIconBadge, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="checkmark-done" size={18} color="#059669" />
                </View>
                <ZText variant="headingLarge" color={colors.textBrand} style={{ fontWeight: '800' }}>
                  {tasksCompletedCount}
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} align="center">
                  Tasks Done
                </ZText>
              </Pressable>
            </View>
          </ZCard>

          {/* ── Sub-Feature Navigation Links ─────────────────────────────── */}
          <ZCard elevation="sm" style={styles.linksCard} radius={radii['2xl']}>
            {/* 1. My Stats */}
            <ProfileLink
              icon="stats-chart-outline"
              label="My Stats"
              subtitle="Wellness milestones & cadence summary"
              color={colors.primary}
              badge="Overview"
              onPress={() => setShowStatsModal(true)}
            />
            <ZDivider marginV={spacing[1]} />

            {/* 2. My Habits */}
            <ProfileLink
              icon="repeat-outline"
              label="My Habits"
              subtitle={`${habitOverall.activeHabitsCount} active habits • ${habitOverall.averageWeeklyRate}% consistency`}
              color={colors.sage}
              onPress={() => router.push('/habits')}
            />
            <ZDivider marginV={spacing[1]} />

            {/* 3. Mood Insights */}
            <ProfileLink
              icon="heart-outline"
              label="Mood Insights"
              subtitle={`${moodCheckInsCount} reflections recorded`}
              color="#e11d48"
              onPress={() => router.push('/mood/insights')}
            />
            <ZDivider marginV={spacing[1]} />

            {/* 4. Memories */}
            <ProfileLink
              icon="images-outline"
              label="Memories"
              subtitle={`${memoriesCount} moments preserved in gallery`}
              color={colors.sky}
              onPress={() => router.push('/memories')}
            />
            <ZDivider marginV={spacing[1]} />

            {/* 5. Reminders */}
            <ProfileLink
              icon="notifications-outline"
              label="Reminders"
              subtitle="Mindful cues & scheduled sanctuary alerts"
              color={colors.accent}
              onPress={() => router.push('/reminders')}
            />
          </ZCard>

          {/* ── Account Settings & Preferences ──────────────────────────── */}
          <ZCard elevation="sm" style={styles.linksCard} radius={radii['2xl']}>
            <ProfileLink
              icon="shield-checkmark-outline"
              label="Privacy & Security"
              subtitle="Private storage & encrypted data"
              color={colors.primaryDark}
              onPress={() => {
                Alert.alert(
                  'Privacy & Security',
                  'Zeona protects your data with strict authentication policies. Your journal reflections, recordings, moods, and photos are stored privately and never shared.'
                );
              }}
            />
            <ZDivider marginV={spacing[1]} />
            <ProfileLink
              icon="sparkles-outline"
              label="Replay Onboarding"
              subtitle="Revisit the welcome guided tour"
              color={colors.secondary}
              onPress={() => router.push('/onboarding')}
            />
            <ZDivider marginV={spacing[1]} />
            <ProfileLink
              icon="log-out-outline"
              label="Sign Out"
              subtitle={user ? `Signed in as ${user.email}` : 'Exit sanctuary session'}
              color={colors.error}
              onPress={() => setShowSignOutModal(true)}
            />
          </ZCard>

          <View style={{ height: spacing[12] }} />
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal ───────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalBox}>
            <View style={styles.modalHeaderRow}>
              <ZText variant="headingMedium" color={colors.textBrand}>
                Edit Profile
              </ZText>
              <Pressable
                hitSlop={8}
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Avatar Selector */}
              <View style={styles.avatarEditContainer}>
                {selectedAvatar.startsWith('http') || selectedAvatar.startsWith('file:') || selectedAvatar.startsWith('blob:') ? (
                  <Image source={{ uri: selectedAvatar }} style={styles.editAvatarImage} />
                ) : (
                  <View style={styles.editAvatarCircle}>
                    <ZText style={{ fontSize: 36 }}>{selectedAvatar}</ZText>
                  </View>
                )}

                <ZButton
                  label="Upload Photo"
                  variant="outline"
                  size="sm"
                  onPress={handlePickAvatarPhoto}
                  leftIcon={<Ionicons name="camera-outline" size={16} color={colors.primary} />}
                  style={{ marginTop: spacing[2] }}
                />

                {/* Preset Emojis */}
                <View style={styles.presetEmojisRow}>
                  {AVATAR_PRESETS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        triggerHaptic();
                        setSelectedAvatar(emoji);
                      }}
                      style={[
                        styles.presetEmojiBtn,
                        selectedAvatar === emoji && styles.presetEmojiBtnActive,
                      ]}
                    >
                      <ZText style={{ fontSize: 20 }}>{emoji}</ZText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Display Name Input */}
              <View style={styles.modalInputGroup}>
                <ZText variant="label" color={colors.textPrimary} style={styles.modalInputLabel}>
                  Display Name *
                </ZText>
                <TextInput
                  value={editName}
                  onChangeText={(val) => {
                    setEditName(val);
                    if (profileErrorMsg) setProfileErrorMsg('');
                  }}
                  placeholder="Your preferred name…"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.modalTextInput}
                />
              </View>

              {/* Bio / Motto Input */}
              <View style={styles.modalInputGroup}>
                <ZText variant="label" color={colors.textPrimary} style={styles.modalInputLabel}>
                  Sanctuary Motto / Bio
                </ZText>
                <TextInput
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="A gentle thought or intention…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  style={styles.modalTextArea}
                />
              </View>

              {/* Feedback messages */}
              {profileErrorMsg ? (
                <View style={styles.profileErrorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <ZText variant="caption" color={colors.error} style={{ marginLeft: 6, flex: 1 }}>
                    {profileErrorMsg}
                  </ZText>
                </View>
              ) : null}

              {profileSuccessMsg ? (
                <View style={styles.profileSuccessBox}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                  <ZText variant="caption" color="#059669" style={{ marginLeft: 6, flex: 1, fontWeight: '600' }}>
                    {profileSuccessMsg}
                  </ZText>
                </View>
              ) : null}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <ZButton
                label="Cancel"
                variant="outline"
                size="md"
                onPress={() => setShowEditModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ZButton
                label={isSavingProfile ? 'Saving…' : 'Save Changes'}
                variant="primary"
                size="md"
                isLoading={isSavingProfile}
                onPress={handleSaveProfile}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── My Stats Breakdown Modal ─────────────────────────────────────── */}
      <Modal
        visible={showStatsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.statsModalBox}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
                <ZText variant="headingMedium" color={colors.textBrand}>
                  My Sanctuary Stats
                </ZText>
              </View>
              <Pressable hitSlop={8} onPress={() => setShowStatsModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[3] }}>
              Calculated live from your recorded reflections and activities.
            </ZText>

            <View style={styles.statsGrid}>
              <View style={styles.statsGridTile}>
                <Ionicons name="flame" size={20} color={colors.sage} />
                <ZText variant="headingLarge" color={colors.textPrimary} style={{ fontWeight: '800', marginTop: 4 }}>
                  {currentHabitStreak}d
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Current Habit Streak
                </ZText>
              </View>

              <View style={styles.statsGridTile}>
                <Ionicons name="trophy-outline" size={20} color={colors.accent} />
                <ZText variant="headingLarge" color={colors.textPrimary} style={{ fontWeight: '800', marginTop: 4 }}>
                  {habitOverall.bestStreak}d
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Best Habit Streak
                </ZText>
              </View>

              <View style={styles.statsGridTile}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
                <ZText variant="headingLarge" color={colors.textPrimary} style={{ fontWeight: '800', marginTop: 4 }}>
                  {journalEntriesCount}
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Journal Reflections
                </ZText>
              </View>

              <View style={styles.statsGridTile}>
                <Ionicons name="checkmark-done" size={20} color="#059669" />
                <ZText variant="headingLarge" color={colors.textPrimary} style={{ fontWeight: '800', marginTop: 4 }}>
                  {tasksCompletedCount}
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Tasks Completed
                </ZText>
              </View>

              <View style={styles.statsGridTile}>
                <Ionicons name="images-outline" size={20} color={colors.sky} />
                <ZText variant="headingLarge" color={colors.textPrimary} style={{ fontWeight: '800', marginTop: 4 }}>
                  {memoriesCount}
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Memories Preserved
                </ZText>
              </View>

              <View style={styles.statsGridTile}>
                <Ionicons name="heart-outline" size={20} color="#e11d48" />
                <ZText variant="headingLarge" color={colors.textPrimary} style={{ fontWeight: '800', marginTop: 4 }}>
                  {moodCheckInsCount}
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Mood Check-ins
                </ZText>
              </View>
            </View>

            <View style={{ marginTop: spacing[4] }}>
              <ZButton label="Done" variant="primary" size="md" onPress={() => setShowStatsModal(false)} fullWidth />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Sign Out Confirmation Modal ──────────────────────────────────── */}
      <Modal
        visible={showSignOutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.signOutBox}>
            <View style={styles.signOutIconCircle}>
              <Ionicons name="log-out-outline" size={28} color={colors.error} />
            </View>

            <ZText variant="headingMedium" color={colors.textPrimary} align="center" style={{ marginTop: 12 }}>
              Sign Out of Zeona?
            </ZText>

            <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ marginTop: 8, lineHeight: 20 }}>
              Your sanctuary reflections, habits, and memories remain securely preserved. You can sign back in anytime.
            </ZText>

            <View style={styles.modalActionsRow}>
              <ZButton
                label="Cancel"
                variant="outline"
                size="md"
                onPress={() => setShowSignOutModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ZButton
                label={isSigningOut ? 'Signing out…' : 'Sign Out'}
                variant="danger"
                size="md"
                isLoading={isSigningOut}
                onPress={handleConfirmSignOut}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
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

  // Header
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xs,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    gap: spacing[2.5],
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    ...shadows.md,
  },
  avatarEmoji: { fontSize: 42 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    alignItems: 'center',
    gap: spacing[1],
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.primarySubtle,
    borderRadius: radii.xl,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.primaryLight,
    width: '100%',
  },

  // Stats Card
  statsCard: {
    paddingVertical: spacing[3.5],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing[1],
    flex: 1,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.border,
  },

  // Links Card
  linksCard: {
    padding: spacing[3.5],
    gap: spacing[1],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  linkIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkTextContainer: {
    flex: 1,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  editModalBox: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: radii['2xl'],
    padding: spacing[5],
    ...shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  modalCloseBtn: {
    padding: 4,
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  editAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  presetEmojisRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  presetEmojiBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetEmojiBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },

  modalInputGroup: {
    marginBottom: spacing[3],
  },
  modalInputLabel: {
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  modalTextInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3.5],
    height: 44,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalTextArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 70,
  },
  profileErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    padding: spacing[2],
    borderRadius: radii.md,
    marginBottom: spacing[2],
  },
  profileSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: spacing[2],
    borderRadius: radii.md,
    marginBottom: spacing[2],
  },

  modalActionsRow: {
    flexDirection: 'row',
    marginTop: spacing[3],
    width: '100%',
  },

  // Stats Breakdown Modal
  statsModalBox: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: radii['2xl'],
    padding: spacing[5],
    ...shadows.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  statsGridTile: {
    width: '48%',
    backgroundColor: colors.background,
    padding: spacing[3],
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Sign out Modal
  signOutBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: radii['2xl'],
    padding: spacing[5],
    alignItems: 'center',
    ...shadows.lg,
  },
  signOutIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
