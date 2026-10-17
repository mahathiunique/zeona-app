import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ArrowLeft } from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Spacing, BorderRadius } from '../../constants/theme';
import { TaskRepository } from '../../services/firebase/repositories/taskRepository';
import { HabitRepository } from '../../services/firebase/repositories/habitRepository';
import { GoalRepository } from '../../services/firebase/repositories/goalRepository';
import { EventRepository } from '../../services/firebase/repositories/eventRepository';
import { MoodRepository } from '../../services/firebase/repositories/moodRepository';
import { Task, Habit, Goal, Event, SpecialDate, Mood, SpecialDateType, GoalCategory } from '../../types/models';

import Text from '../../components/common/Text';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

type ActiveForm = 'grid' | 'task' | 'habit' | 'goal' | 'event' | 'specialDay' | 'mood';

export default function CreateScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.uid;

  const [activeForm, setActiveForm] = useState<ActiveForm>('grid');
  const [submitting, setSubmitting] = useState(false);

  // Helper date utility
  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Form Fields State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(getTodayStr());

  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [habitFreq, setHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [habitTarget, setHabitTarget] = useState('1');

  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState(getTodayStr());
  const [goalCategory, setGoalCategory] = useState<GoalCategory>('Personal');
  const [goalStartDate, setGoalStartDate] = useState(getTodayStr());
  const [goalTargetValue, setGoalTargetValue] = useState('');
  const [goalUnit, setGoalUnit] = useState('');

  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(getTodayStr());
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventCategory, setEventCategory] = useState('personal');

  const [specialTitle, setSpecialTitle] = useState('');
  const [specialDate, setSpecialDate] = useState('01-01');
  const [specialType, setSpecialType] = useState<SpecialDateType>('birthday');

  const [moodVal, setMoodVal] = useState<number>(3);
  const [moodNote, setMoodNote] = useState('');

  // Reset form states
  const resetForms = () => {
    setTaskTitle('');
    setTaskDesc('');
    setTaskDueDate(getTodayStr());
    setHabitName('');
    setHabitDesc('');
    setHabitFreq('daily');
    setHabitTarget('1');
    setGoalTitle('');
    setGoalDesc('');
    setGoalTargetDate(getTodayStr());
    setGoalCategory('Personal');
    setGoalStartDate(getTodayStr());
    setGoalTargetValue('');
    setGoalUnit('');
    setEventTitle('');
    setEventDesc('');
    setEventDate(getTodayStr());
    setEventStartTime('10:00');
    setEventCategory('personal');
    setSpecialTitle('');
    setSpecialDate('01-01');
    setSpecialType('birthday');
    setMoodVal(3);
    setMoodNote('');
  };

  // Handlers
  const handleSaveTask = async () => {
    if (!userId) return;
    if (!taskTitle.trim()) {
      Alert.alert('Validation Error', 'Task title is required.');
      return;
    }
    setSubmitting(true);
    try {
      const task: Task = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        isCompleted: false,
        dueDate: taskDueDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await TaskRepository.saveTask(task);
      Alert.alert('Success', 'Task added successfully.');
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveHabit = async () => {
    if (!userId) return;
    if (!habitName.trim()) {
      Alert.alert('Validation Error', 'Habit name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const habit: Habit = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        name: habitName.trim(),
        description: habitDesc.trim(),
        frequency: habitFreq,
        targetCount: parseInt(habitTarget, 10) || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await HabitRepository.saveHabit(habit);
      Alert.alert('Success', 'Habit configured successfully.');
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!userId) return;
    if (!goalTitle.trim()) {
      Alert.alert('Validation Error', 'Goal title is required.');
      return;
    }
    setSubmitting(true);
    try {
      const targetVal = parseFloat(goalTargetValue) || undefined;
      const goal: Goal = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        title: goalTitle.trim(),
        description: goalDesc.trim(),
        category: goalCategory,
        startDate: goalStartDate || getTodayStr(),
        targetDate: goalTargetDate,
        targetValue: targetVal,
        currentValue: 0,
        unit: goalUnit.trim() || undefined,
        progress: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await GoalRepository.saveGoal(goal);
      Alert.alert('Success', 'Goal configured successfully.');
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!userId) return;
    if (!eventTitle.trim()) {
      Alert.alert('Validation Error', 'Event title is required.');
      return;
    }
    setSubmitting(true);
    try {
      const event: Event = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        date: eventDate,
        startTime: eventStartTime,
        category: eventCategory,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await EventRepository.saveEvent(event);
      Alert.alert('Success', 'Event added successfully.');
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSpecialDate = async () => {
    if (!userId) return;
    if (!specialTitle.trim()) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }
    setSubmitting(true);
    try {
      const spDate: SpecialDate = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        title: specialTitle.trim(),
        date: specialDate,
        type: specialType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await EventRepository.saveSpecialDate(spDate);
      Alert.alert('Success', 'Special date logged.');
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMood = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const todayStr = getTodayStr();
      const moodRecord: Mood = {
        id: todayStr, // Date scopes document to prevent duplicates
        userId,
        value: moodVal,
        note: moodNote.trim(),
        date: todayStr,
        timeOfDay: new Date().getHours() >= 12 ? 'afternoon' : 'morning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await MoodRepository.saveMood(moodRecord);
      Alert.alert('Success', 'Mood log updated.');
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Rendering Helper: Options Grid
  const renderGrid = () => {
    const gridItems = [
      {
        id: 'journal',
        title: 'Journal',
        emoji: '✍️',
        bgColor: '#F8D9EC',
        onPress: () => {
          router.replace('/(main)/journal');
        },
      },
      {
        id: 'voice',
        title: 'Voice',
        emoji: '🎙',
        bgColor: '#ADDCED',
        onPress: () => {
          router.replace({ pathname: '/(main)/journal', params: { openVoice: '1' } });
        },
      },
      {
        id: 'mood',
        title: 'Mood',
        emoji: '😊',
        bgColor: '#E6CEF4',
        onPress: () => setActiveForm('mood'),
      },
      {
        id: 'task',
        title: 'Task',
        emoji: '✅',
        bgColor: '#CCDDFD',
        onPress: () => setActiveForm('task'),
      },
      {
        id: 'habit',
        title: 'Habit',
        emoji: '🌱',
        bgColor: '#F9EFD7',
        onPress: () => setActiveForm('habit'),
      },
      {
        id: 'goal',
        title: 'Goal',
        emoji: '🎯',
        bgColor: '#F8D9EC',
        onPress: () => setActiveForm('goal'),
      },
      {
        id: 'event',
        title: 'Event',
        emoji: '📅',
        bgColor: '#ADDCED',
        onPress: () => setActiveForm('event'),
      },
      {
        id: 'specialDay',
        title: 'Special Day',
        emoji: '💖',
        bgColor: '#E6CEF4',
        onPress: () => setActiveForm('specialDay'),
      },
    ];

    return (
      <View style={styles.gridContainer}>
        {gridItems.map((item) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            style={[styles.gridItem, { backgroundColor: item.bgColor }]}
          >
            <Text style={styles.gridEmoji}>{item.emoji}</Text>
            <Text variant="subtitle" style={styles.gridLabel}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  // Rendering Helper: Form Header Row
  const renderFormHeader = (title: string) => (
    <View style={styles.formHeaderRow}>
      <Pressable
        onPress={() => {
          setActiveForm('grid');
          resetForms();
        }}
        style={styles.backBtn}
      >
        <ArrowLeft color={colors.text} size={22} />
      </Pressable>
      <Text variant="subtitle" style={styles.formTitle}>
        {title}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );

  return (
    <SafeAreaView style={styles.backdrop} edges={['top', 'bottom']}>
      {/* Dimmed closeable backdrop area */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <Card variant="flat" style={[styles.sheetContent, { backgroundColor: colors.background }]}>
          {/* Top Panel Drag Handler / Title bar */}
          <View style={styles.titleRow}>
            {activeForm === 'grid' ? (
              <View>
                <Text variant="h2" color={colors.text} style={styles.mainTitle}>
                  Create ✨
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {"What would you like to add?"}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Pressable
              onPress={() => router.back()}
              style={[styles.closeButton, { borderColor: colors.border }]}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContainer}
          >
            {activeForm === 'grid' && renderGrid()}

            {/* TASK FORM */}
            {activeForm === 'task' && (
              <View style={styles.formContainer}>
                {renderFormHeader('New Task')}
                <Input
                  label="Task Title"
                  placeholder="e.g. Meditate for 10 minutes"
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                />
                <Input
                  label="Description"
                  placeholder="Add additional context..."
                  value={taskDesc}
                  onChangeText={setTaskDesc}
                />
                <Input
                  label="Due Date (YYYY-MM-DD)"
                  placeholder="e.g. 2026-08-05"
                  value={taskDueDate}
                  onChangeText={setTaskDueDate}
                />
                <Button
                  title="Create Task"
                  variant="primary"
                  loading={submitting}
                  onPress={handleSaveTask}
                  style={styles.saveBtn}
                />
              </View>
            )}

            {/* HABIT FORM */}
            {activeForm === 'habit' && (
              <View style={styles.formContainer}>
                {renderFormHeader('New Habit')}
                <Input
                  label="Habit Name"
                  placeholder="e.g. Drink Water"
                  value={habitName}
                  onChangeText={setHabitName}
                />
                <Input
                  label="Description"
                  placeholder="e.g. 8 glasses a day"
                  value={habitDesc}
                  onChangeText={setHabitDesc}
                />

                <Text variant="caption" color={colors.textSecondary} style={styles.labelSpacer}>
                  Frequency
                </Text>
                <View style={styles.toggleRow}>
                  {['daily', 'weekly'].map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => setHabitFreq(f as 'daily' | 'weekly')}
                      style={[
                        styles.togglePill,
                        {
                          backgroundColor: habitFreq === f ? colors.primaryLight : '#FFFDF5',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text variant="caption" style={{ textTransform: 'capitalize' }}>
                        {f}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Input
                  label="Daily Target (count)"
                  placeholder="1"
                  keyboardType="numeric"
                  value={habitTarget}
                  onChangeText={setHabitTarget}
                />
                <Button
                  title="Create Habit"
                  variant="primary"
                  loading={submitting}
                  onPress={handleSaveHabit}
                  style={styles.saveBtn}
                />
              </View>
            )}

            {/* GOAL FORM */}
            {activeForm === 'goal' && (
              <View style={styles.formContainer}>
                {renderFormHeader('New Goal')}
                <Input
                  label="Goal Title"
                  placeholder="e.g. Finish reading a book"
                  value={goalTitle}
                  onChangeText={setGoalTitle}
                />
                <Input
                  label="Description"
                  placeholder="Why is this goal meaningful?"
                  value={goalDesc}
                  onChangeText={setGoalDesc}
                />

                <Text variant="caption" color={colors.textSecondary} style={styles.labelSpacer}>
                  Category
                </Text>
                <View style={styles.toggleRow}>
                  {(['Academic', 'Career', 'Fitness', 'Health', 'Finance', 'Reading', 'Personal', 'Creative', 'Other'] as GoalCategory[]).map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setGoalCategory(cat)}
                      style={[
                        styles.togglePill,
                        {
                          backgroundColor: goalCategory === cat ? colors.primaryLight : '#FFFDF5',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text variant="caption">{cat}</Text>
                    </Pressable>
                  ))}
                </View>

                <Input
                  label="Start Date (YYYY-MM-DD)"
                  placeholder="e.g. 2026-08-05"
                  value={goalStartDate}
                  onChangeText={setGoalStartDate}
                />
                <Input
                  label="Target Date (YYYY-MM-DD)"
                  placeholder="e.g. 2026-08-30"
                  value={goalTargetDate}
                  onChangeText={setGoalTargetDate}
                />
                <Input
                  label="Target Progress Value (optional)"
                  placeholder="e.g. 20 (books)"
                  keyboardType="numeric"
                  value={goalTargetValue}
                  onChangeText={setGoalTargetValue}
                />
                <Input
                  label="Unit (optional)"
                  placeholder="e.g. books, hours, kg"
                  value={goalUnit}
                  onChangeText={setGoalUnit}
                />
                <Button
                  title="Configure Goal"
                  variant="primary"
                  loading={submitting}
                  onPress={handleSaveGoal}
                  style={styles.saveBtn}
                />
              </View>
            )}

            {/* EVENT FORM */}
            {activeForm === 'event' && (
              <View style={styles.formContainer}>
                {renderFormHeader('New Event')}
                <Input
                  label="Event Title"
                  placeholder="e.g. Breathing Seminar"
                  value={eventTitle}
                  onChangeText={setEventTitle}
                />
                <Input
                  label="Description"
                  placeholder="e.g. Online link..."
                  value={eventDesc}
                  onChangeText={setEventDesc}
                />
                <Input
                  label="Date (YYYY-MM-DD)"
                  placeholder="e.g. 2026-08-05"
                  value={eventDate}
                  onChangeText={setEventDate}
                />
                <Input
                  label="Start Time (HH:MM)"
                  placeholder="e.g. 10:00"
                  value={eventStartTime}
                  onChangeText={setEventStartTime}
                />
                <Input
                  label="Category"
                  placeholder="e.g. health, work, personal"
                  value={eventCategory}
                  onChangeText={setEventCategory}
                />
                <Button
                  title="Create Event"
                  variant="primary"
                  loading={submitting}
                  onPress={handleSaveEvent}
                  style={styles.saveBtn}
                />
              </View>
            )}

            {/* SPECIAL DAY FORM */}
            {activeForm === 'specialDay' && (
              <View style={styles.formContainer}>
                {renderFormHeader('Special Day')}
                <Input
                  label="Title"
                  placeholder="e.g. Sarah's Birthday"
                  value={specialTitle}
                  onChangeText={setSpecialTitle}
                />
                <Input
                  label="Date (MM-DD or YYYY-MM-DD)"
                  placeholder="e.g. 08-15"
                  value={specialDate}
                  onChangeText={setSpecialDate}
                />

                <Text variant="caption" color={colors.textSecondary} style={styles.labelSpacer}>
                  Type
                </Text>
                <View style={styles.toggleRow}>
                  {['birthday', 'anniversary', 'holiday', 'other'].map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setSpecialType(type as SpecialDateType)}
                      style={[
                        styles.togglePill,
                        {
                          backgroundColor: specialType === type ? colors.primaryLight : '#FFFDF5',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text variant="caption" style={{ textTransform: 'capitalize' }}>
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Button
                  title="Log Date"
                  variant="primary"
                  loading={submitting}
                  onPress={handleSaveSpecialDate}
                  style={styles.saveBtn}
                />
              </View>
            )}

            {/* MOOD FORM */}
            {activeForm === 'mood' && (
              <View style={styles.formContainer}>
                {renderFormHeader('Mood Log')}
                <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: Spacing.sm }}>
                  Choose energy rating
                </Text>
                <View style={styles.moodChoicesRow}>
                  {[1, 2, 3, 4, 5].map((val) => {
                    const emojis = ['😞', '😕', '😐', '🙂', '😍'];
                    const isSelected = moodVal === val;
                    return (
                      <Pressable
                        key={val}
                        onPress={() => setMoodVal(val)}
                        style={[
                          styles.moodChoiceItem,
                          {
                            backgroundColor: isSelected ? colors.primaryLight : '#FFFDF5',
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={styles.moodChoiceEmoji}>{emojis[val - 1]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Input
                  label="Reflection notes"
                  placeholder="Write details about your day..."
                  value={moodNote}
                  onChangeText={setMoodNote}
                />
                <Button
                  title="Save Mood Log"
                  variant="primary"
                  loading={submitting}
                  onPress={handleSaveMood}
                  style={styles.saveBtn}
                />
              </View>
            )}
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 28, 26, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    maxHeight: '85%',
    width: '100%',
  },
  sheetContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  mainTitle: {
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingBottom: Spacing.xxl,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  gridItem: {
    width: '47%',
    aspectRatio: 1.15,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  gridEmoji: {
    fontSize: 32,
    ...Platform.select({
      ios: { lineHeight: 40 },
      android: { lineHeight: 40 },
    }),
  },
  gridLabel: {
    fontWeight: '700',
  },
  formContainer: {
    gap: Spacing.md,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  backBtn: {
    minHeight: 40,
    width: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontWeight: '800',
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
  labelSpacer: {
    marginTop: Spacing.xs,
    marginBottom: -Spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  togglePill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
  },
  moodChoicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  moodChoiceItem: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodChoiceEmoji: {
    fontSize: 24,
  },
});
