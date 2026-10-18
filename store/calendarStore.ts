/**
 * Zeona — Calendar, Tasks & Habits Store (Zustand + Supabase + AsyncStorage)
 * Manages daily tasks, habit streaks, and important calendar dates/events.
 * Persists to Supabase table 'calendar_events' when authenticated,
 * with resilient offline fallback to AsyncStorage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useHabitStore } from '@/store/habitStore';
import type { Task, TaskPriority, TaskCategory, Habit, CalendarEvent, CalendarEventType } from '@/types';

const TASKS_STORAGE_KEY = 'zeona_tasks_v1';
const HABITS_STORAGE_KEY = 'zeona_habits_v1';
const GUEST_EVENTS_STORAGE_KEY = 'zeona_guest_events_v1';

export const TASK_CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; icon: string; color: string; bg: string; borderColor: string }
> = {
  wellness: {
    label: 'Wellness',
    icon: 'leaf-outline',
    color: '#059669',
    bg: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  personal: {
    label: 'Personal',
    icon: 'sparkles-outline',
    color: '#7c3aed',
    bg: '#faf5ff',
    borderColor: '#ede9fe',
  },
  work: {
    label: 'Work & Study',
    icon: 'briefcase-outline',
    color: '#0284c7',
    bg: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  home: {
    label: 'Home & Life',
    icon: 'home-outline',
    color: '#d97706',
    bg: '#fffbeb',
    borderColor: '#fde68a',
  },
  growth: {
    label: 'Mind & Growth',
    icon: 'book-outline',
    color: '#e11d48',
    bg: '#fff1f2',
    borderColor: '#fecdd3',
  },
};

export const TASK_PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; icon: string; color: string; bg: string }
> = {
  high: { label: 'High Priority', icon: 'flame-outline', color: '#e11d48', bg: '#fff1f2' },
  medium: { label: 'Medium', icon: 'remove-outline', color: '#d97706', bg: '#fffbeb' },
  low: { label: 'Low', icon: 'leaf-outline', color: '#059669', bg: '#f0fdf4' },
};

export const EVENT_CATEGORY_CONFIG: Record<
  CalendarEventType,
  { label: string; icon: string; color: string; bg: string; borderColor: string }
> = {
  birthday: {
    label: 'Birthday',
    icon: 'gift-outline',
    color: '#e11d48',
    bg: '#fff1f2',
    borderColor: '#fecdd3',
  },
  anniversary: {
    label: 'Anniversary',
    icon: 'heart-outline',
    color: '#c026d3',
    bg: '#fdf4ff',
    borderColor: '#f5d0fe',
  },
  exam: {
    label: 'Exam & Test',
    icon: 'school-outline',
    color: '#d97706',
    bg: '#fffbeb',
    borderColor: '#fde68a',
  },
  milestone: {
    label: 'Personal Milestone',
    icon: 'trophy-outline',
    color: '#059669',
    bg: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  reminder: {
    label: 'Gentle Reminder',
    icon: 'alarm-outline',
    color: '#7c3aed',
    bg: '#faf5ff',
    borderColor: '#ede9fe',
  },
  event: {
    label: 'Event & Outing',
    icon: 'calendar-outline',
    color: '#0284c7',
    bg: '#f0f9ff',
    borderColor: '#bae6fd',
  },
};

const SEED_TASKS: Task[] = [
  {
    id: 'task-1',
    user_id: 'local-user',
    title: 'Morning lavender tea & mindful breathing',
    description: '10 minutes of screen-free stillness',
    is_completed: true,
    priority: 'low',
    category: 'wellness',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '08:00 AM',
    completed_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    user_id: 'local-user',
    title: 'Write 3 things I am grateful for',
    description: 'Capture in Zeona daily journal',
    is_completed: false,
    priority: 'medium',
    category: 'growth',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '09:30 AM',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-3',
    user_id: 'local-user',
    title: 'Evening walk & stretch under open skies',
    description: 'Unwind and leave work behind',
    is_completed: false,
    priority: 'low',
    category: 'wellness',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '06:00 PM',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-4',
    user_id: 'local-user',
    title: 'Review exam study notes for chapters 4 to 8',
    description: 'Prepare flashcards and review formula summary',
    is_completed: false,
    priority: 'high',
    category: 'work',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    due_time: '02:00 PM',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-5',
    user_id: 'local-user',
    title: 'Water indoor plants & fresh flowers',
    description: 'Orchids and lavender pots near sunlight window',
    is_completed: false,
    priority: 'low',
    category: 'home',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    due_time: '10:00 AM',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_HABITS: Habit[] = [
  {
    id: 'habit-1',
    user_id: 'local-user',
    title: 'Drink 2L water',
    description: 'Keep skin glowing and energy high',
    frequency: 'daily',
    color: '#38bdf8',
    icon: 'water-outline',
    streak_count: 7,
    created_at: new Date().toISOString(),
  },
  {
    id: 'habit-2',
    user_id: 'local-user',
    title: 'Daily Journaling',
    description: 'Reflect before sleeping',
    frequency: 'daily',
    color: '#8b5cf6',
    icon: 'book-outline',
    streak_count: 12,
    created_at: new Date().toISOString(),
  },
  {
    id: 'habit-3',
    user_id: 'local-user',
    title: 'Gentle Movement',
    description: 'Yoga or evening walk',
    frequency: 'daily',
    color: '#4ade80',
    icon: 'fitness-outline',
    streak_count: 5,
    created_at: new Date().toISOString(),
  },
];

const SEED_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    user_id: 'local-user',
    title: 'Self-Care Sunday Spa 🌸',
    description: 'Face masks, reading, and botanical bath',
    event_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    event_time: '11:00 AM',
    event_type: 'milestone',
    has_reminder: true,
    reminder_time: '1_hour_before',
    is_recurring: true,
    recurrence_rule: 'weekly',
    color: '#059669',
    created_at: new Date().toISOString(),
  },
  {
    id: 'evt-2',
    user_id: 'local-user',
    title: 'Aria’s Birthday Celebration 🎂',
    description: 'Send botanical card and love',
    event_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    event_time: '06:30 PM',
    event_type: 'birthday',
    has_reminder: true,
    reminder_time: '1_day_before',
    is_recurring: false,
    recurrence_rule: null,
    color: '#e11d48',
    created_at: new Date().toISOString(),
  },
  {
    id: 'evt-3',
    user_id: 'local-user',
    title: 'Semester Final Exam 📝',
    description: 'Review chapters 4-8 beforehand',
    event_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    event_time: '09:00 AM',
    event_type: 'exam',
    has_reminder: true,
    reminder_time: '1_day_before',
    is_recurring: false,
    recurrence_rule: null,
    color: '#d97706',
    created_at: new Date().toISOString(),
  },
];

interface CalendarState {
  tasks: Task[];
  habits: Habit[];
  events: CalendarEvent[];
  selectedDate: string; // YYYY-MM-DD
  activeHabitLog: Record<string, boolean>; // habitId_YYYY-MM-DD -> completed
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  createTask: (taskData: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  toggleTask: (id: string) => Promise<void>;
  addTask: (title: string, priority?: TaskPriority) => void;
  deleteTask: (id: string) => Promise<void>;
  toggleHabitToday: (habitId: string) => void;
  addHabit: (title: string, description?: string, color?: string, icon?: string) => void;
  addEvent: (eventData: Partial<CalendarEvent>) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<CalendarEvent | null>;
  deleteEvent: (id: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  clearError: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  tasks: SEED_TASKS,
  habits: SEED_HABITS,
  events: SEED_EVENTS,
  selectedDate: new Date().toISOString().split('T')[0],
  activeHabitLog: {
    [`habit-1_${new Date().toISOString().split('T')[0]}`]: true,
    [`habit-2_${new Date().toISOString().split('T')[0]}`]: true,
  },
  isLoading: false,
  error: null,

  initialize: async () => {
    // 1. Fetch habits via useHabitStore
    try {
      await useHabitStore.getState().fetchHabits();
      const habitState = useHabitStore.getState();
      const habitLogMap: Record<string, boolean> = {};
      for (const log of habitState.logs) {
        habitLogMap[`${log.habit_id}_${log.logged_date}`] = true;
      }
      set({
        habits: habitState.habits,
        activeHabitLog: habitLogMap,
      });
    } catch {
      // Fallback
    }

    // 2. Fetch tasks and events concurrently
    await Promise.all([get().fetchTasks(), get().fetchEvents()]);
  },

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_events_${user.id}` : GUEST_EVENTS_STORAGE_KEY;

    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .order('event_date', { ascending: true });

        if (!error && data && data.length > 0) {
          set({ events: data, isLoading: false });
          AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
          return;
        }
      } catch (err) {
        console.warn('[Zeona Calendar] Supabase query notice:', err);
      }
    }

    try {
      const localJson = await AsyncStorage.getItem(storageKey);
      const localEvents: CalendarEvent[] = localJson ? JSON.parse(localJson) : SEED_EVENTS;
      set({ events: localEvents, isLoading: false });
    } catch {
      set({ events: SEED_EVENTS, isLoading: false });
    }
  },

  fetchTasks: async () => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_tasks_${user.id}` : TASKS_STORAGE_KEY;

    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true });

        if (!error && data && data.length > 0) {
          set({ tasks: data });
          AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
          return;
        }
      } catch (err) {
        console.warn('[Zeona Tasks] Supabase query notice:', err);
      }
    }

    try {
      const localJson = await AsyncStorage.getItem(storageKey);
      if (localJson) {
        set({ tasks: JSON.parse(localJson) });
      } else {
        set({ tasks: SEED_TASKS });
        AsyncStorage.setItem(storageKey, JSON.stringify(SEED_TASKS)).catch(() => {});
      }
    } catch {
      set({ tasks: SEED_TASKS });
    }
  },

  createTask: async (taskData: Partial<Task>) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_tasks_${user.id}` : TASKS_STORAGE_KEY;

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: user?.id || 'local-user',
      title: taskData.title?.trim() || 'Untitled task',
      description: taskData.description?.trim() || null,
      is_completed: false,
      priority: taskData.priority || 'medium',
      category: taskData.category || 'personal',
      due_date: taskData.due_date || new Date().toISOString().split('T')[0],
      due_time: taskData.due_time || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextTasks = [newTask, ...get().tasks];
    set({ tasks: nextTasks });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextTasks)).catch(() => {});

    if (supabase && user) {
      try {
        await supabase.from('tasks').insert(newTask);
      } catch (err) {
        console.warn('[Zeona Tasks] Supabase insert notice:', err);
      }
    }

    return newTask;
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_tasks_${user.id}` : TASKS_STORAGE_KEY;

    let updatedTask: Task | null = null;
    const nextTasks = get().tasks.map((t) => {
      if (t.id === id) {
        updatedTask = {
          ...t,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return updatedTask;
      }
      return t;
    });

    if (updatedTask) {
      set({ tasks: nextTasks });
      AsyncStorage.setItem(storageKey, JSON.stringify(nextTasks)).catch(() => {});

      if (supabase && user) {
        try {
          await supabase.from('tasks').update(updates).eq('id', id).eq('user_id', user.id);
        } catch (err) {
          console.warn('[Zeona Tasks] Supabase update notice:', err);
        }
      }
    }

    return updatedTask;
  },

  toggleTask: async (id: string) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_tasks_${user.id}` : TASKS_STORAGE_KEY;

    let updatedItem: Task | null = null;
    const nextTasks = get().tasks.map((t) => {
      if (t.id === id) {
        const nextDone = !t.is_completed;
        updatedItem = {
          ...t,
          is_completed: nextDone,
          completed_at: nextDone ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        };
        return updatedItem;
      }
      return t;
    });

    set({ tasks: nextTasks });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextTasks)).catch(() => {});

    if (supabase && user && updatedItem) {
      try {
        await supabase
          .from('tasks')
          .update({
            is_completed: (updatedItem as Task).is_completed,
            completed_at: (updatedItem as Task).completed_at,
          })
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Tasks] Supabase toggle notice:', err);
      }
    }
  },

  deleteTask: async (id: string) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_tasks_${user.id}` : TASKS_STORAGE_KEY;

    const nextTasks = get().tasks.filter((t) => t.id !== id);
    set({ tasks: nextTasks });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextTasks)).catch(() => {});

    if (supabase && user) {
      try {
        await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Tasks] Supabase delete notice:', err);
      }
    }
  },

  addTask: (title: string, priority: TaskPriority = 'medium') => {
    get().createTask({
      title,
      priority,
      due_date: get().selectedDate,
      category: 'personal',
    });
  },

  toggleHabitToday: async (habitId: string) => {
    const isNowDone = await useHabitStore.getState().toggleHabitDate(habitId, get().selectedDate);
    const dateKey = `${habitId}_${get().selectedDate}`;
    const nextLog = { ...get().activeHabitLog, [dateKey]: isNowDone };
    set({
      activeHabitLog: nextLog,
      habits: useHabitStore.getState().habits,
    });
  },

  addHabit: async (title: string, description = '', color = '#8b5cf6', icon = 'sparkles-outline') => {
    if (!title.trim()) return;
    await useHabitStore.getState().createHabit({ title, description, color, icon });
    set({ habits: useHabitStore.getState().habits });
  },

  addEvent: async (eventData: Partial<CalendarEvent>) => {
    if (!eventData.title?.trim()) return null;

    const user = useAuthStore.getState().user;
    const userId = user ? user.id : 'guest-user';
    const storageKey = user ? `zeona_events_${user.id}` : GUEST_EVENTS_STORAGE_KEY;

    const type = eventData.event_type || 'event';
    const config = EVENT_CATEGORY_CONFIG[type];

    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      title: eventData.title.trim(),
      description: eventData.description?.trim() || null,
      event_date: eventData.event_date || get().selectedDate,
      event_time: eventData.event_time?.trim() || null,
      event_type: type,
      has_reminder: Boolean(eventData.has_reminder),
      reminder_time: eventData.has_reminder ? (eventData.reminder_time || '15_min_before') : null,
      is_recurring: Boolean(eventData.is_recurring),
      recurrence_rule: eventData.recurrence_rule || null,
      color: eventData.color || config.color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Sync to Supabase if authenticated
    if (supabase && user) {
      try {
        const { error } = await supabase.from('calendar_events').insert([newEvent]);
        if (error) {
          console.warn('[Zeona Calendar] Supabase insert notice:', error.message);
        }
      } catch (err) {
        console.warn('[Zeona Calendar] Supabase insert error:', err);
      }
    }

    // 2. Update local state
    const nextEvents = [newEvent, ...get().events];
    set({ events: nextEvents });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextEvents)).catch(() => {});

    return newEvent;
  },

  updateEvent: async (id: string, updates: Partial<CalendarEvent>) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_events_${user.id}` : GUEST_EVENTS_STORAGE_KEY;

    const updatedEvents = get().events.map((evt) => {
      if (evt.id === id) {
        const nextType = updates.event_type || evt.event_type;
        const config = EVENT_CATEGORY_CONFIG[nextType];
        return {
          ...evt,
          ...updates,
          color: updates.color || config.color,
          updated_at: new Date().toISOString(),
        };
      }
      return evt;
    });

    const updated = updatedEvents.find((e) => e.id === id) || null;
    set({ events: updatedEvents });

    // Sync to Supabase
    if (supabase && user && updated) {
      try {
        await supabase
          .from('calendar_events')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Calendar] Supabase update error:', err);
      }
    }

    AsyncStorage.setItem(storageKey, JSON.stringify(updatedEvents)).catch(() => {});
    return updated;
  },

  deleteEvent: async (id: string) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_events_${user.id}` : GUEST_EVENTS_STORAGE_KEY;

    const updatedEvents = get().events.filter((evt) => evt.id !== id);
    set({ events: updatedEvents });

    // Sync to Supabase
    if (supabase && user) {
      try {
        await supabase
          .from('calendar_events')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Calendar] Supabase delete error:', err);
      }
    }

    AsyncStorage.setItem(storageKey, JSON.stringify(updatedEvents)).catch(() => {});
  },

  setSelectedDate: (selectedDate: string) => set({ selectedDate }),
  clearError: () => set({ error: null }),
}));
