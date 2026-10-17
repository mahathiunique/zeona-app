/**
 * journal.tsx — Zeona Journal
 *
 * Single-file implementation of the complete journal experience:
 *  - Three tabs: Entries | Memories | Mood
 *  - Header with streak + entry count
 *  - Quick mood check-in row
 *  - Client-side search on loaded entries (honest about Firestore limitations)
 *  - Editor overlay (text / voice / reflection) with AsyncStorage draft save
 *  - Detail overlay for reading an entry beautifully
 *  - Guided 5-step Reflection flow
 *  - Memories 2-column image grid
 *  - Mood tab with 30-day history dots + distribution bar
 *  - Image picker + upload with progress bar
 *  - Voice journal recording overlay (expo-audio)
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search,
  Mic,
  BookOpen,
  Plus,
  X,
  Trash2,
  Edit3,
  Flame,
  ChevronRight,
  ChevronLeft,
  Moon,
} from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/theme';
import { JournalRepository } from '../../services/firebase/repositories/journalRepository';
import { MoodRepository } from '../../services/firebase/repositories/moodRepository';
import { JournalEntry, JournalEntryType, Mood } from '../../types/models';

type ColorsType = ReturnType<typeof useTheme>['colors'];

import Text from '../../components/common/Text';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import VoiceJournalScreen from '../../components/journal/VoiceJournalScreen';

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAFT_STORAGE_KEY = '@zeona/journal_draft';
const ENTRIES_PAGE_SIZE = 50;

const MOOD_OPTIONS: { emoji: string; label: string; value: number }[] = [
  { emoji: '😢', label: 'Rough', value: 1 },
  { emoji: '😕', label: 'Low', value: 2 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😊', label: 'Great', value: 5 },
];

const REFLECTION_STEPS = [
  { key: 'today', question: '☀️ How was today?', field: 'content' as const },
  { key: 'smile', question: '😊 What made you smile?', field: 'highlight' as const },
  { key: 'difficult', question: '🌧 What was difficult?', field: 'difficultMoment' as const },
  { key: 'grateful', question: '🙏 What are you grateful for?', field: 'gratitude' as const },
  { key: 'tomorrow', question: '🌙 What do you want tomorrow to feel like?', field: 'tomorrowIntent' as const },
];

type JournalTab = 'entries' | 'memories' | 'mood';
type OverlayType = 'none' | 'editor' | 'detail' | 'reflection' | 'voice';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatDateStr = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDisplayTime = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getEntryTypeLabel = (type: JournalEntryType) => {
  switch (type) {
    case 'text': return 'Written';
    case 'voice': return 'Voice';
    case 'reflection': return 'Reflection';
  }
};

const getEntryTypeColor = (type: JournalEntryType, colors: ColorsType) => {
  switch (type) {
    case 'text': return colors.primaryLight;
    case 'voice': return colors.secondaryLight;
    case 'reflection': return colors.accentPurple;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JournalScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { openVoice } = useLocalSearchParams<{ openVoice?: string }>();
  const userId = user?.uid;
  const todayStr = formatDateStr(new Date());

  // ── Data State ──
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<JournalEntry[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [journalStreak, setJournalStreak] = useState(0);
  const [todayMood, setTodayMood] = useState<Mood | null>(null);

  // ── UI State ──
  const [activeTab, setActiveTab] = useState<JournalTab>('entries');
  const [overlay, setOverlay] = useState<OverlayType>('none');
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Detail / Edit State ──
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null); // non-null = editing existing

  // ── Editor Form State ──
  const [editorType, setEditorType] = useState<JournalEntryType>('text');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formMoodEmoji, setFormMoodEmoji] = useState('');
  const [formMoodValue, setFormMoodValue] = useState<number | null>(null);
  const [formHighlight, setFormHighlight] = useState('');
  const [formDifficult, setFormDifficult] = useState('');
  const [formGratitude, setFormGratitude] = useState('');
  const [formLessons, setFormLessons] = useState('');
  const [formTomorrow, setFormTomorrow] = useState('');
  const [formMediaUri, setFormMediaUri] = useState<string | null>(null);
  const [formMediaUrl, setFormMediaUrl] = useState<string | null>(null);

  // ── Reflection Wizard State ──
  const [reflectionStep, setReflectionStep] = useState(0);
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});

  // ── Draft debounce ref ──
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load Data ──────────────────────────────────────────────────────────────

  const fetchJournalData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      setLoading(true);
      const [fetchedEntries, fetchedMemories, fetchedMoods, totalCount] = await Promise.all([
        JournalRepository.getEntries(userId, undefined, ENTRIES_PAGE_SIZE),
        JournalRepository.getEntriesWithImages(userId),
        MoodRepository.getMoods(userId, formatDateStr(new Date(Date.now() - 29 * 86400000)), todayStr),
        JournalRepository.getTotalCount(userId),
      ]);

      setEntries(fetchedEntries);
      setMemoryEntries(fetchedMemories);
      setMoods(fetchedMoods);
      setTotalEntries(totalCount);

      // Compute today mood
      const today = fetchedMoods.find((m) => m.date === todayStr) ?? null;
      setTodayMood(today);

      // Compute streak from unique dates in fetched entries
      setJournalStreak(computeStreak(fetchedEntries));
    } catch (e) {
      Alert.alert('Load Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId, todayStr]);

  useEffect(() => {
    const t = setTimeout(() => { fetchJournalData(); }, 0);
    return () => clearTimeout(t);
  }, [fetchJournalData]);

  // Auto-open voice overlay when navigated from Create modal
  useEffect(() => {
    if (openVoice === '1') {
      setOverlay('voice');
    }
  }, [openVoice]);

  // ─── Streak calculation ──────────────────────────────────────────────────────

  const computeStreak = (allEntries: JournalEntry[]) => {
    const dates = [...new Set(allEntries.map((e) => e.date))].sort((a, b) => b.localeCompare(a));
    if (dates.length === 0) return 0;

    let streak = 0;
    let cursor = formatDateStr(new Date()); // start from today
    for (const d of dates) {
      if (d === cursor) {
        streak++;
        const prev = new Date(`${cursor}T00:00:00`);
        prev.setDate(prev.getDate() - 1);
        cursor = formatDateStr(prev);
      } else {
        break;
      }
    }
    return streak;
  };

  // ─── Draft Persistence ───────────────────────────────────────────────────────

  const saveDraft = useCallback(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(async () => {
      try {
        const draft = { formTitle, formContent, formHighlight, formDifficult, formGratitude, formLessons, formTomorrow, editorType };
        await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (_) { /* silent fail */ }
    }, 800);
  }, [formTitle, formContent, formHighlight, formDifficult, formGratitude, formLessons, formTomorrow, editorType]);

  const restoreDraft = async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        setFormTitle(draft.formTitle || '');
        setFormContent(draft.formContent || '');
        setFormHighlight(draft.formHighlight || '');
        setFormDifficult(draft.formDifficult || '');
        setFormGratitude(draft.formGratitude || '');
        setFormLessons(draft.formLessons || '');
        setFormTomorrow(draft.formTomorrow || '');
        if (draft.editorType) setEditorType(draft.editorType);
        return true;
      }
    } catch (_) { /* silent */ }
    return false;
  };

  const clearDraft = async () => {
    try { await AsyncStorage.removeItem(DRAFT_STORAGE_KEY); } catch (_) { /* silent */ }
  };

  // Auto-save draft when form content changes
  useEffect(() => {
    if (overlay === 'editor') saveDraft();
  }, [formTitle, formContent, formHighlight, formDifficult, formGratitude, formLessons, formTomorrow, overlay, saveDraft]);

  // ─── Editor Open/Close ───────────────────────────────────────────────────────

  const openNewEditor = async (type: JournalEntryType = 'text') => {
    resetEditorForm();
    setEditorType(type);
    setEditEntry(null);
    const hasDraft = await restoreDraft();
    if (hasDraft) {
      Alert.alert('Draft Restored', 'We found an unsaved draft and restored it.', [
        { text: 'Discard', style: 'destructive', onPress: () => { clearDraft(); resetEditorForm(); } },
        { text: 'Keep', style: 'default' },
      ]);
    }
    setOverlay('editor');
  };

  const openEditEditor = (entry: JournalEntry) => {
    setEditorType(entry.type);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormMoodEmoji(entry.moodEmoji ?? '');
    setFormMoodValue(entry.moodValue ?? null);
    setFormHighlight(entry.highlight ?? '');
    setFormDifficult(entry.difficultMoment ?? '');
    setFormGratitude(entry.gratitude ?? '');
    setFormLessons(entry.lessonsLearned ?? '');
    setFormTomorrow(entry.tomorrowIntent ?? '');
    setFormMediaUrl(entry.mediaUrl ?? null);
    setFormMediaUri(null);
    setEditEntry(entry);
    setOverlay('editor');
  };

  const closeEditor = () => {
    setOverlay('none');
    setEditEntry(null);
  };

  const resetEditorForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormMoodEmoji('');
    setFormMoodValue(null);
    setFormHighlight('');
    setFormDifficult('');
    setFormGratitude('');
    setFormLessons('');
    setFormTomorrow('');
    setFormMediaUri(null);
    setFormMediaUrl(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  // ─── Save Entry ──────────────────────────────────────────────────────────────

  const handleSaveEntry = async () => {
    if (!userId) return;
    if (!formTitle.trim()) { Alert.alert('Title required', 'Please give this entry a title.'); return; }

    setIsSaving(true);
    try {
      let mediaUrl = formMediaUrl;

      // Upload newly picked image if present
      if (formMediaUri && !formMediaUrl) {
        setIsUploading(true);
        const entryId = editEntry?.id ?? generateId();
        mediaUrl = await JournalRepository.uploadMediaWithProgress(
          userId, entryId, formMediaUri, (p) => setUploadProgress(p)
        );
        setIsUploading(false);
      }

      const now = new Date().toISOString();
      const entryId = editEntry?.id ?? generateId();

      const entry: JournalEntry = {
        id: entryId,
        userId,
        title: formTitle.trim(),
        content: formContent.trim(),
        type: editorType,
        date: editEntry?.date ?? todayStr,
        moodEmoji: formMoodEmoji || null,
        moodValue: formMoodValue,
        highlight: formHighlight.trim() || null,
        difficultMoment: formDifficult.trim() || null,
        gratitude: formGratitude.trim() || null,
        lessonsLearned: formLessons.trim() || null,
        tomorrowIntent: formTomorrow.trim() || null,
        isReflection: editorType === 'reflection',
        mediaUrl: mediaUrl ?? null,
        audioDuration: null,
        imageThumbnailUrl: mediaUrl ?? null, // simplified — same URL as thumb for now
        reflectionPrompt: null,
        createdAt: editEntry?.createdAt ?? now,
        updatedAt: now,
      };

      await JournalRepository.saveEntry(entry);
      await clearDraft();
      closeEditor();
      fetchJournalData();
    } catch (e) {
      Alert.alert('Save Failed', (e as Error).message);
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  // ─── Delete Entry ────────────────────────────────────────────────────────────

  const handleDeleteEntry = (entryId: string) => {
    if (!userId) return;
    Alert.alert('Delete Entry', 'This will permanently delete this journal entry.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await JournalRepository.deleteEntry(userId, entryId);
            setDetailEntry(null);
            setOverlay('none');
            fetchJournalData();
          } catch (e) {
            Alert.alert('Delete Failed', (e as Error).message);
          }
        },
      },
    ]);
  };

  // ─── Mood Check-in ───────────────────────────────────────────────────────────

  const handleMoodSelect = async (option: { emoji: string; value: number; label: string }) => {
    if (!userId) return;
    const moodRecord: Mood = {
      id: `${userId}_${todayStr}`,
      userId,
      value: option.value,
      note: '',
      date: todayStr,
      timeOfDay: 'evening',
      createdAt: todayMood?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await MoodRepository.saveMood(moodRecord);
      setTodayMood(moodRecord);
    } catch (e) {
      Alert.alert('Mood Save Error', (e as Error).message);
    }
  };

  // ─── Reflection Wizard ───────────────────────────────────────────────────────

  const openReflection = () => {
    resetEditorForm();
    setEditorType('reflection');
    setEditEntry(null);
    setReflectionStep(0);
    setReflectionAnswers({});
    setOverlay('reflection');
  };

  const handleReflectionNext = () => {
    if (reflectionStep < REFLECTION_STEPS.length - 1) {
      setReflectionStep((s) => s + 1);
    } else {
      // Final step — save
      handleSaveReflection();
    }
  };

  const handleSaveReflection = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const id = generateId();
      const entry: JournalEntry = {
        id,
        userId,
        title: `Night Reflection · ${formatDisplayDate(todayStr)}`,
        content: reflectionAnswers['content'] ?? '',
        type: 'reflection',
        date: todayStr,
        highlight: reflectionAnswers['highlight'] ?? null,
        difficultMoment: reflectionAnswers['difficultMoment'] ?? null,
        gratitude: reflectionAnswers['gratitude'] ?? null,
        tomorrowIntent: reflectionAnswers['tomorrowIntent'] ?? null,
        lessonsLearned: null,
        isReflection: true,
        moodEmoji: null,
        moodValue: null,
        mediaUrl: null,
        audioDuration: null,
        imageThumbnailUrl: null,
        reflectionPrompt: null,
        createdAt: now,
        updatedAt: now,
      };
      await JournalRepository.saveEntry(entry);
      setOverlay('none');
      fetchJournalData();
      Alert.alert('🌙 Reflection Saved', 'Sleep well. Tomorrow is a new page.');
    } catch (e) {
      Alert.alert('Save Failed', (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Client-side Search ──────────────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.date.includes(q)
    );
  }, [entries, searchQuery]);

  // ─── Mood Tab Data ───────────────────────────────────────────────────────────

  const moodDistribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    moods.forEach((m) => { if (m.value >= 1 && m.value <= 5) dist[m.value]++; });
    return dist;
  }, [moods]);

  const maxMoodCount = useMemo(() => Math.max(...Object.values(moodDistribution), 1), [moodDistribution]);

  // ─── Renderers ───────────────────────────────────────────────────────────────

  // --- Header ---
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.headerTop}>
        <View>
          <Text variant="h2">My Journal 🌸</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {formatDisplayDate(todayStr)}
          </Text>
        </View>
        <View style={styles.headerStats}>
          <View style={[styles.statChip, { backgroundColor: colors.accentYellow }]}>
            <Flame size={13} color="#5C4A00" />
            <Text variant="caption" style={{ color: '#5C4A00', fontWeight: '700' }}>
              {journalStreak} day{journalStreak !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.primaryLight }]}>
            <BookOpen size={13} color={colors.primaryDark} />
            <Text variant="caption" style={{ color: colors.primaryDark, fontWeight: '700' }}>
              {totalEntries}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Mood Row */}
      <View style={[styles.moodRow, { backgroundColor: colors.backgroundSecondary }]}>
        <Text variant="caption" color={colors.textSecondary} style={{ fontWeight: '600' }}>
          How was today?
        </Text>
        <View style={styles.moodEmojis}>
          {MOOD_OPTIONS.map((opt) => {
            const isSelected = todayMood?.value === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleMoodSelect(opt)}
                style={[
                  styles.moodBtn,
                  isSelected && { backgroundColor: colors.primaryLight, borderRadius: BorderRadius.round },
                ]}
              >
                <Text style={[styles.moodEmoji, isSelected && { transform: [{ scale: 1.25 }] }]}>
                  {opt.emoji}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  // --- Tab row ---
  const renderTabRow = () => (
    <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
      {(['entries', 'memories', 'mood'] as JournalTab[]).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabBtn}>
            <Text
              variant="caption"
              style={[
                styles.tabLabel,
                { color: isActive ? colors.primaryDark : colors.textSecondary },
              ]}
            >
              {tab === 'entries' ? '📓 Entries' : tab === 'memories' ? '🖼 Memories' : '📊 Mood'}
            </Text>
            {isActive && <View style={[styles.tabIndicator, { backgroundColor: colors.primaryDark }]} />}
          </Pressable>
        );
      })}
    </View>
  );

  // --- Entries Tab ---
  const renderEntriesTab = () => (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          placeholder="Search recent entries..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text }]}
          accessibilityLabel="Search journal entries"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={14} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {searchQuery.length > 0 && (
        <Text variant="caption" color={colors.textMuted} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs }}>
          Searching last {ENTRIES_PAGE_SIZE} entries — Firestore doesn't support full-text search
        </Text>
      )}

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.huge }} />
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📓</Text>
            <Text variant="subtitle" style={{ fontWeight: '700', marginBottom: Spacing.sm }}>
              {searchQuery ? 'No matching entries' : 'Your journal is empty'}
            </Text>
            <Text variant="bodySecondary" color={colors.textSecondary} align="center">
              {searchQuery
                ? 'Try a different search term'
                : 'Tap + New Entry to write your first entry'}
            </Text>
          </View>
        ) : (
          filteredEntries.map((entry) => renderEntryCard(entry))
        )}
      </ScrollView>
    </View>
  );

  // --- Entry Card ---
  const renderEntryCard = (entry: JournalEntry) => {
    const typeColor = getEntryTypeColor(entry.type, colors);
    const typeLabel = getEntryTypeLabel(entry.type);

    return (
      <Pressable
        key={entry.id}
        onPress={() => { setDetailEntry(entry); setOverlay('detail'); }}
      >
        <Card variant="elevated" style={styles.entryCard}>
          {/* Top row: date + mood */}
          <View style={styles.cardTopRow}>
            <Text variant="caption" color={colors.textMuted}>
              {formatDisplayDate(entry.date)} · {formatDisplayTime(entry.createdAt)}
            </Text>
            {entry.moodEmoji ? (
              <Text style={{ fontSize: 16 }}>{entry.moodEmoji}</Text>
            ) : null}
          </View>

          {/* Title */}
          <Text variant="subtitle" style={styles.cardTitle} numberOfLines={1}>
            {entry.title}
          </Text>

          {/* Preview */}
          {entry.content ? (
            <Text variant="bodySecondary" color={colors.textSecondary} numberOfLines={2} style={styles.cardPreview}>
              {entry.content}
            </Text>
          ) : null}

          {/* Thumbnail if present */}
          {entry.imageThumbnailUrl ? (
            <Image
              source={{ uri: entry.imageThumbnailUrl }}
              style={styles.cardThumbnail}
              resizeMode="cover"
              accessibilityLabel="Journal entry image"
            />
          ) : null}

          {/* Footer: type tag */}
          <View style={styles.cardFooter}>
            <View style={[styles.typeTag, { backgroundColor: typeColor }]}>
              <Text variant="caption" style={{ fontWeight: '600' }}>
                {typeLabel}
              </Text>
            </View>
            {entry.isReflection && (
              <View style={[styles.typeTag, { backgroundColor: colors.accentYellow }]}>
                <Moon size={10} color="#5C4A00" />
                <Text variant="caption" style={{ color: '#5C4A00', fontWeight: '600', marginLeft: 3 }}>
                  Night Reflection
                </Text>
              </View>
            )}
            <ChevronRight size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>
        </Card>
      </Pressable>
    );
  };

  // --- Memories Tab ---
  const renderMemoriesTab = () => (
    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.huge }} />
      ) : memoryEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🖼</Text>
          <Text variant="subtitle" style={{ fontWeight: '700', marginBottom: Spacing.sm }}>
            No Memories Yet
          </Text>
          <Text variant="bodySecondary" color={colors.textSecondary} align="center">
            Add photos to your journal entries to create memories
          </Text>
        </View>
      ) : (
        <View style={styles.memoriesGrid}>
          {memoryEntries.map((entry) => (
            <Pressable
              key={entry.id}
              style={styles.memoryCell}
              onPress={() => { setDetailEntry(entry); setOverlay('detail'); }}
            >
              <Image
                source={{ uri: entry.mediaUrl! }}
                style={styles.memoryImage}
                resizeMode="cover"
                accessibilityLabel={entry.title}
              />
              <View style={styles.memoryOverlay}>
                <Text variant="caption" style={styles.memoryTitle} numberOfLines={1}>
                  {entry.title}
                </Text>
                <Text variant="caption" style={styles.memoryDate}>
                  {entry.date}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );

  // --- Mood Tab ---
  const renderMoodTab = () => {
    // Build last-30-day dot timeline
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000);
      const dateStr = formatDateStr(d);
      const mood = moods.find((m) => m.date === dateStr);
      return { dateStr, mood };
    });

    const dotColor = (value: number) => {
      const map: Record<number, string> = {
        1: '#E57373', 2: '#FFB74D', 3: '#FFF176', 4: '#AED581', 5: '#4DB6AC',
      };
      return map[value] ?? colors.border;
    };

    return (
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {/* Streak + today mood pill */}
        <Card variant="elevated" style={styles.moodSummaryCard}>
          <Text variant="subtitle" style={{ fontWeight: '800', marginBottom: Spacing.sm }}>
            📊 30-Day Mood History
          </Text>
          <View style={styles.moodTimeline}>
            {last30.map(({ dateStr, mood }) => (
              <View
                key={dateStr}
                style={[
                  styles.moodDot,
                  { backgroundColor: mood ? dotColor(mood.value) : colors.border },
                ]}
              />
            ))}
          </View>
          <View style={styles.moodLegend}>
            <Text variant="caption" color={colors.textMuted}>30 days ago</Text>
            <Text variant="caption" color={colors.textMuted}>Today</Text>
          </View>
        </Card>

        {/* Distribution bars */}
        <Card variant="elevated" style={styles.distributionCard}>
          <Text variant="subtitle" style={{ fontWeight: '800', marginBottom: Spacing.md }}>
            Mood Distribution
          </Text>
          {MOOD_OPTIONS.slice().reverse().map((opt) => {
            const count = moodDistribution[opt.value] ?? 0;
            const widthPct = maxMoodCount > 0 ? (count / maxMoodCount) * 100 : 0;
            return (
              <View key={opt.value} style={styles.distRow}>
                <Text style={styles.distEmoji}>{opt.emoji}</Text>
                <View style={styles.distBarBg}>
                  <View
                    style={[
                      styles.distBarFill,
                      { width: `${widthPct}%`, backgroundColor: dotColor(opt.value) },
                    ]}
                  />
                </View>
                <Text variant="caption" color={colors.textSecondary} style={{ minWidth: 20, textAlign: 'right' }}>
                  {count}
                </Text>
              </View>
            );
          })}
        </Card>

        {/* Recent moods list */}
        {moods.length > 0 && (
          <View>
            <Text variant="subtitle" style={{ fontWeight: '800', marginBottom: Spacing.md }}>
              Recent Check-ins
            </Text>
            {moods.slice(0, 10).map((m) => (
              <Card key={m.id} variant="outlined" style={styles.moodHistoryCard}>
                <View style={styles.moodHistoryRow}>
                  <Text style={{ fontSize: 22 }}>
                    {MOOD_OPTIONS.find((o) => o.value === m.value)?.emoji ?? '😐'}
                  </Text>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text variant="caption" style={{ fontWeight: '700' }}>
                      {MOOD_OPTIONS.find((o) => o.value === m.value)?.label ?? 'Okay'}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>{formatDisplayDate(m.date)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // --- Editor Overlay ---
  const renderEditorOverlay = () => (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.overlayBg, { backgroundColor: colors.overlay }]}>
        <View style={[styles.overlaySheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.overlayHeader}>
            <Text variant="subtitle" style={{ fontWeight: '800' }}>
              {editEntry ? 'Edit Entry' : 'New Entry'} {editorType === 'voice' ? '🎤' : editorType === 'reflection' ? '🌙' : '✍️'}
            </Text>
            <Pressable onPress={closeEditor} style={styles.overlayClose}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Type Selector */}
          {!editEntry && (
            <View style={styles.typeRow}>
              {(['text', 'voice', 'reflection'] as JournalEntryType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setEditorType(t)}
                  style={[
                    styles.typePill,
                    editorType === t && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                    { borderColor: colors.border },
                  ]}
                >
                  <Text variant="caption" style={{ fontWeight: '700', textTransform: 'capitalize' }}>
                    {t === 'text' ? '✍️ Written' : t === 'voice' ? '🎤 Voice' : '🌙 Reflection'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <ScrollView style={styles.overlayScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Input label="Title *" placeholder="Give this moment a name..." value={formTitle} onChangeText={setFormTitle} />

            {/* Mood picker */}
            <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>Mood</Text>
            <View style={styles.editorMoodRow}>
              {MOOD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => { setFormMoodEmoji(opt.emoji); setFormMoodValue(opt.value); }}
                  style={[
                    styles.editorMoodBtn,
                    formMoodValue === opt.value && {
                      backgroundColor: colors.primaryLight,
                      borderRadius: BorderRadius.round,
                    },
                  ]}
                >
                  <Text style={styles.editorMoodEmoji}>{opt.emoji}</Text>
                </Pressable>
              ))}
            </View>

            {/* Main body */}
            <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>
              {editorType === 'voice' ? 'Notes (optional)' : 'Journal Entry'}
            </Text>
            <TextInput
              placeholder={editorType === 'voice' ? 'Add notes about your voice recording...' : "What's on your mind today?"}
              placeholderTextColor={colors.textMuted}
              value={formContent}
              onChangeText={setFormContent}
              multiline
              style={[styles.bodyInput, { color: colors.text, borderColor: colors.border }]}
              textAlignVertical="top"
            />

            {/* Reflection prompts */}
            <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>✨ Highlight of the day</Text>
            <TextInput
              placeholder="Something that made you smile..."
              placeholderTextColor={colors.textMuted}
              value={formHighlight}
              onChangeText={setFormHighlight}
              multiline
              style={[styles.promptInput, { color: colors.text, borderColor: colors.border }]}
              textAlignVertical="top"
            />

            <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>🌧 Difficult moment</Text>
            <TextInput
              placeholder="Something that was hard..."
              placeholderTextColor={colors.textMuted}
              value={formDifficult}
              onChangeText={setFormDifficult}
              multiline
              style={[styles.promptInput, { color: colors.text, borderColor: colors.border }]}
              textAlignVertical="top"
            />

            <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>🙏 Gratitude</Text>
            <TextInput
              placeholder="I'm grateful for..."
              placeholderTextColor={colors.textMuted}
              value={formGratitude}
              onChangeText={setFormGratitude}
              multiline
              style={[styles.promptInput, { color: colors.text, borderColor: colors.border }]}
              textAlignVertical="top"
            />

            <Text variant="caption" color={colors.textSecondary} style={styles.fieldLabel}>💡 Lessons learned</Text>
            <TextInput
              placeholder="What did today teach you?"
              placeholderTextColor={colors.textMuted}
              value={formLessons}
              onChangeText={setFormLessons}
              multiline
              style={[styles.promptInput, { color: colors.text, borderColor: colors.border }]}
              textAlignVertical="top"
            />

            {/* Upload progress */}
            {isUploading && (
              <View style={styles.uploadRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: Spacing.sm }}>
                  Uploading image... {Math.round(uploadProgress * 100)}%
                </Text>
              </View>
            )}

            {/* Image preview */}
            {(formMediaUri || formMediaUrl) && (
              <View style={styles.imagePreviewRow}>
                <Image
                  source={{ uri: formMediaUri ?? formMediaUrl! }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => { setFormMediaUri(null); setFormMediaUrl(null); }}
                  style={styles.imageRemoveBtn}
                >
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
            )}

            <View style={styles.editorActions}>
              <Button
                title={isSaving ? 'Saving...' : 'Save Entry'}
                variant="primary"
                onPress={handleSaveEntry}
                style={{ flex: 1 }}
              />
              {editEntry && (
                <Pressable
                  onPress={() => handleDeleteEntry(editEntry.id)}
                  style={[styles.deleteBtn, { borderColor: colors.error }]}
                >
                  <Trash2 size={18} color={colors.error} />
                </Pressable>
              )}
            </View>
            <View style={{ height: Spacing.huge }} />
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  // --- Detail Overlay ---
  const renderDetailOverlay = () => {
    if (!detailEntry) return null;
    return (
      <View style={[styles.overlayBg, { backgroundColor: colors.overlay }]}>
        <View style={[styles.overlaySheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.overlayHeader}>
            <Text variant="caption" color={colors.textSecondary}>
              {formatDisplayDate(detailEntry.date)} · {formatDisplayTime(detailEntry.createdAt)}
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <Pressable
                onPress={() => { setDetailEntry(null); setOverlay('none'); openEditEditor(detailEntry); }}
                style={styles.overlayAction}
              >
                <Edit3 size={18} color={colors.primaryDark} />
              </Pressable>
              <Pressable onPress={() => handleDeleteEntry(detailEntry.id)} style={styles.overlayAction}>
                <Trash2 size={18} color={colors.error} />
              </Pressable>
              <Pressable onPress={() => { setDetailEntry(null); setOverlay('none'); }} style={styles.overlayClose}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.overlayScroll} showsVerticalScrollIndicator={false}>
            {/* Mood + type */}
            <View style={styles.detailMeta}>
              {detailEntry.moodEmoji && <Text style={styles.detailMoodEmoji}>{detailEntry.moodEmoji}</Text>}
              <View style={[styles.typeTag, { backgroundColor: getEntryTypeColor(detailEntry.type, colors) }]}>
                <Text variant="caption" style={{ fontWeight: '700' }}>{getEntryTypeLabel(detailEntry.type)}</Text>
              </View>
              {detailEntry.isReflection && (
                <View style={[styles.typeTag, { backgroundColor: colors.accentYellow }]}>
                  <Moon size={11} color="#5C4A00" />
                  <Text variant="caption" style={{ color: '#5C4A00', fontWeight: '700', marginLeft: 3 }}>
                    Night Reflection
                  </Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text variant="h3" style={styles.detailTitle}>{detailEntry.title}</Text>

            {/* Main content */}
            {detailEntry.content ? (
              <Text variant="body" color={colors.text} style={styles.detailSection}>
                {detailEntry.content}
              </Text>
            ) : null}

            {/* Image */}
            {detailEntry.mediaUrl ? (
              <Image
                source={{ uri: detailEntry.mediaUrl }}
                style={styles.detailImage}
                resizeMode="cover"
                accessibilityLabel="Journal memory photo"
              />
            ) : null}

            {/* Reflection fields */}
            {detailEntry.highlight ? renderDetailBlock('✨ Highlight', detailEntry.highlight, colors) : null}
            {detailEntry.difficultMoment ? renderDetailBlock('🌧 Difficult Moment', detailEntry.difficultMoment, colors) : null}
            {detailEntry.gratitude ? renderDetailBlock('🙏 Gratitude', detailEntry.gratitude, colors) : null}
            {detailEntry.lessonsLearned ? renderDetailBlock('💡 Lessons Learned', detailEntry.lessonsLearned, colors) : null}
            {detailEntry.tomorrowIntent ? renderDetailBlock('🌙 Tomorrow\'s Intention', detailEntry.tomorrowIntent, colors) : null}

            <View style={{ height: Spacing.huge }} />
          </ScrollView>
        </View>
      </View>
    );
  };

  // --- Reflection Wizard Overlay ---
  const renderReflectionOverlay = () => {
    const step = REFLECTION_STEPS[reflectionStep];
    const isLast = reflectionStep === REFLECTION_STEPS.length - 1;

    return (
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.overlayBg, { backgroundColor: 'rgba(30,28,26,0.85)' }]}>
          <View style={[styles.reflectionSheet, { backgroundColor: colors.background }]}>
            {/* Progress dots */}
            <View style={styles.reflectionProgress}>
              {REFLECTION_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: i <= reflectionStep ? colors.primaryDark : colors.border,
                      width: i === reflectionStep ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <Text variant="caption" color={colors.textMuted} style={{ marginBottom: Spacing.md }}>
              Step {reflectionStep + 1} of {REFLECTION_STEPS.length}
            </Text>

            <Text variant="h3" style={[styles.reflectionQuestion, { color: colors.text }]}>
              {step.question}
            </Text>

            <TextInput
              placeholder="Take your time..."
              placeholderTextColor={colors.textMuted}
              value={reflectionAnswers[step.field] ?? ''}
              onChangeText={(t) => setReflectionAnswers((prev) => ({ ...prev, [step.field]: t }))}
              multiline
              autoFocus
              style={[styles.reflectionInput, { color: colors.text, borderColor: colors.border }]}
              textAlignVertical="top"
            />

            <View style={styles.reflectionNav}>
              {reflectionStep > 0 && (
                <Pressable
                  onPress={() => setReflectionStep((s) => s - 1)}
                  style={[styles.reflectionNavBtn, { borderColor: colors.border }]}
                >
                  <ChevronLeft size={20} color={colors.text} />
                </Pressable>
              )}
              <Pressable
                onPress={handleReflectionNext}
                style={[styles.reflectionNavBtn, styles.reflectionNext, { backgroundColor: colors.primary }]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#1E1C1A" />
                ) : (
                  <Text style={{ fontWeight: '800', color: '#1E1C1A' }}>
                    {isLast ? 'Save Reflection 🌙' : 'Next'}
                  </Text>
                )}
              </Pressable>
            </View>

            <Pressable onPress={() => setOverlay('none')} style={{ marginTop: Spacing.lg, alignSelf: 'center' }}>
              <Text variant="caption" color={colors.textMuted}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader()}
        {renderTabRow()}

        <View style={{ flex: 1 }}>
          {activeTab === 'entries' && renderEntriesTab()}
          {activeTab === 'memories' && renderMemoriesTab()}
          {activeTab === 'mood' && renderMoodTab()}
        </View>
      </SafeAreaView>

      {/* Floating Action Buttons */}
      {overlay === 'none' && (
        <View style={styles.fabContainer}>
          {/* Night Reflection shortcut */}
          <Pressable
            onPress={openReflection}
            style={[styles.fabSecondary, { backgroundColor: colors.accentPurple, ...Shadows.medium }]}
            accessibilityLabel="Start night reflection"
          >
            <Moon size={20} color="#4A3A6B" />
          </Pressable>

          {/* Voice Journal */}
          <Pressable
            onPress={() => setOverlay('voice')}
            style={[styles.fabSecondary, { backgroundColor: colors.secondaryLight, ...Shadows.medium }]}
            accessibilityLabel="New voice journal entry"
          >
            <Mic size={20} color={colors.secondary} />
          </Pressable>

          {/* Primary: New Entry */}
          <Pressable
            onPress={() => openNewEditor('text')}
            style={[styles.fab, { backgroundColor: colors.primary, ...Shadows.strong }]}
            accessibilityLabel="New journal entry"
          >
            <Plus size={24} color="#1E1C1A" strokeWidth={2.5} />
          </Pressable>
        </View>
      )}

      {/* Overlays */}
      {overlay === 'editor' && renderEditorOverlay()}
      {overlay === 'detail' && renderDetailOverlay()}
      {overlay === 'reflection' && renderReflectionOverlay()}
      {overlay === 'voice' && (
        <VoiceJournalScreen
          onClose={() => setOverlay('none')}
          onSaved={() => {
            setOverlay('none');
            fetchJournalData();
          }}
        />
      )}
    </View>
  );
}

// ─── Detail Block Helper ──────────────────────────────────────────────────────

function renderDetailBlock(label: string, content: string, colors: ColorsType) {
  return (
    <View style={[detailBlockStyles.container, { borderLeftColor: colors.primaryLight }]}>
      <Text variant="caption" color={colors.textSecondary} style={{ fontWeight: '700', marginBottom: 4 }}>
        {label}
      </Text>
      <Text variant="body" color={colors.text}>{content}</Text>
    </View>
  );
}

const detailBlockStyles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.round,
  },

  // Mood Row in Header
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  moodEmojis: { flexDirection: 'row', gap: 4 },
  moodBtn: { padding: 6 },
  moodEmoji: { fontSize: 22 },

  // Tab Bar
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: Spacing.lg,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, position: 'relative' },
  tabLabel: { fontWeight: '700', fontSize: 13 },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2, width: '60%', borderRadius: 1 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 44,
  },
  searchInput: { flex: 1, ...Typography.bodySecondary },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 130 : 100,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: Spacing.huge, paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },

  // Entry Card
  entryCard: { borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '800' },
  cardPreview: { lineHeight: 20 },
  cardThumbnail: {
    width: '100%',
    height: 140,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },

  // Memories Grid
  memoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  memoryCell: {
    width: '47.5%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  memoryImage: { width: '100%', height: 160 },
  memoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  memoryTitle: { color: '#fff', fontWeight: '700' },
  memoryDate: { color: 'rgba(255,255,255,0.7)' },

  // Mood Tab
  moodSummaryCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  moodTimeline: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  moodLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  distributionCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  distEmoji: { fontSize: 18, width: 28 },
  distBarBg: {
    flex: 1,
    height: 12,
    borderRadius: BorderRadius.round,
    backgroundColor: '#EAE6DB',
    overflow: 'hidden',
  },
  distBarFill: { height: '100%', borderRadius: BorderRadius.round },
  moodHistoryCard: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  moodHistoryRow: { flexDirection: 'row', alignItems: 'center' },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Platform.OS === 'ios' ? 104 : 80,
    gap: Spacing.md,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Overlay shared
  overlayBg: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  overlaySheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '92%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    ...Shadows.strong,
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  overlayClose: { padding: Spacing.xs },
  overlayAction: { padding: Spacing.xs },
  overlayScroll: { flex: 1 },

  // Editor
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typePill: {
    flex: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    alignItems: 'center',
  },
  fieldLabel: { fontWeight: '600', marginTop: Spacing.md, marginBottom: Spacing.xs },
  editorMoodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  editorMoodBtn: { padding: Spacing.sm },
  editorMoodEmoji: { fontSize: 26 },
  bodyInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 130,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 70,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  imagePreviewRow: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  deleteBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Detail
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailMoodEmoji: { fontSize: 28 },
  detailTitle: {
    fontWeight: '900',
    marginBottom: Spacing.lg,
    lineHeight: 30,
  },
  detailSection: {
    lineHeight: 26,
    marginBottom: Spacing.lg,
  },
  detailImage: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },

  // Reflection Wizard
  reflectionSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.huge : Spacing.xl,
    minHeight: '65%',
    ...Shadows.strong,
  },
  reflectionProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
    transition: 'width 0.2s',
  } as any,
  reflectionQuestion: {
    fontWeight: '800',
    fontSize: 22,
    lineHeight: 30,
    marginBottom: Spacing.xl,
  },
  reflectionInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 130,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  reflectionNav: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'flex-end',
  },
  reflectionNavBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reflectionNext: {
    flex: 1,
    borderWidth: 0,
  },
});
