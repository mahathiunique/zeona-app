/**
 * Zeona — Settings Screen
 *
 * Full lifecycle preferences & account control:
 * - Appearance: Light, Dark, System theme with dynamic color tokens
 * - Notification preferences: Mindful rituals, quiet hours, sound/haptic toggles
 * - Privacy information: Data encryption, private storage, transparent disclosures
 * - Profile management: Direct editing of display name, avatar, and bio
 * - Complete data export: Real JSON download of all journals, habits, tasks, moods, memories
 * - Account deletion flow: Irreversible cascading wipe with explicit "DELETE" confirmation
 * - Version & Help: Build information, FAQ, Sanctuary philosophy, and onboarding replay
 * - Account sign-out with graceful state reset
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ZText, ZCard, ZBadge, ZButton, ZDivider } from '@/components/ui';
import { spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { triggerHaptic } from '@/utils/haptics';
import type { ThemeMode } from '@/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, colors, palette, themeMode } = useTheme();

  // Stores
  const {
    notifications,
    privacy,
    isExporting,
    isDeletingAccount,
    initialize: initSettings,
    setThemeMode,
    updateNotifications,
    updatePrivacy,
    exportSanctuaryData,
    deleteAccountAndWipeData,
  } = useSettingsStore();

  const { user, isGuest, updateProfile, signOut } = useAuthStore();

  // Local state & Modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Profile Modal
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(user?.user_metadata?.display_name || '');
  const [editBio, setEditBio] = useState(user?.user_metadata?.bio || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Export Summary Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStats, setExportStats] = useState<{
    fileName: string;
    counts: Record<string, number>;
  } | null>(null);

  // Delete Account Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sign Out Modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Privacy Info Modal
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Help & About Modal
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    initSettings();
  }, [initSettings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── Theme Switcher ──────────────────────────────────────────────────────────

  const handleSelectTheme = (mode: ThemeMode) => {
    triggerHaptic();
    setThemeMode(mode);
    showToast(
      mode === 'dark'
        ? 'Nocturnal Sanctuary theme enabled 🌙'
        : mode === 'light'
        ? 'Warm Ivory Light theme enabled ☀️'
        : 'System appearance enabled 📱'
    );
  };

  // ─── Profile Update ──────────────────────────────────────────────────────────

  const handleOpenEditProfile = () => {
    triggerHaptic();
    setEditName(user?.user_metadata?.display_name || '');
    setEditBio(user?.user_metadata?.bio || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showToast('Name cannot be empty');
      return;
    }
    setIsSavingProfile(true);
    triggerHaptic();
    try {
      await updateProfile({
        displayName: editName.trim(),
        bio: editBio.trim() || undefined,
      });
      setIsSavingProfile(false);
      setShowEditProfileModal(false);
      showToast('Profile updated beautifully 🌸');
    } catch {
      setIsSavingProfile(false);
      showToast('Could not update profile');
    }
  };

  // ─── Data Export ─────────────────────────────────────────────────────────────

  const handleExportData = async () => {
    triggerHaptic();
    try {
      const res = await exportSanctuaryData();
      setExportStats({
        fileName: res.fileName,
        counts: res.recordCounts,
      });
      setShowExportModal(true);
      showToast('Sanctuary data exported ✨');
    } catch {
      showToast('Export failed. Please check permissions.');
    }
  };

  // ─── Account Deletion ────────────────────────────────────────────────────────

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm irreversible removal.');
      triggerHaptic();
      return;
    }

    setDeleteError(null);
    triggerHaptic();

    try {
      const result = await deleteAccountAndWipeData();
      if (result.success) {
        setShowDeleteModal(false);
        router.replace('/(auth)/login');
      } else {
        setDeleteError(result.error || 'Failed to complete deletion. Please try again.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Deletion failed. Please try again.');
    }
  };

  // ─── Sign Out ────────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    triggerHaptic();
    setShowSignOutModal(false);
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Screen Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : 'rgba(230, 225, 220, 0.5)' }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            style={[
              styles.backButton,
              { backgroundColor: isDark ? colors.backgroundCard : 'rgba(255, 255, 255, 0.85)' },
            ]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerTitles}>
            <ZText variant="displayMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
              Settings
            </ZText>
            <ZText variant="caption" color={colors.textSecondary}>
              Preferences, appearance, notifications & privacy
            </ZText>
          </View>

          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ── Main Scrollable Body ──────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveContainer}>
          {/* Toast Notification */}
          {toastMessage && (
            <View style={styles.toastContainer}>
              <View style={[styles.toastCard, { backgroundColor: isDark ? colors.backgroundCard : palette.white }]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <ZText variant="label" color={colors.textPrimary} style={{ marginLeft: spacing[2] }}>
                  {toastMessage}
                </ZText>
              </View>
            </View>
          )}

          {/* ── Group 1: Appearance & Theme ─────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
            <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginLeft: 6, fontWeight: '700' }}>
              Appearance & Theme
            </ZText>
          </View>

          <ZCard elevation="sm" style={[styles.card, { backgroundColor: colors.backgroundCard }]} radius={radii.xl}>
            <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[3] }}>
              Choose your sanctuary atmosphere. Theme changes apply consistently across the entire application.
            </ZText>

            <View style={styles.themeSelectorRow}>
              {/* Option 1: Light Theme */}
              <Pressable
                onPress={() => handleSelectTheme('light')}
                style={[
                  styles.themeOptionCard,
                  { borderColor: themeMode === 'light' ? colors.primary : colors.border },
                  themeMode === 'light' && { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : colors.primarySubtle },
                ]}
              >
                <View style={[styles.themeIconCircle, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="sunny" size={20} color="#d97706" />
                </View>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginTop: 6 }}>
                  Light
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} align="center" style={{ marginTop: 2 }}>
                  Warm Ivory
                </ZText>
                {themeMode === 'light' && (
                  <View style={styles.activeCheckPill}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </View>
                )}
              </Pressable>

              {/* Option 2: Dark Theme */}
              <Pressable
                onPress={() => handleSelectTheme('dark')}
                style={[
                  styles.themeOptionCard,
                  { borderColor: themeMode === 'dark' ? colors.primary : colors.border },
                  themeMode === 'dark' && { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : colors.primarySubtle },
                ]}
              >
                <View style={[styles.themeIconCircle, { backgroundColor: '#312e81' }]}>
                  <Ionicons name="moon" size={20} color="#c7d2fe" />
                </View>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginTop: 6 }}>
                  Dark
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} align="center" style={{ marginTop: 2 }}>
                  Nocturnal Violet
                </ZText>
                {themeMode === 'dark' && (
                  <View style={styles.activeCheckPill}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </View>
                )}
              </Pressable>

              {/* Option 3: System Theme */}
              <Pressable
                onPress={() => handleSelectTheme('system')}
                style={[
                  styles.themeOptionCard,
                  { borderColor: themeMode === 'system' ? colors.primary : colors.border },
                  themeMode === 'system' && { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : colors.primarySubtle },
                ]}
              >
                <View style={[styles.themeIconCircle, { backgroundColor: isDark ? '#272336' : '#f3f4f6' }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
                </View>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginTop: 6 }}>
                  System
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} align="center" style={{ marginTop: 2 }}>
                  Auto {isDark ? '(Dark)' : '(Light)'}
                </ZText>
                {themeMode === 'system' && (
                  <View style={styles.activeCheckPill}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </View>
                )}
              </Pressable>
            </View>
          </ZCard>

          {/* ── Group 2: Notification Preferences ──────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginLeft: 6, fontWeight: '700' }}>
              Notification Preferences
            </ZText>
          </View>

          <ZCard elevation="sm" style={[styles.card, { backgroundColor: colors.backgroundCard }]} radius={radii.xl}>
            {/* Mindful Rituals */}
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                  Mindful Ritual Cues
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Gentle prompts for morning intentions and hydration
                </ZText>
              </View>
              <Switch
                value={notifications.mindfulReminders}
                onValueChange={(val) => {
                  triggerHaptic();
                  updateNotifications({ mindfulReminders: val });
                }}
                trackColor={{ false: isDark ? '#272336' : palette.gray200, true: colors.primary }}
                thumbColor={palette.white}
              />
            </View>

            <ZDivider marginV={spacing[3]} />

            {/* Evening Reflection */}
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                  Evening Reflection & Journaling
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Warm evening reminder to pause and write in your sanctuary
                </ZText>
              </View>
              <Switch
                value={notifications.eveningReflection}
                onValueChange={(val) => {
                  triggerHaptic();
                  updateNotifications({ eveningReflection: val });
                }}
                trackColor={{ false: isDark ? '#272336' : palette.gray200, true: colors.primary }}
                thumbColor={palette.white}
              />
            </View>

            <ZDivider marginV={spacing[3]} />

            {/* Habit Reminders */}
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                  Habit Consistency Alerts
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Encouraging reminders to celebrate streaks and healthy habits
                </ZText>
              </View>
              <Switch
                value={notifications.habitReminders}
                onValueChange={(val) => {
                  triggerHaptic();
                  updateNotifications({ habitReminders: val });
                }}
                trackColor={{ false: isDark ? '#272336' : palette.gray200, true: colors.primary }}
                thumbColor={palette.white}
              />
            </View>

            <ZDivider marginV={spacing[3]} />

            {/* Quiet Hours */}
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                    Quiet Hours
                  </ZText>
                  <ZBadge
                    label={`${notifications.quietHoursStart} – ${notifications.quietHoursEnd}`}
                    color={colors.primary}
                    backgroundColor={colors.primarySubtle}
                    style={{ marginLeft: 8 }}
                  />
                </View>
                <ZText variant="caption" color={colors.textSecondary}>
                  Mutes alerts automatically so your sleep sanctuary is undisturbed
                </ZText>
              </View>
              <Switch
                value={notifications.quietHoursEnabled}
                onValueChange={(val) => {
                  triggerHaptic();
                  updateNotifications({ quietHoursEnabled: val });
                }}
                trackColor={{ false: isDark ? '#272336' : palette.gray200, true: colors.primary }}
                thumbColor={palette.white}
              />
            </View>

            <ZDivider marginV={spacing[3]} />

            {/* Sound & Haptics */}
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                  Auditory Chimes & Sound Cues
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Gentle acoustic chimes for alerts
                </ZText>
              </View>
              <Switch
                value={notifications.soundEnabled}
                onValueChange={(val) => {
                  triggerHaptic();
                  updateNotifications({ soundEnabled: val });
                }}
                trackColor={{ false: isDark ? '#272336' : palette.gray200, true: colors.primary }}
                thumbColor={palette.white}
              />
            </View>

            <ZDivider marginV={spacing[3]} />

            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                  Haptic Feedback
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Tactile vibrations on check-ins and completed rituals
                </ZText>
              </View>
              <Switch
                value={notifications.hapticsEnabled}
                onValueChange={(val) => {
                  triggerHaptic();
                  updateNotifications({ hapticsEnabled: val });
                }}
                trackColor={{ false: isDark ? '#272336' : palette.gray200, true: colors.primary }}
                thumbColor={palette.white}
              />
            </View>

            <ZDivider marginV={spacing[3]} />

            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/reminders');
              }}
              style={styles.settingActionLink}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <ZText variant="label" color={colors.primary} style={{ marginLeft: 8, fontWeight: '700' }}>
                Manage Scheduled Reminders
              </ZText>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
            </Pressable>
          </ZCard>

          {/* ── Group 3: Privacy & Security ─────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginLeft: 6, fontWeight: '700' }}>
              Privacy & Security
            </ZText>
          </View>

          <ZCard elevation="sm" style={[styles.card, { backgroundColor: colors.backgroundCard }]} radius={radii.xl}>
            <View style={styles.privacyBanner}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing[2] }}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700' }}>
                  End-to-End Isolated Sanctuary
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  Your reflections, journals, voice recordings, and memories are secured by Row Level Security (RLS) in Supabase.
                </ZText>
              </View>
            </View>

            <ZDivider marginV={spacing[3]} />

            {/* Cloud Sanctuary Sync */}
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                    Cloud Sanctuary Sync
                  </ZText>
                  <ZBadge label="Protected" color="#059669" backgroundColor="#ecfdf5" style={{ marginLeft: 8 }} />
                </View>
                <ZText variant="caption" color={colors.textSecondary}>
                  Real-time synchronization with Supabase and encrypted offline cache
                </ZText>
              </View>
              <Switch
                value={privacy.cloudSyncEnabled}
                onValueChange={(val) => {
                  triggerHaptic();
                  updatePrivacy({ cloudSyncEnabled: val });
                }}
                trackColor={{ false: isDark ? '#272336' : palette.gray200, true: colors.primary }}
                thumbColor={palette.white}
              />
            </View>

            <ZDivider marginV={spacing[3]} />

            {/* Biometric Lock */}
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                  App Sanctuary Passcode / Biometrics
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Require device authentication when returning to Zeona
                </ZText>
              </View>
              <Switch
                value={privacy.biometricLock}
                onValueChange={(val) => {
                  triggerHaptic();
                  updatePrivacy({ biometricLock: val });
                  showToast(val ? 'Biometrics requirement enabled' : 'Biometrics lock disabled');
                }}
                trackColor={{ false: isDark ? '#272336' : palette.gray200, true: colors.primary }}
                thumbColor={palette.white}
              />
            </View>

            <ZDivider marginV={spacing[3]} />

            {/* Privacy details link */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                setShowPrivacyModal(true);
              }}
              style={styles.settingActionLink}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <ZText variant="label" color={colors.primary} style={{ marginLeft: 8, fontWeight: '700' }}>
                Read Sanctuary Privacy & Storage Policy
              </ZText>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
            </Pressable>
          </ZCard>

          {/* ── Group 4: Profile Management ─────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
            <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginLeft: 6, fontWeight: '700' }}>
              Profile Management
            </ZText>
          </View>

          <ZCard elevation="sm" style={[styles.card, { backgroundColor: colors.backgroundCard }]} radius={radii.xl}>
            <View style={styles.profileSummaryRow}>
              <View
                style={[
                  styles.profileAvatarBubble,
                  { backgroundColor: isDark ? colors.surfaceOverlay : colors.primarySubtle },
                ]}
              >
                {user?.user_metadata?.avatar_url &&
                (user.user_metadata.avatar_url.startsWith('http') ||
                  user.user_metadata.avatar_url.startsWith('file:') ||
                  user.user_metadata.avatar_url.startsWith('blob:')) ? (
                  <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.profileAvatarImg} />
                ) : (
                  <ZText style={{ fontSize: 28 }}>{user?.user_metadata?.avatar_url || '🌸'}</ZText>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: spacing[3] }}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '800', fontSize: 16 }}>
                  {user?.user_metadata?.display_name || (isGuest ? 'Sanctuary Guest' : 'Sanctuary Keeper')}
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  {user?.email || 'guest@zeona.app'}
                </ZText>
                {user?.user_metadata?.bio ? (
                  <ZText variant="caption" color={colors.textTertiary} numberOfLines={1} style={{ marginTop: 2 }}>
                    {user.user_metadata.bio}
                  </ZText>
                ) : null}
              </View>

              <ZButton
                label="Edit"
                size="sm"
                variant="outline"
                onPress={handleOpenEditProfile}
              />
            </View>
          </ZCard>

          {/* ── Group 5: Data Access & Export ───────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginLeft: 6, fontWeight: '700' }}>
              Your Data & Export Rights
            </ZText>
          </View>

          <ZCard elevation="sm" style={[styles.card, { backgroundColor: colors.backgroundCard }]} radius={radii.xl}>
            <ZText variant="caption" color={colors.textSecondary}>
              You own your sanctuary data. You can download an unencrypted, complete copy of all your journal entries,
              habits, tasks, mood reflections, memories, and reminders in standard JSON format at any time.
            </ZText>

            <View style={{ marginTop: spacing[4] }}>
              <ZButton
                label={isExporting ? 'Packaging Sanctuary Data…' : 'Export Sanctuary Data (JSON)'}
                variant="primary"
                leftIcon={<Ionicons name="cloud-download-outline" size={18} color={palette.white} style={{ marginRight: 6 }} />}
                isLoading={isExporting}
                onPress={handleExportData}
              />
            </View>
          </ZCard>

          {/* ── Group 6: App Info, Help & Philosophy ────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginLeft: 6, fontWeight: '700' }}>
              About Zeona
            </ZText>
          </View>

          <ZCard elevation="sm" style={[styles.card, { backgroundColor: colors.backgroundCard }]} radius={radii.xl}>
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                  Version & Build
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Zeona 1.0.0 (Build 52 • Expo SDK 52 • React Native 0.76)
                </ZText>
              </View>
              <ZBadge label="Latest" color="#059669" backgroundColor="#ecfdf5" />
            </View>

            <ZDivider marginV={spacing[3]} />

            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/onboarding');
              }}
              style={styles.settingActionLink}
            >
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <ZText variant="label" color={colors.primary} style={{ marginLeft: 8, fontWeight: '700' }}>
                Replay Guided Tour & Onboarding
              </ZText>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
            </Pressable>

            <ZDivider marginV={spacing[3]} />

            <Pressable
              onPress={() => {
                triggerHaptic();
                setShowHelpModal(true);
              }}
              style={styles.settingActionLink}
            >
              <Ionicons name="heart-outline" size={18} color={colors.primary} />
              <ZText variant="label" color={colors.primary} style={{ marginLeft: 8, fontWeight: '700' }}>
                Sanctuary Philosophy & Support
              </ZText>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
            </Pressable>
          </ZCard>

          {/* ── Group 7: Account Actions & Danger Zone ──────────────────────── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
            <ZText variant="headingSmall" color="#ef4444" style={{ marginLeft: 6, fontWeight: '700' }}>
              Account Actions
            </ZText>
          </View>

          <ZCard elevation="sm" style={[styles.card, { backgroundColor: colors.backgroundCard }]} radius={radii.xl}>
            {/* Sign Out */}
            <View style={styles.settingItemRow}>
              <View style={styles.settingTextGroup}>
                <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                  Sign Out
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Securely exit your session. Your data remains safely backed up.
                </ZText>
              </View>
              <ZButton
                label="Sign Out"
                size="sm"
                variant="outline"
                onPress={() => {
                  triggerHaptic();
                  setShowSignOutModal(true);
                }}
              />
            </View>

            <ZDivider marginV={spacing[4]} />

            {/* Delete Account */}
            <View style={[styles.dangerBox, { borderColor: isDark ? '#7f1d1d' : '#fecaca' }]}>
              <View style={styles.settingItemRow}>
                <View style={styles.settingTextGroup}>
                  <ZText variant="label" color="#dc2626" style={{ fontWeight: '700' }}>
                    Permanently Delete Account
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                    Irreversibly wipe all database records, memories, voice notes, and private files.
                  </ZText>
                </View>
                <ZButton
                  label="Delete Account"
                  size="sm"
                  variant="danger"
                  onPress={() => {
                    triggerHaptic();
                    setDeleteConfirmationText('');
                    setDeleteError(null);
                    setShowDeleteModal(true);
                  }}
                />
              </View>
            </View>
          </ZCard>

          <View style={{ height: spacing[10] }} />
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal ────────────────────────────────────────────── */}
      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.modalHeaderRow}>
              <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                Edit Profile
              </ZText>
              <Pressable
                onPress={() => setShowEditProfileModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.surfaceOverlay : palette.gray100 }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <ZText variant="label" color={colors.textPrimary} style={styles.formLabel}>
                Display Name *
              </ZText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#272336' : palette.gray100,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your preferred sanctuary name"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <ZText variant="label" color={colors.textPrimary} style={styles.formLabel}>
                Personal Bio / Intention
              </ZText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  {
                    backgroundColor: isDark ? '#272336' : palette.gray100,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="A gentle intention or reflection…"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <ZButton
                label="Cancel"
                variant="outline"
                onPress={() => setShowEditProfileModal(false)}
                style={{ flex: 1, marginRight: spacing[2] }}
              />
              <ZButton
                label={isSavingProfile ? 'Saving…' : 'Save Changes'}
                variant="primary"
                isLoading={isSavingProfile}
                onPress={handleSaveProfile}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Export Stats Modal ────────────────────────────────────────────── */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.exportSuccessIcon}>
              <Ionicons name="cloud-done-outline" size={32} color="#059669" />
            </View>

            <ZText variant="headingSmall" color={colors.textPrimary} align="center" style={{ fontWeight: '800' }}>
              Sanctuary Data Ready!
            </ZText>

            <ZText variant="caption" color={colors.textSecondary} align="center" style={{ marginTop: 4, marginBottom: spacing[3] }}>
              Downloaded as {exportStats?.fileName}
            </ZText>

            {exportStats?.counts && (
              <View style={[styles.statsGrid, { backgroundColor: isDark ? '#272336' : palette.gray100 }]}>
                <View style={styles.statCell}>
                  <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                    {exportStats.counts.journals || 0}
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>Journals</ZText>
                </View>
                <View style={styles.statCell}>
                  <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                    {exportStats.counts.tasks || 0}
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>Tasks</ZText>
                </View>
                <View style={styles.statCell}>
                  <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                    {exportStats.counts.habits || 0}
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>Habits</ZText>
                </View>
                <View style={styles.statCell}>
                  <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                    {exportStats.counts.moods || 0}
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>Moods</ZText>
                </View>
                <View style={styles.statCell}>
                  <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                    {exportStats.counts.memories || 0}
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>Memories</ZText>
                </View>
                <View style={styles.statCell}>
                  <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                    {exportStats.counts.reminders || 0}
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>Reminders</ZText>
                </View>
              </View>
            )}

            <View style={{ marginTop: spacing[4] }}>
              <ZButton
                label="Done"
                variant="primary"
                onPress={() => setShowExportModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Account Confirmation Modal ─────────────────────────────── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isDeletingAccount && setShowDeleteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.dangerDialogIcon}>
              <Ionicons name="trash-outline" size={32} color="#dc2626" />
            </View>

            <ZText variant="headingSmall" color="#dc2626" align="center" style={{ fontWeight: '800' }}>
              Permanently Delete Account?
            </ZText>

            <ZText variant="bodyMedium" color={colors.textSecondary} align="center" style={{ marginTop: 8 }}>
              This action is <ZText variant="bodyMedium" color="#dc2626" style={{ fontWeight: '700' }}>IRREVERSIBLE</ZText>.
              All your journals, voice recordings, memories, photos, habits, and tasks will be purged from Supabase and this device.
            </ZText>

            {deleteError && (
              <View style={styles.errorNoticeBox}>
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <ZText variant="caption" color="#dc2626" style={{ marginLeft: 6, flex: 1 }}>
                  {deleteError}
                </ZText>
              </View>
            )}

            <View style={{ marginVertical: spacing[4] }}>
              <ZText variant="label" color={colors.textPrimary} style={{ marginBottom: 4 }}>
                Type <ZText variant="label" color="#dc2626" style={{ fontWeight: '800' }}>DELETE</ZText> to confirm:
              </ZText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#272336' : palette.gray100,
                    borderColor: deleteError ? '#dc2626' : colors.border,
                    color: colors.textPrimary,
                    textAlign: 'center',
                    fontWeight: '700',
                  },
                ]}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                placeholder="DELETE"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalActionsRow}>
              <ZButton
                label="Cancel"
                variant="outline"
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                style={{ flex: 1, marginRight: spacing[2] }}
              />
              <ZButton
                label={isDeletingAccount ? 'Purging Sanctuary…' : 'Delete Everything'}
                variant="danger"
                isLoading={isDeletingAccount}
                disabled={deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                onPress={handleConfirmDeleteAccount}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Sign Out Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.signOutDialogIcon}>
              <Ionicons name="log-out-outline" size={30} color={colors.primary} />
            </View>

            <ZText variant="headingSmall" color={colors.textPrimary} align="center" style={{ fontWeight: '800' }}>
              Sign Out of Zeona?
            </ZText>

            <ZText variant="bodyMedium" color={colors.textSecondary} align="center" style={{ marginTop: 8, marginBottom: spacing[4] }}>
              Your reflections and rituals remain safely preserved in your sanctuary. You can sign back in whenever you are ready.
            </ZText>

            <View style={styles.modalActionsRow}>
              <ZButton
                label="Cancel"
                variant="outline"
                onPress={() => setShowSignOutModal(false)}
                style={{ flex: 1, marginRight: spacing[2] }}
              />
              <ZButton
                label="Sign Out"
                variant="primary"
                onPress={handleSignOut}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Privacy Policy Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.backgroundCard, maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                Privacy & Data Security
              </ZText>
              <Pressable
                onPress={() => setShowPrivacyModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.surfaceOverlay : palette.gray100 }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ marginVertical: spacing[2] }} showsVerticalScrollIndicator={false}>
              <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginBottom: 4 }}>
                1. Zero Ad Trackers & Zero Data Selling
              </ZText>
              <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[3] }}>
                Zeona was built on the fundamental principle that your thoughts and emotional reflections belong strictly to you.
                We do not sell, rent, or monetize your personal diary, audio recordings, or behavioral data.
              </ZText>

              <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginBottom: 4 }}>
                2. Row Level Security & Encryption
              </ZText>
              <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[3] }}>
                All database tables enforce Supabase Row Level Security (RLS). Every query is cryptographically tied to your
                authenticated UID. Media files are stored in private storage buckets accessible solely via short-lived signed URLs.
              </ZText>

              <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginBottom: 4 }}>
                3. Your Right to Export & Erase
              </ZText>
              <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[3] }}>
                You maintain complete sovereign control over your information. At any moment, you can export your data in JSON
                format or execute a permanent cascading account deletion.
              </ZText>
            </ScrollView>

            <View style={{ marginTop: spacing[3] }}>
              <ZButton
                label="Understood"
                variant="primary"
                onPress={() => setShowPrivacyModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Help & Philosophy Modal ───────────────────────────────────────── */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.backgroundCard, maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
                Sanctuary Philosophy
              </ZText>
              <Pressable
                onPress={() => setShowHelpModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.surfaceOverlay : palette.gray100 }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ marginVertical: spacing[2] }} showsVerticalScrollIndicator={false}>
              <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginBottom: 4 }}>
                Gentle, Mindful Wellbeing
              </ZText>
              <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[3] }}>
                Zeona is designed as a peaceful sanctuary for daily reflection, emotional tracking, and sustainable habits.
                We explicitly avoid toxic productivity, shame-inducing streak counters, and clinical diagnoses.
              </ZText>

              <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginBottom: 4 }}>
                Non-Clinical Insights
              </ZText>
              <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[3] }}>
                Zeona provides mindful reflections, not medical diagnoses. If you are experiencing distress, please reach
                out to a qualified healthcare provider or compassionate local crisis line.
              </ZText>

              <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700', marginBottom: 4 }}>
                Need Support?
              </ZText>
              <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[3] }}>
                Our team is always here for your sanctuary experience. Reach us anytime at{' '}
                <ZText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                  support@zeona.app
                </ZText>.
              </ZText>
            </ScrollView>

            <View style={{ marginTop: spacing[3] }}>
              <ZButton
                label="Close"
                variant="primary"
                onPress={() => setShowHelpModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerTitles: {
    flex: 1,
    marginHorizontal: spacing[3],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  responsiveContainer: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },

  // Toast
  toastContainer: {
    marginBottom: spacing[3],
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    ...shadows.md,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },

  // Cards
  card: {
    padding: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 220, 0.7)',
    ...shadows.sm,
  },

  // Theme selector
  themeSelectorRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  themeOptionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radii.lg,
    borderWidth: 1.5,
    position: 'relative',
  },
  themeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCheckPill: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // Setting rows
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextGroup: {
    flex: 1,
    marginRight: spacing[3],
  },
  settingActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },

  // Privacy banner
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Profile summary
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarBubble: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: '100%',
    height: '100%',
  },

  // Danger box
  dangerBox: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing[3],
    backgroundColor: 'rgba(254, 242, 242, 0.5)',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalBox: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    ...shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: spacing[3],
  },
  formLabel: {
    marginBottom: 4,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 14,
    fontFamily: fontFamilies.sans,
    outlineStyle: 'none',
  } as any,
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
  },

  // Export Stats
  exportSuccessIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radii.lg,
    padding: spacing[2],
  },
  statCell: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },

  // Dialog Icons
  dangerDialogIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  signOutDialogIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  errorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: spacing[2],
    borderRadius: radii.md,
    marginTop: spacing[2],
  },
});
