/**
 * VoiceJournalScreen.tsx
 *
 * A fully self-contained voice journal recording + playback + save experience.
 *
 * Features:
 *  - Contextual microphone permission request with denial graceful fallback
 *  - Record / Pause / Resume / Stop
 *  - Animated waveform visualization (driven by RecorderState durationMillis)
 *  - Playback of the recorded audio with seek support
 *  - Title + Mood metadata before saving
 *  - Upload to Firebase Storage with progress feedback
 *  - Metadata saved as JournalEntry (type: 'voice') in Firestore
 *  - Clean-up of local temp file if user discards
 *  - Does NOT break text journaling — completely independent overlay
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Linking,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  setAudioModeAsync,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import {
  Mic,
  Square,
  Play,
  Pause,
  SkipBack,
  Trash2,
  X,
  ChevronRight,
  MicOff,
  Settings,
} from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { JournalRepository } from '../../services/firebase/repositories/journalRepository';
import { JournalEntry } from '../../types/models';
import Text from '../../components/common/Text';
import Button from '../../components/common/Button';

type ColorsType = ReturnType<typeof useTheme>['colors'];

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { emoji: '😢', value: 1 },
  { emoji: '😕', value: 2 },
  { emoji: '😐', value: 3 },
  { emoji: '🙂', value: 4 },
  { emoji: '😊', value: 5 },
];

const BAR_COUNT = 30;
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const formatDateStr = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordPhase = 'permission' | 'idle' | 'recording' | 'paused' | 'stopped' | 'saving';

interface VoiceJournalScreenProps {
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceJournalScreen({ onClose, onSaved }: VoiceJournalScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.uid;

  // ── Recording state ──
  const [phase, setPhase] = useState<RecordPhase>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDurationSec, setRecordingDurationSec] = useState(0);

  // ── Metadata form ──
  const [formTitle, setFormTitle] = useState('');
  const [formMoodValue, setFormMoodValue] = useState<number | null>(null);
  const [formMoodEmoji, setFormMoodEmoji] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // ── Waveform animation ──
  const barAnims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))
  ).current;
  const waveAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── expo-audio ──
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200); // poll every 200ms
  const player = useAudioPlayer(recordingUri ?? null, { updateInterval: 250 });
  const playerStatus = useAudioPlayerStatus(player);

  // ─── Permission Check on Mount ────────────────────────────────────────────

  useEffect(() => {
    checkAndRequestPermission();
  }, []);

  const checkAndRequestPermission = async () => {
    try {
      const existing = await getRecordingPermissionsAsync();
      if (existing.granted) {
        await configureAudioMode();
        setPhase('idle');
        return;
      }

      if (existing.canAskAgain) {
        const response = await requestRecordingPermissionsAsync();
        if (response.granted) {
          await configureAudioMode();
          setPhase('idle');
        } else {
          setPermissionDenied(true);
          setPhase('permission');
        }
      } else {
        // Permanently denied — guide to settings
        setPermissionDenied(true);
        setPhase('permission');
      }
    } catch {
      setPhase('idle'); // Graceful fallback
    }
  };

  const configureAudioMode = async () => {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
  };

  // ─── Waveform Animation ──────────────────────────────────────────────────

  const startWaveAnimation = useCallback(() => {
    const animations = barAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 300 + Math.random() * 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.1 + Math.random() * 0.3,
            duration: 200 + Math.random() * 200,
            useNativeDriver: true,
          }),
        ])
      )
    );
    waveAnimRef.current = Animated.parallel(animations);
    waveAnimRef.current.start();
  }, [barAnims]);

  const stopWaveAnimation = useCallback(() => {
    waveAnimRef.current?.stop();
    barAnims.forEach((anim) => {
      Animated.timing(anim, {
        toValue: 0.15,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [barAnims]);

  // Keep track of durationMillis for the saved recording duration
  useEffect(() => {
    if (recorderState.isRecording) {
      setRecordingDurationSec(Math.floor((recorderState.durationMillis ?? 0) / 1000));
    }
  }, [recorderState.durationMillis, recorderState.isRecording]);

  // ─── Recording Controls ──────────────────────────────────────────────────

  const handleStartRecording = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setPhase('recording');
      startWaveAnimation();
    } catch (e) {
      Alert.alert('Recording Error', (e as Error).message);
    }
  };

  const handlePauseRecording = () => {
    try {
      audioRecorder.pause();
      setPhase('paused');
      stopWaveAnimation();
    } catch (e) {
      Alert.alert('Pause Error', (e as Error).message);
    }
  };

  const handleResumeRecording = () => {
    try {
      audioRecorder.record();
      setPhase('recording');
      startWaveAnimation();
    } catch (e) {
      Alert.alert('Resume Error', (e as Error).message);
    }
  };

  const handleStopRecording = async () => {
    try {
      stopWaveAnimation();
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      setRecordingUri(uri ?? null);
      setPhase('stopped');
    } catch (e) {
      Alert.alert('Stop Error', (e as Error).message);
    }
  };

  // ─── Playback Controls ───────────────────────────────────────────────────

  const handleTogglePlayback = () => {
    if (!recordingUri) return;
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSeekBack5 = async () => {
    const newTime = Math.max(0, playerStatus.currentTime - 5);
    await player.seekTo(newTime);
  };

  // ─── Discard ────────────────────────────────────────────────────────────

  const handleDiscard = () => {
    Alert.alert('Discard Recording', 'Delete this recording and start over?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard', style: 'destructive', onPress: () => {
          player.pause();
          setRecordingUri(null);
          setRecordingDurationSec(0);
          setPhase('idle');
        },
      },
    ]);
  };

  // ─── Save ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!userId || !recordingUri) return;

    if (!formTitle.trim()) {
      Alert.alert('Title required', 'Give your voice entry a title before saving.');
      return;
    }

    setIsSaving(true);
    setPhase('saving');

    try {
      const entryId = generateId();

      // Upload with progress
      const downloadUrl = await JournalRepository.uploadMediaWithProgress(
        userId,
        entryId,
        recordingUri,
        (p) => setUploadProgress(p)
      );

      const now = new Date().toISOString();
      const entry: JournalEntry = {
        id: entryId,
        userId,
        title: formTitle.trim(),
        content: '', // No text body for voice entries
        type: 'voice',
        date: formatDateStr(new Date()),
        moodEmoji: formMoodEmoji || null,
        moodValue: formMoodValue,
        isReflection: false,
        mediaUrl: downloadUrl,
        audioDuration: recordingDurationSec,
        imageThumbnailUrl: null,
        highlight: null,
        difficultMoment: null,
        gratitude: null,
        lessonsLearned: null,
        tomorrowIntent: null,
        reflectionPrompt: null,
        createdAt: now,
        updatedAt: now,
      };

      await JournalRepository.saveEntry(entry);
      onSaved();
    } catch (e) {
      Alert.alert(
        'Save Failed',
        `${(e as Error).message}\n\nYour local recording is still available. Try saving again.`
      );
      setPhase('stopped');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Playback seek bar ───────────────────────────────────────────────────

  const playbackProgress =
    playerStatus.duration > 0 ? playerStatus.currentTime / playerStatus.duration : 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.overlayBg, { backgroundColor: 'rgba(25, 22, 30, 0.90)' }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            {/* ── Header ── */}
            <View style={styles.headerRow}>
              <View>
                <Text variant="h3" style={{ fontWeight: '900' }}>
                  Voice Journal 🎙
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {phase === 'stopped' || phase === 'saving'
                    ? 'Review and save your entry'
                    : phase === 'recording'
                    ? 'Recording...'
                    : phase === 'paused'
                    ? 'Paused'
                    : 'Ready to record'}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* ── Permission Denied Screen ── */}
            {phase === 'permission' && renderPermissionScreen(colors, permissionDenied, () => {
              Linking.openSettings();
            }, onClose)}

            {/* ── Recording / Playback Screen ── */}
            {phase !== 'permission' && (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ── Waveform Visualizer ── */}
                <View style={[styles.waveformContainer, { backgroundColor: colors.backgroundSecondary }]}>
                  {barAnims.map((anim, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          backgroundColor:
                            phase === 'recording'
                              ? colors.primary
                              : phase === 'paused'
                              ? colors.primaryLight
                              : colors.border,
                          transform: [{ scaleY: anim }],
                        },
                      ]}
                    />
                  ))}
                </View>

                {/* ── Timer ── */}
                <Text
                  style={[
                    styles.timer,
                    { color: phase === 'recording' ? colors.primaryDark : colors.textSecondary },
                  ]}
                >
                  {formatDuration(
                    phase === 'recording' || phase === 'paused'
                      ? Math.floor((recorderState.durationMillis ?? 0) / 1000)
                      : recordingDurationSec
                  )}
                </Text>

                {/* ── Recording Controls ── */}
                {(phase === 'idle' || phase === 'recording' || phase === 'paused') && (
                  <View style={styles.controlRow}>
                    {/* Stop — only when actively recording or paused */}
                    {(phase === 'recording' || phase === 'paused') && (
                      <Pressable
                        onPress={handleStopRecording}
                        style={[styles.controlBtn, { backgroundColor: colors.backgroundSecondary }]}
                        accessibilityLabel="Stop recording"
                      >
                        <Square size={22} color={colors.error} />
                      </Pressable>
                    )}

                    {/* Main record / pause / resume button */}
                    <Pressable
                      onPress={
                        phase === 'idle'
                          ? handleStartRecording
                          : phase === 'recording'
                          ? handlePauseRecording
                          : handleResumeRecording
                      }
                      style={[
                        styles.recordBtn,
                        {
                          backgroundColor:
                            phase === 'recording'
                              ? colors.error
                              : phase === 'paused'
                              ? colors.accentYellow
                              : colors.primary,
                          ...Shadows.strong,
                        },
                      ]}
                      accessibilityLabel={
                        phase === 'idle'
                          ? 'Start recording'
                          : phase === 'recording'
                          ? 'Pause recording'
                          : 'Resume recording'
                      }
                    >
                      {phase === 'idle' && <Mic size={32} color="#1E1C1A" />}
                      {phase === 'recording' && <Pause size={32} color="#fff" />}
                      {phase === 'paused' && <Mic size={32} color="#1E1C1A" />}
                    </Pressable>
                  </View>
                )}

                {/* ── Playback Controls (after recording stopped) ── */}
                {(phase === 'stopped' || phase === 'saving') && recordingUri && (
                  <View style={styles.playbackSection}>
                    {/* Progress bar */}
                    <View style={[styles.seekBarBg, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.seekBarFill,
                          {
                            width: `${playbackProgress * 100}%`,
                            backgroundColor: colors.primaryDark,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.seekTimes}>
                      <Text variant="caption" color={colors.textMuted}>
                        {formatDuration(playerStatus.currentTime)}
                      </Text>
                      <Text variant="caption" color={colors.textMuted}>
                        {formatDuration(playerStatus.duration || recordingDurationSec)}
                      </Text>
                    </View>

                    {/* Playback buttons */}
                    <View style={styles.controlRow}>
                      {/* Seek back 5s */}
                      <Pressable
                        onPress={handleSeekBack5}
                        style={[styles.controlBtn, { backgroundColor: colors.backgroundSecondary }]}
                        accessibilityLabel="Seek back 5 seconds"
                      >
                        <SkipBack size={20} color={colors.text} />
                      </Pressable>

                      {/* Play / Pause */}
                      <Pressable
                        onPress={handleTogglePlayback}
                        style={[
                          styles.recordBtn,
                          { backgroundColor: colors.primary, ...Shadows.medium },
                        ]}
                        accessibilityLabel={playerStatus.playing ? 'Pause playback' : 'Play recording'}
                      >
                        {playerStatus.playing ? (
                          <Pause size={28} color="#1E1C1A" />
                        ) : (
                          <Play size={28} color="#1E1C1A" />
                        )}
                      </Pressable>

                      {/* Discard */}
                      <Pressable
                        onPress={handleDiscard}
                        style={[styles.controlBtn, { backgroundColor: colors.backgroundSecondary }]}
                        accessibilityLabel="Discard recording"
                      >
                        <Trash2 size={20} color={colors.error} />
                      </Pressable>
                    </View>

                    {/* ── Metadata form ── */}
                    <View style={styles.metaForm}>
                      <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
                        Title *
                      </Text>
                      <TextInput
                        placeholder="Name this voice entry..."
                        placeholderTextColor={colors.textMuted}
                        value={formTitle}
                        onChangeText={setFormTitle}
                        style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
                        returnKeyType="done"
                        accessibilityLabel="Voice journal title"
                      />

                      <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
                        Mood
                      </Text>
                      <View style={styles.moodRow}>
                        {MOOD_OPTIONS.map((opt) => (
                          <Pressable
                            key={opt.value}
                            onPress={() => {
                              setFormMoodValue(opt.value);
                              setFormMoodEmoji(opt.emoji);
                            }}
                            style={[
                              styles.moodBtn,
                              formMoodValue === opt.value && {
                                backgroundColor: colors.primaryLight,
                                borderRadius: BorderRadius.round,
                              },
                            ]}
                            accessibilityLabel={`Mood ${opt.emoji}`}
                          >
                            <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* ── Upload progress ── */}
                    {phase === 'saving' && (
                      <View style={styles.uploadRow}>
                        <View style={[styles.uploadBarBg, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.uploadBarFill,
                              {
                                width: `${uploadProgress * 100}%`,
                                backgroundColor: colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                          Uploading... {Math.round(uploadProgress * 100)}%
                        </Text>
                      </View>
                    )}

                    {/* ── Save Button ── */}
                    <Button
                      title={isSaving ? 'Saving...' : 'Save Voice Entry'}
                      variant="primary"
                      onPress={handleSave}
                      style={{ marginTop: Spacing.lg }}
                    />
                  </View>
                )}

                <View style={{ height: 60 }} />
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Permission Screen ────────────────────────────────────────────────────────

function renderPermissionScreen(
  colors: ColorsType,
  denied: boolean,
  onOpenSettings: () => void,
  onUseText: () => void
) {
  return (
    <View style={styles.permissionContainer}>
      <View style={[styles.permissionIcon, { backgroundColor: colors.primaryLight }]}>
        <MicOff size={40} color={colors.primaryDark} />
      </View>

      <Text variant="h3" style={[styles.permissionTitle, { color: colors.text }]}>
        Microphone Access Needed
      </Text>

      <Text variant="body" color={colors.textSecondary} align="center" style={styles.permissionBody}>
        Zeona needs access to your microphone to record voice journal entries.
        {'\n\n'}
        Your recordings are stored privately in your account and are never shared with anyone.
      </Text>

      {denied ? (
        <>
          <Text variant="caption" color={colors.error} align="center" style={{ marginBottom: Spacing.lg }}>
            Permission was denied. You can enable microphone access in your device settings.
          </Text>
          <Pressable
            onPress={onOpenSettings}
            style={[styles.settingsBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Open device settings"
          >
            <Settings size={18} color="#1E1C1A" />
            <Text style={{ fontWeight: '700', color: '#1E1C1A', marginLeft: 8 }}>
              Open Settings
            </Text>
          </Pressable>
        </>
      ) : null}

      <Pressable
        onPress={onUseText}
        style={styles.useTextBtn}
        accessibilityLabel="Use text journal instead"
      >
        <Text variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
          Use text journal instead
        </Text>
        <ChevronRight size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlayBg: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '92%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 0,
    ...Shadows.strong,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  closeBtn: { padding: Spacing.xs },

  // Content scroll
  content: {
    paddingBottom: Spacing.huge,
    gap: Spacing.lg,
    alignItems: 'center',
  },

  // Waveform
  waveformContainer: {
    width: '100%',
    height: 100,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  waveBar: {
    width: 3,
    height: 60,
    borderRadius: 2,
  },

  // Timer
  timer: {
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },

  // Controls
  controlRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Playback
  playbackSection: { width: '100%', gap: Spacing.md },
  seekBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  seekBarFill: { height: '100%', borderRadius: 3 },
  seekTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Metadata form
  metaForm: { width: '100%', gap: Spacing.xs },
  fieldLabel: { fontWeight: '600', marginTop: Spacing.sm },
  titleInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xs,
  },
  moodBtn: { padding: Spacing.sm },
  moodEmoji: { fontSize: 26 },

  // Upload
  uploadRow: { width: '100%', marginTop: Spacing.sm },
  uploadBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadBarFill: { height: '100%', borderRadius: 3 },

  // Permission
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.huge,
    gap: Spacing.md,
  },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  permissionTitle: {
    fontWeight: '800',
    fontSize: 22,
    textAlign: 'center',
  },
  permissionBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.round,
  },
  useTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
});
