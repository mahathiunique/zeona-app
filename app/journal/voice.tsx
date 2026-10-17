/**
 * Zeona — Voice Diary Recording & Creation Screen
 * Full distraction-free voice journaling experience with real-time audio amplitude metering,
 * pause/resume/stop lifecycle, preview playback, private Supabase Storage upload,
 * and metadata attachment.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ZText, ZCard, ZButton } from '@/components/ui';
import { colors, spacing, radii, shadows } from '@/constants/theme';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { AudioWaveform } from '@/components/audio/AudioWaveform';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { uploadVoiceRecording } from '@/services/audioStorage';
import { useJournalStore } from '@/store/journalStore';
import { useAuthStore } from '@/store/authStore';
import { triggerHaptic } from '@/utils/haptics';
import type { MoodTag } from '@/types';

const MOODS: { tag: MoodTag; emoji: string; label: string; color: string }[] = [
  { tag: 'calm', emoji: '😌', label: 'Calm', color: '#a7f3d0' },
  { tag: 'happy', emoji: '😊', label: 'Happy', color: '#fde68a' },
  { tag: 'grateful', emoji: '✨', label: 'Grateful', color: '#d8b4fe' },
  { tag: 'neutral', emoji: '🌿', label: 'Neutral', color: '#e2e8f0' },
  { tag: 'anxious', emoji: '😟', label: 'Anxious', color: '#fca5a5' },
  { tag: 'sad', emoji: '😢', label: 'Sad', color: '#bfdbfe' },
];

const SUGGESTED_TAGS = ['reflection', 'mindfulness', 'gratitude', 'vent', 'growth', 'evening'];

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function VoiceDiaryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createEntry } = useJournalStore();

  const {
    status,
    elapsedSeconds,
    amplitudeBars,
    audioUri,
    audioBlob,
    durationSeconds,
    errorMessage,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    resetError,
  } = useVoiceRecorder();

  // Form states for preview & save
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const [title, setTitle] = useState(`Voice Reflection • ${todayDateStr}`);
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodTag>('calm');
  const [tags, setTags] = useState<string[]>(['voice', 'reflection']);
  const [customTagInput, setCustomTagInput] = useState('');

  // Modals & Save progress
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isRecordingOrPaused = status === 'recording' || status === 'paused';
  const isPreviewMode = status === 'stopped' && Boolean(audioUri);

  const handleBackPress = () => {
    triggerHaptic();
    if (isRecordingOrPaused || isPreviewMode) {
      setShowDiscardModal(true);
    } else {
      router.back();
    }
  };

  const confirmDiscard = () => {
    setShowDiscardModal(false);
    discardRecording();
    router.back();
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '').toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      triggerHaptic();
      setTags([...tags, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    triggerHaptic();
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSaveVoiceEntry = async () => {
    if (!audioUri || isSaving) return;

    triggerHaptic();
    setIsSaving(true);
    setSaveError(null);

    try {
      const userId = user?.id || 'guest-user';
      // 1. Upload audio to private Supabase Storage bucket
      const uploadResult = await uploadVoiceRecording({
        uri: audioUri,
        blob: audioBlob,
        duration: durationSeconds,
        userId,
      });

      // 2. Create voice journal entry with audio metadata
      const entry = await createEntry({
        title: title.trim() || `Voice Reflection • ${todayDateStr}`,
        content: content.trim(),
        type: 'voice',
        mood: selectedMood,
        tags,
        audio_url: uploadResult.storagePath,
        audio_duration: durationSeconds,
        is_private: true,
      });

      setIsSaving(false);
      if (entry) {
        router.replace({ pathname: '/journal/[id]', params: { id: entry.id } });
      } else {
        router.replace('/(tabs)/journal');
      }
    } catch (err: any) {
      console.warn('[Voice Diary] Save error:', err);
      setIsSaving(false);
      setSaveError('Failed to save voice reflection. Please check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* ── Top Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBackPress}
            hitSlop={12}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <ZText variant="headingMedium" color={colors.textBrand}>
              Voice Diary
            </ZText>
            <ZText variant="caption" color={colors.textTertiary}>
              Private Audio Sanctuary
            </ZText>
          </View>

          <View style={styles.headerRightSpacer}>
            {isRecordingOrPaused && (
              <Pressable
                onPress={() => setShowDiscardModal(true)}
                hitSlop={8}
                style={styles.headerDiscardBtn}
              >
                <ZText variant="caption" color={colors.error} style={{ fontWeight: '600' }}>
                  Discard
                </ZText>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Error Banner if any ────────────────────────────────────── */}
          {errorMessage && (
            <ZCard style={styles.errorCard} elevation="xs">
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <View style={{ flex: 1 }}>
                  <ZText variant="bodySmall" color={colors.error} style={{ fontWeight: '600' }}>
                    Microphone Notice
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>
                    {errorMessage}
                  </ZText>
                </View>
                <Pressable onPress={resetError} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.textTertiary} />
                </Pressable>
              </View>
            </ZCard>
          )}

          {/* ── Recording State / Preview State ────────────────────────── */}
          {!isPreviewMode ? (
            <View style={styles.recorderHeroContainer}>
              {/* Status Pill */}
              <View style={styles.statusPill}>
                {status === 'recording' && <View style={styles.pulsingDot} />}
                <ZText
                  variant="caption"
                  color={status === 'recording' ? colors.accent : colors.primaryDark}
                  style={{ fontWeight: '700' }}
                >
                  {status === 'idle' && 'Ready to record'}
                  {status === 'requesting_permission' && 'Connecting microphone…'}
                  {status === 'recording' && 'Recording your voice…'}
                  {status === 'paused' && 'Recording paused'}
                  {status === 'permission_denied' && 'Permission denied'}
                  {status === 'unsupported' && 'Unsupported browser'}
                </ZText>
              </View>

              {/* Large Timer Display */}
              <ZText variant="displayLarge" color={colors.textPrimary} style={styles.timerText}>
                {formatTimer(elapsedSeconds)}
              </ZText>

              {/* Live Waveform Container */}
              <View style={styles.waveformContainer}>
                <AudioWaveform
                  bars={amplitudeBars}
                  mode="live"
                  maxHeight={52}
                  activeColor={status === 'recording' ? colors.primary : colors.primarySubtle}
                  inactiveColor={colors.primarySubtle}
                />
              </View>

              {/* Action Buttons based on state */}
              <View style={styles.controlsRow}>
                {(status === 'idle' || status === 'permission_denied' || status === 'unsupported') && (
                  <View style={styles.idleActionWrapper}>
                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        startRecording();
                      }}
                      style={({ pressed }) => [
                        styles.recordButtonMain,
                        { transform: [{ scale: pressed ? 0.95 : 1 }] },
                      ]}
                      accessibilityLabel="Start recording voice reflection"
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        style={styles.recordButtonGradient}
                      >
                        <Ionicons name="mic" size={36} color={colors.textInverse} />
                      </LinearGradient>
                    </Pressable>
                    <ZText
                      variant="bodySmall"
                      color={colors.textSecondary}
                      align="center"
                      style={styles.idleHint}
                    >
                      {status === 'permission_denied'
                        ? 'Tap to retry • Make sure microphone permissions are granted in your browser settings.'
                        : status === 'unsupported'
                        ? 'Microphone recording is unavailable in this environment.'
                        : 'Tap to speak freely. Your thoughts and voice are protected in your private sanctuary 🌿'}
                    </ZText>
                  </View>
                )}

                {status === 'recording' && (
                  <View style={styles.activeControlsRow}>
                    {/* Pause button */}
                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        pauseRecording();
                      }}
                      style={styles.secondaryControlBtn}
                      accessibilityLabel="Pause recording"
                    >
                      <Ionicons name="pause" size={22} color={colors.primary} />
                      <ZText variant="caption" color={colors.primaryDark}>
                        Pause
                      </ZText>
                    </Pressable>

                    {/* Stop / Complete button */}
                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        stopRecording();
                      }}
                      style={styles.primaryStopBtn}
                      accessibilityLabel="Stop and review recording"
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        style={styles.stopBtnGradient}
                      >
                        <Ionicons name="stop" size={24} color={colors.textInverse} />
                      </LinearGradient>
                      <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '700' }}>
                        Done
                      </ZText>
                    </Pressable>
                  </View>
                )}

                {status === 'paused' && (
                  <View style={styles.activeControlsRow}>
                    {/* Resume button */}
                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        resumeRecording();
                      }}
                      style={styles.secondaryControlBtn}
                      accessibilityLabel="Resume recording"
                    >
                      <Ionicons name="mic" size={22} color={colors.primary} />
                      <ZText variant="caption" color={colors.primaryDark}>
                        Resume
                      </ZText>
                    </Pressable>

                    {/* Stop / Complete button */}
                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        stopRecording();
                      }}
                      style={styles.primaryStopBtn}
                      accessibilityLabel="Finish recording"
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        style={styles.stopBtnGradient}
                      >
                        <Ionicons name="stop" size={24} color={colors.textInverse} />
                      </LinearGradient>
                      <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '700' }}>
                        Done
                      </ZText>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* ── Preview & Metadata Formulation ─────────────────────── */
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <ZText variant="headingSmall" color={colors.primaryDark}>
                  Preview Your Reflection 🎧
                </ZText>
                <ZText variant="bodySmall" color={colors.textSecondary}>
                  Listen back, tag your mood, and save to your private sanctuary.
                </ZText>
              </View>

              {/* Audio Player Preview */}
              {audioUri && (
                <AudioPlayer
                  audioUrl={audioUri}
                  duration={durationSeconds}
                  title={title}
                  style={styles.previewPlayer}
                />
              )}

              {/* Title Input */}
              <ZCard style={styles.formCard} elevation="xs" radius={radii.xl}>
                <ZText variant="label" color={colors.textPrimary}>
                  Reflection Title
                </ZText>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Evening thoughts under the stars"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={100}
                />

                {/* Mood Tagging */}
                <ZText variant="label" color={colors.textPrimary} style={{ marginTop: spacing[2] }}>
                  How are you feeling?
                </ZText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
                  {MOODS.map((m) => {
                    const isSelected = selectedMood === m.tag;
                    return (
                      <Pressable
                        key={m.tag}
                        onPress={() => {
                          triggerHaptic();
                          setSelectedMood(m.tag);
                        }}
                        style={[
                          styles.moodChip,
                          isSelected && {
                            backgroundColor: m.color,
                            borderColor: colors.primary,
                            borderWidth: 1.5,
                          },
                        ]}
                      >
                        <ZText style={{ fontSize: 16 }}>{m.emoji}</ZText>
                        <ZText
                          variant="caption"
                          color={colors.textPrimary}
                          style={{ fontWeight: isSelected ? '700' : '500' }}
                        >
                          {m.label}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Tags Section */}
                <ZText variant="label" color={colors.textPrimary} style={{ marginTop: spacing[2] }}>
                  Tags
                </ZText>
                <View style={styles.tagsContainer}>
                  {tags.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => handleRemoveTag(t)}
                      style={styles.tagBadge}
                      hitSlop={4}
                    >
                      <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                        #{t}
                      </ZText>
                      <Ionicons name="close-circle" size={14} color={colors.primary} />
                    </Pressable>
                  ))}
                </View>

                {/* Suggested Tags */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedTagsRow}>
                  {SUGGESTED_TAGS.map((st) => (
                    <Pressable
                      key={st}
                      onPress={() => handleAddTag(st)}
                      style={[
                        styles.suggestedChip,
                        tags.includes(st) && styles.suggestedChipActive,
                      ]}
                    >
                      <ZText
                        variant="caption"
                        color={tags.includes(st) ? colors.primary : colors.textTertiary}
                      >
                        +{st}
                      </ZText>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Optional Notes */}
                <ZText variant="label" color={colors.textPrimary} style={{ marginTop: spacing[2] }}>
                  Accompanying Notes (Optional)
                </ZText>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Add notes, key thoughts, or insights about this recording…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                />
              </ZCard>

              {/* Error feedback if save fails */}
              {saveError && (
                <ZText variant="caption" color={colors.error} style={{ textAlign: 'center' }}>
                  {saveError}
                </ZText>
              )}

              {/* Action Buttons */}
              <View style={styles.actionBtnRow}>
                <ZButton
                  variant="primary"
                  size="lg"
                  label={isSaving ? 'Securing Reflection…' : 'Save Voice Diary ✨'}
                  onPress={handleSaveVoiceEntry}
                  disabled={isSaving}
                  style={{ flex: 2 }}
                />

                <ZButton
                  variant="ghost"
                  size="lg"
                  label="Re-record"
                  onPress={() => setShowDiscardModal(true)}
                  disabled={isSaving}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Discard Confirmation Modal ──────────────────────────────── */}
      <Modal
        visible={showDiscardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <ZCard style={styles.modalCard} elevation="md" radius={radii['2xl']}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="trash-outline" size={28} color={colors.error} />
            </View>
            <ZText variant="headingSmall" color={colors.textPrimary} align="center">
              Discard Voice Recording?
            </ZText>
            <ZText variant="bodySmall" color={colors.textSecondary} align="center">
              Are you sure you want to discard this recording? Your recorded thoughts will not be
              saved.
            </ZText>
            <View style={styles.modalBtnRow}>
              <ZButton
                variant="outline"
                size="md"
                label="Keep Recording"
                onPress={() => setShowDiscardModal(false)}
                style={{ flex: 1 }}
              />
              <ZButton
                variant="danger"
                size="md"
                label="Discard"
                onPress={confirmDiscard}
                style={{ flex: 1 }}
              />
            </View>
          </ZCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerRightSpacer: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  headerDiscardBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  scrollArea: { flex: 1 },
  scrollContent: {
    padding: spacing[4],
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: spacing[4],
  },

  errorCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    padding: spacing[3],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },

  recorderHeroContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[4],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 2,
    marginVertical: spacing[2],
  },
  waveformContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing[2],
  },
  controlsRow: {
    marginTop: spacing[4],
    alignItems: 'center',
    width: '100%',
  },
  idleActionWrapper: {
    alignItems: 'center',
    gap: spacing[4],
  },
  recordButtonMain: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.md,
  },
  recordButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idleHint: {
    maxWidth: 320,
    lineHeight: 20,
  },
  activeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  secondaryControlBtn: {
    alignItems: 'center',
    gap: 4,
    padding: spacing[2],
  },
  primaryStopBtn: {
    alignItems: 'center',
    gap: 4,
  },
  stopBtnGradient: {
    width: 68,
    height: 68,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  previewContainer: {
    gap: spacing[4],
  },
  previewHeader: {
    gap: 2,
  },
  previewPlayer: {
    marginBottom: spacing[1],
  },
  formCard: {
    padding: spacing[4],
    gap: spacing[2],
  },
  textInput: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: radii.lg,
    padding: spacing[3],
    fontSize: 15,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 90,
  },
  moodScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.backgroundMuted,
    borderRadius: radii.full,
    marginRight: spacing[2],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  suggestedTagsRow: {
    flexDirection: 'row',
    marginTop: spacing[1],
  },
  suggestedChip: {
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    marginRight: spacing[1.5],
  },
  suggestedChipActive: {
    backgroundColor: colors.primarySubtle,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 20, 35, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  modalIconCircle: {
    width: 54,
    height: 54,
    borderRadius: radii.full,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
    marginTop: spacing[2],
  },
});
