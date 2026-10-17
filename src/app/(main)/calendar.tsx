import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckSquare,
  Square,
  Compass,
  Heart,
  X,
} from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Spacing, BorderRadius } from '../../constants/theme';
import { TaskRepository } from '../../services/firebase/repositories/taskRepository';
import { EventRepository } from '../../services/firebase/repositories/eventRepository';
import { GoalRepository } from '../../services/firebase/repositories/goalRepository';
import { HabitRepository } from '../../services/firebase/repositories/habitRepository';
import { Task, Event, SpecialDate, Goal, GoalMilestone, Habit, HabitLog, GoalCategory } from '../../types/models';
import { AchievementRepository } from '../../services/firebase/repositories/achievementRepository';

import Text from '../../components/common/Text';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';

type Segment = 'calendar' | 'tasks' | 'goals';
type TaskFilter = 'today' | 'upcoming' | 'completed';

const generateId = () => Math.random().toString(36).substr(2, 9);

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Academic': return '🎓';
    case 'Career': return '💼';
    case 'Fitness': return '🏃';
    case 'Health': return '🍎';
    case 'Finance': return '💰';
    case 'Reading': return '📚';
    case 'Personal': return '🌟';
    case 'Creative': return '🎨';
    default: return '🔮';
  }
};

const getCategoryBg = (category: string) => {
  switch (category) {
    case 'Academic': return '#CCDDFD';
    case 'Career': return '#ADDCED';
    case 'Fitness': return '#F8D9EC';
    case 'Health': return '#E6CEF4';
    case 'Finance': return '#F9EFD7';
    case 'Reading': return '#CCDDFD';
    case 'Personal': return '#ADDCED';
    case 'Creative': return '#F8D9EC';
    default: return '#E6CEF4';
  }
};

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.uid;

  const [activeSegment, setActiveSegment] = useState<Segment>('calendar');
  const [loading, setLoading] = useState(true);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Firestore Data Cache for the current month
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);

  // Task Tab Filters
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Modals State
  const [modalType, setModalType] = useState<'none' | 'task' | 'event' | 'goal' | 'milestone'>('none');
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formCategory, setFormCategory] = useState('personal');
  const [formGoalId, setFormGoalId] = useState('');

  const [formGoalCategory, setFormGoalCategory] = useState<GoalCategory>('Personal');
  const [formGoalStartDate, setFormGoalStartDate] = useState('');
  const [formGoalTargetValue, setFormGoalTargetValue] = useState('');
  const [formGoalUnit, setFormGoalUnit] = useState('');

  const [goalFilter, setGoalFilter] = useState<'active' | 'longterm' | 'completed'>('active');
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);
  const [progressIncrement, setProgressIncrement] = useState('');

  // Local helper to format Date to YYYY-MM-DD string
  const formatDateStr = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const selectedDateStr = useMemo(() => formatDateStr(selectedDate), [selectedDate]);

  // Load and refresh monthly records
  const fetchMonthData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Scoped ranges
    const firstDay = formatDateStr(new Date(year, month, 1));
    const lastDay = formatDateStr(new Date(year, month + 1, 0));

    try {
      const [
        tasksList,
        eventsList,
        specialList,
        habitsList,
        logsList,
        goalsList,
      ] = await Promise.all([
        TaskRepository.getTasksForRange(userId, firstDay, lastDay),
        EventRepository.getEventsForRange(userId, firstDay, lastDay),
        EventRepository.getSpecialDates(userId),
        HabitRepository.getHabits(userId),
        HabitRepository.getHabitLogsForDate(userId, selectedDateStr),
        GoalRepository.getGoals(userId),
      ]);

      // Fetch milestones for all goals
      const allMilestonesPromises = goalsList.map((g) => GoalRepository.getMilestones(userId, g.id));
      const milestonesResults = await Promise.all(allMilestonesPromises);
      const flattenedMilestones = milestonesResults.flat();

      setTasks(tasksList);
      setEvents(eventsList);
      setSpecialDates(specialList);
      setHabits(habitsList);
      setHabitLogs(logsList);
      setGoals(goalsList);
      setMilestones(flattenedMilestones);
    } catch (e) {
      Alert.alert('Database Fetch Failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate, selectedDateStr]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMonthData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMonthData]);

  // Trigger habit log check in
  const handleIncrementHabit = async (habit: Habit) => {
    if (!userId) return;
    const log = habitLogs.find((l) => l.habitId === habit.id);
    const count = log ? log.count : 0;

    if (count >= habit.targetCount) return;

    const logRecord: HabitLog = {
      id: log?.id || `${habit.id}_${selectedDateStr}`,
      userId,
      habitId: habit.id,
      date: selectedDateStr,
      count: count + 1,
      isCompleted: count + 1 >= habit.targetCount,
      createdAt: log?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await HabitRepository.saveHabitLog(logRecord);
      fetchMonthData();
    } catch (e) {
      Alert.alert('Habit Update Failed', (e as Error).message);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: Task) => {
    try {
      const updated: Task = {
        ...task,
        isCompleted: !task.isCompleted,
        updatedAt: new Date().toISOString(),
      };
      await TaskRepository.saveTask(updated);
      fetchMonthData();
    } catch (e) {
      Alert.alert('Task Toggling Failed', (e as Error).message);
    }
  };

  // Achievement award check
  const checkAndAwardGoalAchievement = async () => {
    if (!userId) return;
    try {
      const userAchs = await AchievementRepository.getUserAchievements(userId);
      const hasGoalAch = userAchs.some((a) => a.achievementId === 'goal_first_complete' && a.isUnlocked);
      if (!hasGoalAch) {
        await AchievementRepository.saveUserAchievement({
          id: `${userId}_goal_first_complete`,
          userId,
          achievementId: 'goal_first_complete',
          progress: 1,
          isUnlocked: true,
          unlockedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        Alert.alert('🎉 Achievement Unlocked!', 'Congratulations! You unlocked the "Goal Getter" achievement badge.');
      }
    } catch (e) {
      console.warn('Achievement award check failed:', e);
    }
  };

  // Add progress amount handler
  const handleAddProgress = async (amount: number) => {
    if (!userId || !detailGoal) return;
    try {
      const newVal = detailGoal.currentValue + amount;
      const targetVal = detailGoal.targetValue || 0;
      
      // Calculate progress percentage
      let progress = 100;
      if (targetVal > 0) {
        progress = Math.min(Math.round((newVal / targetVal) * 100), 100);
      }

      const isNewlyCompleted = progress >= 100 && detailGoal.status !== 'completed';

      const updatedGoal: Goal = {
        ...detailGoal,
        currentValue: newVal,
        progress,
        status: progress >= 100 ? 'completed' : detailGoal.status,
        updatedAt: new Date().toISOString(),
      };

      await GoalRepository.saveGoal(updatedGoal);
      setDetailGoal(updatedGoal);
      
      if (isNewlyCompleted) {
        Alert.alert('🎉 Goal Completed!', `Congratulations! You have completed your goal: "${detailGoal.title}"`);
        await checkAndAwardGoalAchievement();
      } else {
        Alert.alert('Success', `Goal progress updated to ${newVal}${detailGoal.unit ? ` ${detailGoal.unit}` : ''}.`);
      }
      
      fetchMonthData();
    } catch (e) {
      Alert.alert('Progress Update Failed', (e as Error).message);
    }
  };

  // Toggle Milestone Completion
  const handleToggleMilestone = async (m: GoalMilestone) => {
    try {
      const updated: GoalMilestone = {
        ...m,
        isCompleted: !m.isCompleted,
        updatedAt: new Date().toISOString(),
      };
      await GoalRepository.saveMilestone(updated);
      
      // Compute updated goal progress percentage
      const goal = goals.find((g) => g.id === m.goalId);
      if (goal) {
        const goalMs = milestones.filter((ms) => ms.goalId === m.goalId);
        const completedCount = goalMs.reduce((acc, curr) => {
          if (curr.id === m.id) return acc + (updated.isCompleted ? 1 : 0);
          return acc + (curr.isCompleted ? 1 : 0);
        }, 0);
        const progress = Math.round((completedCount / goalMs.length) * 100);
        const isNewlyCompleted = progress >= 100 && goal.status !== 'completed';

        const updatedGoal: Goal = {
          ...goal,
          progress,
          status: progress >= 100 ? 'completed' : goal.status,
          updatedAt: new Date().toISOString(),
        };

        await GoalRepository.saveGoal(updatedGoal);
        if (detailGoal && detailGoal.id === goal.id) {
          setDetailGoal(updatedGoal);
        }

        if (isNewlyCompleted) {
          Alert.alert('🎉 Goal Completed!', `Congratulations! You have completed your goal: "${goal.title}"`);
          await checkAndAwardGoalAchievement();
        }
      }
      fetchMonthData();
    } catch (e) {
      Alert.alert('Milestone Toggling Failed', (e as Error).message);
    }
  };

  // Delete handlers
  const handleDeleteTask = (taskId: string) => {
    if (!userId) return;
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await TaskRepository.deleteTask(userId, taskId);
            fetchMonthData();
          } catch (e) {
            Alert.alert('Deletion Failed', (e as Error).message);
          }
        },
      },
    ]);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!userId) return;
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await EventRepository.deleteEvent(userId, eventId);
            fetchMonthData();
          } catch (e) {
            Alert.alert('Deletion Failed', (e as Error).message);
          }
        },
      },
    ]);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!userId) return;
    Alert.alert('Delete Goal', 'Deleting this goal will remove its milestones. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete milestones first
            const goalMs = milestones.filter((m) => m.goalId === goalId);
            await Promise.all(goalMs.map((m) => GoalRepository.deleteMilestone(userId, goalId, m.id)));
            await GoalRepository.deleteGoal(userId, goalId);
            fetchMonthData();
          } catch (e) {
            Alert.alert('Deletion Failed', (e as Error).message);
          }
        },
      },
    ]);
  };

  // CRUD Forms Save
  const handleSaveForm = async () => {
    if (!userId) return;
    if (!formTitle.trim()) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }

    try {
      if (modalType === 'task') {
        const taskObj: Task = {
          id: editTargetId || generateId(),
          userId,
          title: formTitle.trim(),
          description: formDesc.trim(),
          isCompleted: false,
          dueDate: formDate || todayStr,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await TaskRepository.saveTask(taskObj);
      } else if (modalType === 'event') {
        const eventObj: Event = {
          id: editTargetId || generateId(),
          userId,
          title: formTitle.trim(),
          description: formDesc.trim(),
          date: formDate || todayStr,
          startTime: formTime || '12:00',
          category: formCategory,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await EventRepository.saveEvent(eventObj);
      } else if (modalType === 'goal') {
        const targetVal = parseFloat(formGoalTargetValue) || undefined;
        const goalObj: Goal = {
          id: editTargetId || generateId(),
          userId,
          title: formTitle.trim(),
          description: formDesc.trim(),
          category: formGoalCategory,
          startDate: formGoalStartDate || todayStr,
          targetDate: formDate || todayStr,
          targetValue: targetVal,
          currentValue: 0,
          unit: formGoalUnit.trim() || undefined,
          progress: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await GoalRepository.saveGoal(goalObj);
      } else if (modalType === 'milestone') {
        const msObj: GoalMilestone = {
          id: generateId(),
          userId,
          goalId: formGoalId,
          title: formTitle.trim(),
          isCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await GoalRepository.saveMilestone(msObj);
        
        // Update goal progress percentage
        const goal = goals.find((g) => g.id === formGoalId);
        if (goal) {
          const goalMs = [...milestones.filter((m) => m.goalId === formGoalId), msObj];
          const completedCount = goalMs.filter((m) => m.isCompleted).length;
          const progress = Math.round((completedCount / goalMs.length) * 100);
          await GoalRepository.saveGoal({
            ...goal,
            progress,
            status: progress >= 100 ? 'completed' : goal.status,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      setModalType('none');
      setEditTargetId(null);
      resetFormInputs();
      fetchMonthData();
    } catch (e) {
      Alert.alert('Save Failed', (e as Error).message);
    }
  };

  const resetFormInputs = () => {
    setFormTitle('');
    setFormDesc('');
    setFormDate(selectedDateStr);
    setFormTime('12:00');
    setFormCategory('personal');
    setFormGoalId('');
    setFormGoalCategory('Personal');
    setFormGoalStartDate(selectedDateStr);
    setFormGoalTargetValue('');
    setFormGoalUnit('');
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(d);
  };

  // Monthly grid compiler
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month padding cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const d = new Date(year, month - 1, day);
      cells.push({
        date: d,
        dateStr: formatDateStr(d),
        dayNum: day,
        isCurrentMonth: false,
      });
    }

    // Current month cells
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        dateStr: formatDateStr(d),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding cells
    const remaining = 42 - cells.length; // Keep standard 6 rows grid (42 cells)
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        dateStr: formatDateStr(d),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentDate]);

  // Filters computed lists
  const dayEvents = useMemo(() => events.filter((e) => e.date === selectedDateStr), [events, selectedDateStr]);
  const dayTasks = useMemo(() => tasks.filter((t) => t.dueDate === selectedDateStr), [tasks, selectedDateStr]);
  const daySpecialDates = useMemo(() => {
    // Check match for MM-DD or YYYY-MM-DD
    const selectedMonthDay = selectedDateStr.substring(5); // MM-DD
    return specialDates.filter((d) => d.date === selectedDateStr || d.date === selectedMonthDay);
  }, [specialDates, selectedDateStr]);

  // Tasks Tab Listings
  const filteredTasksList = useMemo(() => {
    let list = [...tasks];
    if (taskFilter === 'today') {
      list = list.filter((t) => t.dueDate === todayStr);
    } else if (taskFilter === 'upcoming') {
      list = list.filter((t) => t.dueDate > todayStr && !t.isCompleted);
    } else if (taskFilter === 'completed') {
      list = list.filter((t) => t.isCompleted);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, taskFilter, searchQuery, todayStr]);

  const activeMonthLabel = useMemo(() => {
    return currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Rendering Helper: Calendar Tab
  const renderCalendarTab = () => {
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <View style={styles.tabContent}>
        {/* Month Navigation */}
        <View style={styles.monthHeader}>
          <Pressable onPress={handlePrevMonth} style={styles.navArrow}>
            <ChevronLeft color={colors.text} size={22} />
          </Pressable>
          <Text variant="subtitle" style={styles.monthLabel}>
            {activeMonthLabel}
          </Text>
          <Pressable onPress={handleNextMonth} style={styles.navArrow}>
            <ChevronRight color={colors.text} size={22} />
          </Pressable>
        </View>

        {/* Days of Week Headers */}
        <View style={styles.daysOfWeekRow}>
          {daysOfWeek.map((day, idx) => (
            <Text key={idx} variant="caption" align="center" style={styles.dayOfWeekText}>
              {day}
            </Text>
          ))}
        </View>

        {/* 42-Cells Monthly Grid */}
        <View style={styles.calendarGrid}>
          {calendarCells.map((cell, idx) => {
            const isSelected = cell.dateStr === selectedDateStr;
            const isToday = cell.dateStr === todayStr;

            // Compute Indicators
            const hasTasks = tasks.some((t) => t.dueDate === cell.dateStr);
            const hasEvents = events.some((e) => e.date === cell.dateStr);
            const cellMonthDay = cell.dateStr.substring(5);
            const hasSpecial = specialDates.some((s) => s.date === cell.dateStr || s.date === cellMonthDay);

            return (
              <Pressable
                key={idx}
                onPress={() => setSelectedDate(cell.date)}
                style={[
                  styles.calendarCell,
                  isSelected && { backgroundColor: '#CCDDFD' }, // Zeona light blue selection
                ]}
              >
                <Text
                  variant="body"
                  align="center"
                  color={
                    isSelected
                      ? colors.primaryDark
                      : cell.isCurrentMonth
                      ? colors.text
                      : colors.textSecondary
                  }
                  style={[
                    styles.cellText,
                    isToday && !isSelected && { color: colors.primary, fontWeight: '800' },
                  ]}
                >
                  {cell.dayNum}
                </Text>
                
                {/* Dots indicator row */}
                <View style={styles.indicatorRow}>
                  {hasTasks && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                  {hasEvents && <View style={[styles.dot, { backgroundColor: '#E6CEF4' }]} />}
                  {hasSpecial && <View style={[styles.dot, { backgroundColor: '#F9EFD7' }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Daily details tray */}
        <Card variant="flat" style={styles.detailsTray}>
          <View style={styles.detailsHeader}>
            <Text variant="subtitle" style={{ fontWeight: '700' }}>
              Schedule: {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.addButtonsRow}>
              <Pressable
                onPress={() => {
                  setModalType('event');
                  setFormDate(selectedDateStr);
                }}
                style={styles.trayAddBtn}
              >
                <Plus size={16} color={colors.primaryDark} />
                <Text variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>Event</Text>
              </Pressable>
            </View>
          </View>

          {dayEvents.length === 0 && dayTasks.length === 0 && daySpecialDates.length === 0 && habits.length === 0 ? (
            <Text variant="caption" color={colors.textSecondary} align="center" style={{ paddingVertical: Spacing.md }}>
              No plans for this date. Enjoy the peace! 🍃
            </Text>
          ) : (
            <View style={styles.detailsList}>
              {/* Special Dates */}
              {daySpecialDates.map((d) => (
                <View key={d.id} style={[styles.detailItem, { borderColor: colors.border }]}>
                  <Heart size={18} color="#F26C2A" fill="#F26C2A" />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '700' }}>{d.title}</Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      Special Day • {d.type}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Events */}
              {dayEvents.map((e) => (
                <View key={e.id} style={[styles.detailItem, { borderColor: colors.border }]}>
                  <Compass size={18} color={colors.secondary} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '700' }}>{e.title}</Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      {e.startTime || 'All Day'} {e.description ? `• ${e.description}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDeleteEvent(e.id)}>
                    <Trash2 size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}

              {/* Tasks */}
              {dayTasks.map((t) => (
                <View key={t.id} style={[styles.detailItem, { borderColor: colors.border }]}>
                  <Pressable onPress={() => handleToggleTask(t)}>
                    {t.isCompleted ? (
                      <CheckSquare size={20} color={colors.primaryDark} />
                    ) : (
                      <Square size={20} color={colors.textSecondary} />
                    )}
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text
                      variant="body"
                      style={[
                        { fontWeight: '700' },
                        t.isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
                      ]}
                    >
                      {t.title}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      Task {t.description ? `• ${t.description}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDeleteTask(t.id)}>
                    <Trash2 size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}

              {/* Habits list progress */}
              {habits.map((h) => {
                const log = habitLogs.find((l) => l.habitId === h.id);
                const count = log ? log.count : 0;
                const completed = count >= h.targetCount;
                return (
                  <View key={h.id} style={[styles.detailItem, { borderColor: colors.border }]}>
                    <Plus size={18} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text variant="body" style={{ fontWeight: '700' }}>{h.name}</Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        Habit • {count} of {h.targetCount} targets {completed && '✨'}
                      </Text>
                    </View>
                    {!completed && (
                      <Pressable
                        onPress={() => handleIncrementHabit(h)}
                        style={[styles.smallPlusBtn, { backgroundColor: colors.primaryLight }]}
                      >
                        <Plus size={14} color={colors.text} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </View>
    );
  };

  // Rendering Helper: Tasks Tab
  const renderTasksTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Search Bar */}
        <View style={[styles.searchBar, { borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
          />
        </View>

        {/* Task Filters Segmented Control */}
        <View style={styles.taskFiltersRow}>
          {(['today', 'upcoming', 'completed'] as TaskFilter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setTaskFilter(f)}
              style={[
                styles.taskFilterBtn,
                taskFilter === f && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
            >
              <Text variant="caption" style={{ textTransform: 'capitalize', fontWeight: '700' }}>
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Add Task button */}
        <Button
          title="Add New Task"
          variant="outline"
          onPress={() => {
            setModalType('task');
            setFormDate(todayStr);
          }}
          style={styles.addTaskBtn}
        />

        {/* Tasks List */}
        {filteredTasksList.length === 0 ? (
          <Text variant="caption" color={colors.textSecondary} align="center" style={{ marginTop: Spacing.xl }}>
            No tasks found. Create a new one!
          </Text>
        ) : (
          <View style={styles.tasksList}>
            {filteredTasksList.map((t) => (
              <Card key={t.id} variant="outlined" style={styles.taskCard}>
                <View style={styles.taskCardHeader}>
                  <Pressable onPress={() => handleToggleTask(t)}>
                    {t.isCompleted ? (
                      <CheckSquare size={22} color={colors.primaryDark} />
                    ) : (
                      <Square size={22} color={colors.textSecondary} />
                    )}
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text
                      variant="body"
                      style={[
                        { fontWeight: '700' },
                        t.isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
                      ]}
                    >
                      {t.title}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      Due: {t.dueDate} {t.description ? `• ${t.description}` : ''}
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => {
                        setEditTargetId(t.id);
                        setFormTitle(t.title);
                        setFormDesc(t.description);
                        setFormDate(t.dueDate);
                        setModalType('task');
                      }}
                      style={{ marginRight: Spacing.sm }}
                    >
                      <Edit3 size={16} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteTask(t.id)}>
                      <Trash2 size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Rendering Helper: Goals Tab
  const renderGoalsTab = () => {
    const sixMonthsOut = formatDateStr(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000));

    const filteredGoals = goals.filter((g) => {
      if (goalFilter === 'active') return g.status === 'active' || g.status === 'paused';
      if (goalFilter === 'longterm') return g.targetDate > sixMonthsOut && g.status !== 'completed';
      if (goalFilter === 'completed') return g.status === 'completed';
      return true;
    });

    return (
      <View style={styles.tabContent}>
        {/* Filter Row */}
        <View style={styles.taskFiltersRow}>
          {([
            { key: 'active', label: 'Active' },
            { key: 'longterm', label: 'Long Term' },
            { key: 'completed', label: 'Completed' },
          ] as const).map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setGoalFilter(f.key)}
              style={[
                styles.taskFilterBtn,
                goalFilter === f.key && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
            >
              <Text variant="caption" style={{ fontWeight: '700' }}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          title="Add New Goal"
          variant="outline"
          onPress={() => {
            setModalType('goal');
            setFormDate(todayStr);
            setFormGoalStartDate(todayStr);
          }}
          style={styles.addTaskBtn}
        />

        {filteredGoals.length === 0 ? (
          <Text variant="caption" color={colors.textSecondary} align="center" style={{ marginTop: Spacing.xl }}>
            {goalFilter === 'completed' ? 'No completed goals yet. Keep going!' : 'No goals set. Plan one to start your journey!'}
          </Text>
        ) : (
          <View style={styles.goalsList}>
            {filteredGoals.map((goal) => {
              const goalMs = milestones.filter((m) => m.goalId === goal.id);
              const icon = getCategoryIcon(goal.category || 'Other');
              const bgColor = getCategoryBg(goal.category || 'Other');

              return (
                <Pressable key={goal.id} onPress={() => setDetailGoal(goal)}>
                  <Card variant="outlined" style={styles.goalCard}>
                    <View style={styles.goalCardHeader}>
                      {/* Category icon badge */}
                      <View style={[styles.goalIconBadge, { backgroundColor: bgColor }]}>
                        <Text style={styles.goalIconEmoji}>{icon}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <Text variant="caption" color={colors.textSecondary} style={{ textTransform: 'capitalize' }}>
                          {goal.category || 'Personal'}
                        </Text>
                        <Text variant="subtitle" style={{ fontWeight: '800' }}>
                          {goal.title}
                        </Text>
                      </View>
                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => {
                            setModalType('milestone');
                            setFormGoalId(goal.id);
                            setFormTitle('');
                          }}
                          style={{ marginRight: Spacing.md }}
                        >
                          <Plus size={18} color={colors.primaryDark} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteGoal(goal.id)}>
                          <Trash2 size={16} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.goalProgressRow}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: goal.status === 'completed' ? '#6CC76C' : colors.primary,
                              width: `${goal.progress ?? 0}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text variant="caption" style={{ fontWeight: '700', minWidth: 40, textAlign: 'right' }}>
                        {goal.targetValue
                          ? `${goal.currentValue}/${goal.targetValue}${goal.unit ? ` ${goal.unit}` : ''}`
                          : `${goal.progress ?? 0}%`}
                      </Text>
                    </View>

                    {/* Target Date chip */}
                    <Text variant="caption" color={colors.textSecondary}>
                      Target: {goal.targetDate} {goal.status === 'completed' ? '✅' : ''}
                    </Text>

                    {/* Milestones preview (max 3) */}
                    {goalMs.length > 0 && (
                      <View style={styles.milestonesList}>
                        {goalMs.slice(0, 3).map((ms) => (
                          <View key={ms.id} style={styles.milestoneRow}>
                            <Pressable onPress={() => handleToggleMilestone(ms)}>
                              {ms.isCompleted ? (
                                <CheckSquare size={14} color={colors.primaryDark} />
                              ) : (
                                <Square size={14} color={colors.textSecondary} />
                              )}
                            </Pressable>
                            <Text
                              variant="caption"
                              style={[
                                styles.milestoneTitle,
                                ms.isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
                              ]}
                            >
                              {ms.title}
                            </Text>
                          </View>
                        ))}
                        {goalMs.length > 3 && (
                          <Text variant="caption" color={colors.textSecondary}>
                            +{goalMs.length - 3} more milestones...
                          </Text>
                        )}
                      </View>
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Rendering Helper: Goal Detail Overlay
  const renderGoalDetail = () => {
    if (!detailGoal) return null;
    const goalMs = milestones.filter((m) => m.goalId === detailGoal.id);
    const icon = getCategoryIcon(detailGoal.category || 'Other');
    const bgColor = getCategoryBg(detailGoal.category || 'Other');

    return (
      <View style={styles.modalOverlay}>
        <Card variant="flat" style={[styles.detailCard, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.goalIconBadge, { backgroundColor: bgColor }]}>
              <Text style={styles.goalIconEmoji}>{icon}</Text>
            </View>
            <Text variant="subtitle" style={{ fontWeight: '800', flex: 1, marginLeft: Spacing.sm }}>
              {detailGoal.title}
            </Text>
            <Pressable onPress={() => setDetailGoal(null)} style={styles.modalCloseBtn}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Meta info */}
            <View style={styles.detailMetaRow}>
              <Text variant="caption" color={colors.textSecondary}>Start: {detailGoal.startDate}</Text>
              <Text variant="caption" color={colors.textSecondary}>Target: {detailGoal.targetDate}</Text>
              <Text variant="caption" color={colors.textSecondary} style={{ textTransform: 'capitalize' }}>
                Status: {detailGoal.status}
              </Text>
            </View>

            {detailGoal.description ? (
              <Text variant="body" color={colors.textSecondary} style={{ marginBottom: Spacing.md }}>
                {detailGoal.description}
              </Text>
            ) : null}

            {/* Progress Bar */}
            <View style={styles.goalProgressRow}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: detailGoal.status === 'completed' ? '#6CC76C' : colors.primary,
                      width: `${detailGoal.progress ?? 0}%`,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" style={{ fontWeight: '800', minWidth: 44, textAlign: 'right' }}>
                {detailGoal.targetValue
                  ? `${detailGoal.currentValue}/${detailGoal.targetValue}${detailGoal.unit ? ` ${detailGoal.unit}` : ''}`
                  : `${detailGoal.progress ?? 0}%`}
              </Text>
            </View>

            {/* Add Progress Section */}
            {detailGoal.status !== 'completed' && detailGoal.targetValue && (
              <View style={styles.progressInputRow}>
                <TextInput
                  placeholder={`Add ${detailGoal.unit || 'progress'}...`}
                  value={progressIncrement}
                  onChangeText={setProgressIncrement}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.progressInput, { borderColor: colors.border, color: colors.text }]}
                />
                <Pressable
                  onPress={() => {
                    const amount = parseFloat(progressIncrement);
                    if (!isNaN(amount) && amount > 0) {
                      handleAddProgress(amount);
                      setProgressIncrement('');
                    } else {
                      Alert.alert('Validation Error', 'Please enter a valid positive number.');
                    }
                  }}
                  style={[styles.progressAddBtn, { backgroundColor: colors.primaryLight }]}
                >
                  <Plus size={20} color={colors.primaryDark} />
                  <Text variant="caption" color={colors.primaryDark} style={{ fontWeight: '700' }}>
                    Add Progress
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Milestones Section */}
            {goalMs.length > 0 && (
              <View style={{ marginTop: Spacing.md }}>
                <Text variant="subtitle" style={{ fontWeight: '800', marginBottom: Spacing.sm }}>
                  Milestones
                </Text>
                <View style={styles.milestonesList}>
                  {goalMs.map((ms) => (
                    <View key={ms.id} style={styles.milestoneRow}>
                      <Pressable onPress={() => handleToggleMilestone(ms)}>
                        {ms.isCompleted ? (
                          <CheckSquare size={18} color={colors.primaryDark} />
                        ) : (
                          <Square size={18} color={colors.textSecondary} />
                        )}
                      </Pressable>
                      <Text
                        variant="body"
                        style={[
                          { flex: 1, marginLeft: Spacing.xs },
                          ms.isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
                        ]}
                      >
                        {ms.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Add Milestone */}
            <Button
              title="+ Add Milestone"
              variant="ghost"
              onPress={() => {
                setDetailGoal(null);
                setModalType('milestone');
                setFormGoalId(detailGoal.id);
                setFormTitle('');
              }}
              style={{ marginTop: Spacing.md }}
            />

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        </Card>
      </View>
    );
  };

  // Rendering Helper: Modal Forms
  const renderModalForm = () => {
    if (modalType === 'none') return null;

    let modalTitle = 'New Item';
    if (modalType === 'task') modalTitle = editTargetId ? 'Edit Task' : 'New Task';
    else if (modalType === 'event') modalTitle = 'New Event';
    else if (modalType === 'goal') modalTitle = 'New Goal';
    else if (modalType === 'milestone') modalTitle = 'New Milestone';

    return (
      <View style={styles.modalOverlay}>
        <Card variant="flat" style={[styles.modalCard, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text variant="subtitle" style={{ fontWeight: '800' }}>
              {modalTitle}
            </Text>
            <Pressable
              onPress={() => {
                setModalType('none');
                setEditTargetId(null);
                resetFormInputs();
              }}
              style={styles.modalCloseBtn}
            >
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Input label="Title" placeholder="Enter title..." value={formTitle} onChangeText={setFormTitle} />

            {modalType !== 'milestone' && (
              <>
                <Input
                  label="Description"
                  placeholder="Enter details..."
                  value={formDesc}
                  onChangeText={setFormDesc}
                />
                <Input
                  label="Date (YYYY-MM-DD)"
                  placeholder="e.g. 2026-08-05"
                  value={formDate}
                  onChangeText={setFormDate}
                />
              </>
            )}

            {modalType === 'event' && (
              <>
                <Input
                  label="Start Time (HH:MM)"
                  placeholder="e.g. 10:00"
                  value={formTime}
                  onChangeText={setFormTime}
                />
                <Input
                  label="Category"
                  placeholder="e.g. health, work, personal"
                  value={formCategory}
                  onChangeText={setFormCategory}
                />
              </>
            )}

            {modalType === 'goal' && (
              <>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: Spacing.xs }}>
                  Category
                </Text>
                <View style={styles.categoryPillsRow}>
                  {(['Academic', 'Career', 'Fitness', 'Health', 'Finance', 'Reading', 'Personal', 'Creative', 'Other'] as GoalCategory[]).map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setFormGoalCategory(cat)}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: formGoalCategory === cat ? colors.primaryLight : '#F5F2EB',
                          borderColor: formGoalCategory === cat ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text variant="caption">{getCategoryIcon(cat)} {cat}</Text>
                    </Pressable>
                  ))}
                </View>

                <Input
                  label="Start Date (YYYY-MM-DD)"
                  placeholder="e.g. 2026-08-05"
                  value={formGoalStartDate}
                  onChangeText={setFormGoalStartDate}
                />
                <Input
                  label="Target Value (optional)"
                  placeholder="e.g. 20"
                  keyboardType="numeric"
                  value={formGoalTargetValue}
                  onChangeText={setFormGoalTargetValue}
                />
                <Input
                  label="Unit (optional)"
                  placeholder="e.g. books, hours, kg"
                  value={formGoalUnit}
                  onChangeText={setFormGoalUnit}
                />
              </>
            )}

            <Button
              title="Save Record"
              variant="primary"
              onPress={handleSaveForm}
              style={{ marginTop: Spacing.md, marginBottom: Spacing.xl }}
            />
          </ScrollView>
        </Card>
      </View>
    );
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#FFFDF5' }]} edges={['top']}>
      {/* Top segments header */}
      <View style={styles.segmentsRow}>
        {(['calendar', 'tasks', 'goals'] as Segment[]).map((seg) => {
          const isActive = activeSegment === seg;
          return (
            <Pressable
              key={seg}
              onPress={() => setActiveSegment(seg)}
              style={[
                styles.segmentBtn,
                isActive && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
            >
              <Text
                variant="subtitle"
                color={isActive ? colors.primaryDark : colors.textSecondary}
                style={{ fontWeight: '700', textTransform: 'capitalize' }}
              >
                {seg}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xxl }} />
        ) : (
          <>
            {activeSegment === 'calendar' && renderCalendarTab()}
            {activeSegment === 'tasks' && renderTasksTab()}
            {activeSegment === 'goals' && renderGoalsTab()}
          </>
        )}
      </ScrollView>

      {/* Render overlay form modal */}
      {renderModalForm()}

      {/* Goal Detail overlay */}
      {detailGoal && renderGoalDetail()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#EAE6DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  tabContent: {
    gap: Spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  navArrow: {
    padding: Spacing.xs,
  },
  monthLabel: {
    fontWeight: '800',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayOfWeekText: {
    width: '14.28%',
    fontWeight: '700',
    opacity: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: Spacing.sm,
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  cellText: {
    fontSize: 14,
    fontWeight: '500',
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
    height: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.round,
  },
  detailsTray: {
    borderRadius: 24,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE6DB',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE6',
    paddingBottom: Spacing.xs,
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  trayAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
    backgroundColor: '#F3EFE6',
    gap: 2,
  },
  detailsList: {
    gap: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#FDFBF7',
  },
  smallPlusBtn: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.xs,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  taskFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  taskFilterBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: '#EAE6DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTaskBtn: {
    width: '100%',
  },
  tasksList: {
    gap: Spacing.sm,
  },
  taskCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalsList: {
    gap: Spacing.md,
  },
  goalCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: BorderRadius.round,
    backgroundColor: '#EAE6DB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.round,
  },
  milestonesList: {
    marginTop: Spacing.xs,
    paddingLeft: Spacing.sm,
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3EFE6',
    paddingTop: Spacing.sm,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  milestoneTitle: {
    flex: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(30, 28, 26, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  modalScroll: {
    marginTop: Spacing.xs,
  },
  detailCard: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  detailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  goalIconBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalIconEmoji: {
    fontSize: 20,
  },
  progressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  progressInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  progressAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  categoryPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
  },
});
