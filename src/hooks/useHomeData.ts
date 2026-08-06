import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { UserRepository } from '../services/firebase/repositories/userRepository';
import { TaskRepository } from '../services/firebase/repositories/taskRepository';
import { HabitRepository } from '../services/firebase/repositories/habitRepository';
import { EventRepository } from '../services/firebase/repositories/eventRepository';
import { MoodRepository } from '../services/firebase/repositories/moodRepository';
import { UserProfile, Task, Habit, HabitLog, Event, Mood } from '../types/models';

export interface AggregatedHomeData {
  profile: UserProfile | null;
  todayMood: Mood | null;
  tasks: Task[];
  events: Event[];
  habits: Habit[];
  habitLogs: HabitLog[];
}

export function useHomeData() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [data, setData] = useState<AggregatedHomeData>({
    profile: null,
    todayMood: null,
    tasks: [],
    events: [],
    habits: [],
    habitLogs: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get today's local date string YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchHomeData = useCallback(async (isRefresh = false) => {
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const dateStr = getTodayDateString();

    try {
      // Parallel reads to minimize latency
      const [
        profile,
        todayMoods,
        tasks,
        events,
        habits,
        habitLogs,
      ] = await Promise.all([
        UserRepository.getUserProfile(userId),
        MoodRepository.getMoods(userId, dateStr, dateStr),
        TaskRepository.getTasksForDate(userId, dateStr),
        EventRepository.getEventsForRange(userId, dateStr, dateStr),
        HabitRepository.getHabits(userId),
        HabitRepository.getHabitLogsForDate(userId, dateStr),
      ]);

      // Moods range query for today returns an array. We take the first one if present.
      const todayMood = todayMoods.length > 0 ? todayMoods[0] : null;

      setData({
        profile,
        todayMood,
        tasks,
        events,
        habits,
        habitLogs,
      });
    } catch (e) {
      setError((e as Error).message || 'Failed to retrieve home dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHomeData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchHomeData]);

  const handleRefresh = useCallback(() => {
    fetchHomeData(true);
  }, [fetchHomeData]);

  return {
    data,
    loading,
    refreshing,
    error,
    refetch: fetchHomeData,
    handleRefresh,
    todayDateStr: getTodayDateString(),
  };
}
