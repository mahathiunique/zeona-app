import { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, CheckSquare, Square, Plus, BookOpen, Music, Compass } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { useTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../constants/theme';
import { useHomeData } from '../../hooks/useHomeData';
import { MoodRepository } from '../../services/firebase/repositories/moodRepository';
import { TaskRepository } from '../../services/firebase/repositories/taskRepository';
import { HabitRepository } from '../../services/firebase/repositories/habitRepository';
import { Mood, Task, Habit, HabitLog } from '../../types/models';

import Text from '../../components/common/Text';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StreakCard from '../../components/common/StreakCard';

// Local curated daily quotes for V1
const LOCAL_QUOTES = [
  { text: "The present moment is filled with joy and happiness. If you are attentive, you will see it.", author: "Thich Nhat Hanh" },
  { text: "Quiet the mind and the soul will speak.", author: "Ma Jaya Sati Bhagavati" },
  { text: "Within you, there is a stillness and a sanctuary to which you can retreat at any time.", author: "Hermann Hesse" },
  { text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.", author: "Thich Nhat Hanh" },
  { text: "Slow down and everything you are chasing will come and catch you.", author: "John De Paola" },
];

const MOODS_OPTIONS = [
  { emoji: '😞', label: 'Sad', color: '#CCDDFD' },
  { emoji: '😕', label: 'Meh', color: '#ADDCED' },
  { emoji: '😐', label: 'Okay', color: '#F9EFD7' },
  { emoji: '🙂', label: 'Good', color: '#E6CEF4' },
  { emoji: '😍', label: 'Great', color: '#F8D9EC' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, loading, refreshing, error, refetch, handleRefresh, todayDateStr } = useHomeData();

  const [selectedMoodIdx, setSelectedMoodIdx] = useState<number | null>(null);

  // Animations for selected mood
  const moodScale = useSharedValue(1);

  // Sync selected mood index when data loads
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data.todayMood) {
        setSelectedMoodIdx(data.todayMood.value - 1);
      } else {
        setSelectedMoodIdx(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [data.todayMood]);

  // Compute greeting dynamically based on hours
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return 'Good morning';
    if (hours >= 12 && hours < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Format today's date
  const formattedDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  }, []);

  // Daily Quote based on day index
  const dailyQuote = useMemo(() => {
    const day = new Date().getDate();
    return LOCAL_QUOTES[day % LOCAL_QUOTES.length];
  }, []);

  // Extract first name
  const firstName = useMemo(() => {
    if (!data.profile?.displayName) return 'Companion';
    return data.profile.displayName.trim().split(' ')[0];
  }, [data.profile]);

  // Handle Mood selection
  const handleMoodSelect = async (index: number) => {
    if (!data.profile?.uid) return;
    
    setSelectedMoodIdx(index);
    moodScale.value = withSpring(1.2, {}, () => {
      moodScale.value = withSpring(1);
    });

    const hours = new Date().getHours();
    let timeOfDay = 'night';
    if (hours >= 5 && hours < 12) timeOfDay = 'morning';
    else if (hours >= 12 && hours < 17) timeOfDay = 'afternoon';
    else if (hours >= 17 && hours < 21) timeOfDay = 'evening';

    const moodRecord: Mood = {
      id: todayDateStr, // Scoping document ID directly by date prevents duplicate logs!
      userId: data.profile.uid,
      value: index + 1,
      note: '',
      date: todayDateStr,
      timeOfDay,
      createdAt: data.todayMood?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await MoodRepository.saveMood(moodRecord);
      refetch(); // Reload background checks
    } catch (e) {
      Alert.alert('Mood Check-in Failed', (e as Error).message);
    }
  };

  // Toggle task completion from Home
  const handleToggleTask = async (task: Task) => {
    try {
      const updatedTask: Task = {
        ...task,
        isCompleted: !task.isCompleted,
        updatedAt: new Date().toISOString(),
      };
      await TaskRepository.saveTask(updatedTask);
      refetch();
    } catch (e) {
      Alert.alert('Task Update Failed', (e as Error).message);
    }
  };

  // Increment habit log count from Home
  const handleIncrementHabit = async (habit: Habit) => {
    if (!data.profile?.uid) return;

    // Find existing log
    const existingLog = data.habitLogs.find((l) => l.habitId === habit.id);
    const currentCount = existingLog ? existingLog.count : 0;

    if (currentCount >= habit.targetCount) {
      Alert.alert('Habit completed', `You have already completed your target of ${habit.targetCount} for ${habit.name}!`);
      return;
    }

    const logRecord: HabitLog = {
      id: existingLog?.id || `${habit.id}_${todayDateStr}`,
      userId: data.profile.uid,
      habitId: habit.id,
      date: todayDateStr,
      count: currentCount + 1,
      isCompleted: currentCount + 1 >= habit.targetCount,
      createdAt: existingLog?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await HabitRepository.saveHabitLog(logRecord);
      refetch();
    } catch (e) {
      Alert.alert('Habit Check-in Failed', (e as Error).message);
    }
  };

  // Redirection helpers
  const handleWindDownPress = (type: string) => {
    Alert.alert(`Wind Down: ${type}`, `Launching ${type} soundscape sessions to help you relax.`);
  };

  const animatedMoodStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: moodScale.value }],
    };
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: Spacing.sm }}>
            Preparing your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#FFFDF5' }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="h2" color={colors.text}>
            {greeting}, {firstName} ☀️
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {formattedDate}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(main)/notifications')}
          style={[styles.notificationButton, { borderColor: colors.border }]}
        >
          <Bell size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        {/* Error message card */}
        {error && (
          <Card variant="flat" style={[styles.errorCard, { backgroundColor: '#FEE2E2' }]}>
            <Text variant="body" color={colors.error}>
              {error}
            </Text>
            <Button title="Retry" variant="outline" onPress={() => refetch()} style={{ marginTop: Spacing.xs }} />
          </Card>
        )}

        {/* Streak Card */}
        <StreakCard streakCount={data.profile?.currentStreak || 0} />

        {/* Mood Check-in */}
        <Card variant="flat" style={[styles.moodSection, { backgroundColor: '#E6CEF4' }]}>
          <Text variant="subtitle" color="#4B3A5A" style={styles.sectionTitle}>
            How are you feeling?
          </Text>
          <View style={styles.moodRow}>
            {MOODS_OPTIONS.map((option, idx) => {
              const isSelected = selectedMoodIdx === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => handleMoodSelect(idx)}
                  style={[
                    styles.moodItem,
                    {
                      backgroundColor: isSelected ? option.color : '#FFFFFF',
                      borderColor: isSelected ? colors.primary : '#EAE6DB',
                    },
                  ]}
                >
                  <Animated.View style={isSelected ? animatedMoodStyle : null}>
                    <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  </Animated.View>
                  <Text variant="caption" color={colors.textSecondary} style={{ fontSize: 9 }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Today's Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">{"Today's Overview"}</Text>
            <Pressable onPress={() => router.push('/(main)/calendar')}>
              <Text variant="caption" color={colors.primaryDark} style={styles.viewAllText}>
                View all
              </Text>
            </Pressable>
          </View>

          {data.tasks.length === 0 && data.events.length === 0 ? (
            <Card variant="flat" style={styles.emptyOverviewCard}>
              <Text variant="bodySecondary" color={colors.textSecondary} align="center">
                No tasks or events scheduled for today. Take a deep breath and relax. 🧘
              </Text>
            </Card>
          ) : (
            <View style={styles.overviewList}>
              {data.events.map((evt) => (
                <Card key={evt.id} variant="outlined" style={styles.itemRow}>
                  <View style={styles.itemHeader}>
                    <Compass size={20} color={colors.secondary} />
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text variant="body" style={styles.itemTitle}>{evt.title}</Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        Event • {evt.startTime || 'All Day'}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}

              {data.tasks.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => handleToggleTask(task)}
                  style={[styles.itemRow, { borderColor: colors.border }]}
                >
                  {task.isCompleted ? (
                    <CheckSquare size={22} color={colors.primaryDark} />
                  ) : (
                    <Square size={22} color={colors.textSecondary} />
                  )}
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text
                      variant="body"
                      style={[
                        styles.itemTitle,
                        task.isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
                      ]}
                    >
                      {task.title}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      Task {task.description ? `• ${task.description}` : ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Habit Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">Habit Progress</Text>
            <Pressable onPress={() => router.push('/(main)/calendar')}>
              <Text variant="caption" color={colors.primaryDark} style={styles.viewAllText}>
                Manage
              </Text>
            </Pressable>
          </View>

          {data.habits.length === 0 ? (
            <Card variant="flat" style={[styles.emptyHabitsCard, { backgroundColor: '#ADDCED' }]}>
              <Text variant="bodySecondary" color="#2B465A" align="center" style={styles.emptyHabitText}>
                No habits defined yet. Define goals to keep yourself focused and hydrated.
              </Text>
              <Button
                title="Add Habit"
                variant="outline"
                onPress={() => router.push('/(main)/create')}
                style={styles.emptyHabitButton}
              />
            </Card>
          ) : (
            <View style={styles.habitsList}>
              {data.habits.map((habit) => {
                const log = data.habitLogs.find((l) => l.habitId === habit.id);
                const count = log ? log.count : 0;
                const isCompleted = count >= habit.targetCount;
                const progressPercentage = Math.min(100, (count / habit.targetCount) * 100);

                return (
                  <Card key={habit.id} variant="outlined" style={styles.habitItem}>
                    <View style={styles.habitMetaRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" style={styles.habitName}>
                          {habit.name}
                        </Text>
                        <Text variant="caption" color={colors.textSecondary}>
                          {count} of {habit.targetCount} targets {isCompleted && '✨'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleIncrementHabit(habit)}
                        disabled={isCompleted}
                        style={[
                          styles.incrementButton,
                          {
                            backgroundColor: isCompleted ? '#ADDCED' : colors.primaryLight,
                          },
                        ]}
                      >
                        <Plus size={18} color={colors.text} />
                      </Pressable>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${progressPercentage}%`,
                          },
                        ]}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Journal Prompt */}
        <Card variant="flat" style={[styles.journalPromptCard, { backgroundColor: '#F8D9EC' }]}>
          <View style={styles.promptHeader}>
            <BookOpen size={24} color="#5A3A4B" />
            <Text variant="subtitle" color="#5A3A4B" style={styles.promptTitle}>
              {"What's on your mind?"}
            </Text>
          </View>
          <Text variant="bodySecondary" color="#7C5D6C" style={styles.promptSub}>
            Take a moment to write down your thoughts, voice notes, or sketches.
          </Text>
          <Button
            title="Start Writing"
            variant="outline"
            onPress={() => router.push('/(main)/journal')}
            style={styles.promptButton}
          />
        </Card>

        {/* Curated Quotes */}
        <Card variant="flat" style={[styles.quoteCard, { backgroundColor: '#F9EFD7' }]}>
          <Text variant="body" italic color="#5C4D2E">
            {`"${dailyQuote.text}"`}
          </Text>
          <Text variant="caption" color="#5C4D2E" style={styles.quoteAuthor}>
            — {dailyQuote.author}
          </Text>
        </Card>

        {/* Wind Down */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>
            Wind Down
          </Text>
          <Card variant="outlined" style={styles.windDownCard}>
            <View style={styles.windDownHeader}>
              <View style={styles.windDownIconBox}>
                <Music size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text variant="body" style={styles.windDownTitle}>Relax before sleeping</Text>
                <Text variant="caption" color={colors.textSecondary}>
                  Gentle night reflection tools
                </Text>
              </View>
            </View>

            <View style={styles.windDownButtonsRow}>
              {['Sounds', 'Stories', 'Breathing', 'Reflection'].map((act) => (
                <Pressable
                  key={act}
                  onPress={() => handleWindDownPress(act)}
                  style={[styles.windDownPill, { backgroundColor: '#FFFDF5', borderColor: colors.border }]}
                >
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    {act}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 130 : 110,
    gap: Spacing.xl,
  },
  errorCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  moodSection: {
    borderRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodItem: {
    width: 52,
    height: 64,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  moodEmoji: {
    fontSize: 22,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontWeight: '700',
  },
  emptyOverviewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  overviewList: {
    gap: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemTitle: {
    fontWeight: '600',
  },
  emptyHabitsCard: {
    padding: Spacing.lg,
    borderRadius: 24,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyHabitText: {
    lineHeight: 22,
  },
  emptyHabitButton: {
    width: '100%',
  },
  habitsList: {
    gap: Spacing.sm,
  },
  habitItem: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  habitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitName: {
    fontWeight: '700',
  },
  incrementButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: BorderRadius.round,
    backgroundColor: '#EAE6DB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.round,
  },
  journalPromptCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  promptTitle: {
    fontWeight: '700',
  },
  promptSub: {
    lineHeight: 20,
  },
  promptButton: {
    marginTop: Spacing.xs,
  },
  quoteCard: {
    borderRadius: 20,
    padding: Spacing.lg,
  },
  quoteAuthor: {
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
  },
  windDownCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  windDownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  windDownIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.round,
    backgroundColor: '#F3EFE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  windDownTitle: {
    fontWeight: '700',
  },
  windDownButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  windDownPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
  },
});
