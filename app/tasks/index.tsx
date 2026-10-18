/**
 * Zeona — Task Management Screen
 *
 * Lightweight, personal task and priority manager:
 * - Today, Upcoming, and Completed filters
 * - Category and priority filters
 * - Search and sort options (by due date or priority)
 * - Due date and optional due time
 * - Immediate completion toggle with instant persistence and undo support
 * - Add/Edit task modals with duplicate-submission protection
 * - Delete confirmation modal
 * - Floating action button (FAB) for fast mobile & web task capture
 * - Integrated with shared useCalendarStore for unified Home and Calendar state
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { ZText, ZCard, ZBadge, ZButton } from '@/components/ui';
import { colors, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import {
  useCalendarStore,
  TASK_CATEGORY_CONFIG,
  TASK_PRIORITY_CONFIG,
} from '@/store/calendarStore';
import { triggerHaptic } from '@/utils/haptics';
import type { Task, TaskPriority, TaskCategory } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function getTomorrowISO(): string {
  const tmrw = new Date(Date.now() + 86400000);
  return `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(
    tmrw.getDate()
  ).padStart(2, '0')}`;
}

function formatTaskDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date';
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const TIME_PRESETS = ['None', '08:00 AM', '10:00 AM', '01:00 PM', '04:30 PM', '07:00 PM'];

type MainTab = 'today' | 'upcoming' | 'completed';
type SortOption = 'due_date' | 'priority' | 'alphabetical';

export default function TasksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ create?: string }>();
  const { tasks, fetchTasks, createTask, updateTask, toggleTask, deleteTask, isLoading } =
    useCalendarStore();

  const todayISO = useMemo(() => getTodayISO(), []);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<MainTab>('today');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('due_date');

  // Modal states
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Form input states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formCategory, setFormCategory] = useState<TaskCategory>('personal');
  const [formDueDate, setFormDueDate] = useState(todayISO);
  const [formDueTime, setFormDueTime] = useState<string>('None');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Undo feedback banner state
  const [undoBannerTask, setUndoBannerTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Open creation modal automatically if query param `create=true` was provided
  useEffect(() => {
    if (params?.create === 'true') {
      openCreateModal();
    }
  }, [params?.create]);

  // ─── Filtered & Sorted Tasks ───────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => {
      // Main tab separation
      if (activeTab === 'completed') {
        if (!t.is_completed) return false;
      } else if (activeTab === 'today') {
        if (t.is_completed) return false;
        // Include tasks due today or without due date or overdue
        if (t.due_date && t.due_date > todayISO) return false;
      } else if (activeTab === 'upcoming') {
        if (t.is_completed) return false;
        // Tasks due strictly after today
        if (!t.due_date || t.due_date <= todayISO) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityWeight: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      // default: due_date
      const dateA = a.due_date || '9999-99-99';
      const dateB = b.due_date || '9999-99-99';
      return dateA.localeCompare(dateB);
    });
  }, [tasks, activeTab, selectedCategory, searchQuery, sortBy, todayISO]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const todayCount = tasks.filter((t) => !t.is_completed && (!t.due_date || t.due_date <= todayISO)).length;
    const upcomingCount = tasks.filter((t) => !t.is_completed && t.due_date && t.due_date > todayISO).length;
    const completedCount = tasks.filter((t) => t.is_completed).length;
    return { today: todayCount, upcoming: upcomingCount, completed: completedCount };
  }, [tasks, todayISO]);

  // ─── Modal Openers ─────────────────────────────────────────────────────────

  const openCreateModal = () => {
    triggerHaptic();
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormPriority('medium');
    setFormCategory('personal');
    setFormDueDate(activeTab === 'upcoming' ? getTomorrowISO() : todayISO);
    setFormDueTime('None');
    setFormError(null);
    setIsFormVisible(true);
  };

  const openEditModal = (task: Task) => {
    triggerHaptic();
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormPriority(task.priority);
    setFormCategory((task.category as TaskCategory) || 'personal');
    setFormDueDate(task.due_date || todayISO);
    setFormDueTime(task.due_time || 'None');
    setFormError(null);
    setIsFormVisible(true);
  };

  const openDeleteModal = (task: Task) => {
    triggerHaptic();
    setTaskToDelete(task);
    setIsDeleteModalVisible(true);
  };

  // ─── Form Submission ───────────────────────────────────────────────────────

  const handleSaveTask = async () => {
    if (isSaving) return;
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError('Please enter a task title.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const taskPayload: Partial<Task> = {
      title: trimmedTitle,
      description: formDescription.trim() || null,
      priority: formPriority,
      category: formCategory,
      due_date: formDueDate || todayISO,
      due_time: formDueTime === 'None' ? null : formDueTime,
    };

    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskPayload);
      } else {
        await createTask(taskPayload);
      }
      triggerHaptic();
      setIsFormVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Could not save task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    triggerHaptic();
    const wasCompleted = task.is_completed;
    await toggleTask(task.id);

    // If task was newly completed, show temporary undo banner
    if (!wasCompleted) {
      setUndoBannerTask(task);
      setTimeout(() => {
        setUndoBannerTask((curr) => (curr?.id === task.id ? null : curr));
      }, 4500);
    }
  };

  const handleUndo = async () => {
    if (undoBannerTask) {
      triggerHaptic();
      await toggleTask(undoBannerTask.id);
      setUndoBannerTask(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      triggerHaptic();
      setIsDeleteModalVisible(false);
      setTaskToDelete(null);
    } catch {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Background gradient */}
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
          {/* ── Top Header Bar ─────────────────────────────────────────── */}
          <View style={styles.headerBar}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Pressable>

            <View style={{ flex: 1, marginLeft: spacing[2] }}>
              <ZText variant="headingLarge" color={colors.textBrand} style={{ fontWeight: '800' }}>
                Tasks
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Everyday priorities & focused rhythms
              </ZText>
            </View>

            <Pressable
              onPress={openCreateModal}
              hitSlop={8}
              style={styles.headerAddBtn}
              accessibilityRole="button"
              accessibilityLabel="Add new task"
            >
              <Ionicons name="add" size={18} color={colors.textInverse} />
              <ZText variant="label" color={colors.textInverse} style={{ fontSize: 13, fontWeight: '700' }}>
                New Task
              </ZText>
            </Pressable>
          </View>

          {/* ── Undo Toast Banner ──────────────────────────────────────── */}
          {undoBannerTask && (
            <View style={styles.undoBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.sage} />
              <ZText variant="bodySmall" color={colors.textPrimary} style={{ flex: 1 }}>
                Completed "{undoBannerTask.title}"
              </ZText>
              <Pressable onPress={handleUndo} style={styles.undoBtn} hitSlop={8}>
                <ZText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
                  Undo
                </ZText>
              </Pressable>
            </View>
          )}

          {/* ── Primary Filters: Today / Upcoming / Completed ─────────── */}
          <View style={styles.tabsRow}>
            {(['today', 'upcoming', 'completed'] as MainTab[]).map((tab) => {
              const isActive = activeTab === tab;
              const count = tabCounts[tab];
              const label =
                tab === 'today' ? 'Today' : tab === 'upcoming' ? 'Upcoming' : 'Completed';

              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    triggerHaptic();
                    setActiveTab(tab);
                  }}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <ZText
                    variant="label"
                    color={isActive ? colors.textInverse : colors.textSecondary}
                    style={{ fontWeight: isActive ? '700' : '600' }}
                  >
                    {label}
                  </ZText>
                  <View
                    style={[
                      styles.tabCountPill,
                      isActive ? styles.tabCountPillActive : styles.tabCountPillInactive,
                    ]}
                  >
                    <ZText
                      variant="caption"
                      color={isActive ? colors.primary : colors.textTertiary}
                      style={{ fontSize: 11, fontWeight: '700' }}
                    >
                      {count}
                    </ZText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* ── Search & Sort Bar ─────────────────────────────────────── */}
          <View style={styles.searchSortRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={17} color={colors.textTertiary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search tasks..."
                placeholderTextColor={colors.textTertiary}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* Sort Dropdown / Cycle button */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                setSortBy((prev) =>
                  prev === 'due_date'
                    ? 'priority'
                    : prev === 'priority'
                    ? 'alphabetical'
                    : 'due_date'
                );
              }}
              style={styles.sortToggleBtn}
              accessibilityRole="button"
              accessibilityLabel={`Sort by: ${sortBy.replace('_', ' ')}`}
            >
              <Ionicons name="swap-vertical" size={15} color={colors.textSecondary} />
              <ZText variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', fontSize: 12 }}>
                {sortBy === 'due_date' ? 'Date' : sortBy === 'priority' ? 'Priority' : 'A-Z'}
              </ZText>
            </Pressable>
          </View>

          {/* ── Category Filter Chips ─────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <Pressable
              onPress={() => {
                triggerHaptic();
                setSelectedCategory('all');
              }}
              style={[
                styles.catFilterChip,
                selectedCategory === 'all' && styles.catFilterChipActive,
              ]}
            >
              <ZText
                variant="caption"
                color={selectedCategory === 'all' ? colors.textInverse : colors.textSecondary}
                style={{ fontWeight: selectedCategory === 'all' ? '700' : '600' }}
              >
                All Categories
              </ZText>
            </Pressable>

            {(Object.keys(TASK_CATEGORY_CONFIG) as TaskCategory[]).map((cat) => {
              const cfg = TASK_CATEGORY_CONFIG[cat];
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedCategory(cat);
                  }}
                  style={[
                    styles.catFilterChip,
                    isSelected && { backgroundColor: cfg.color, borderColor: cfg.color },
                  ]}
                >
                  <Ionicons
                    name={cfg.icon as any}
                    size={13}
                    color={isSelected ? colors.textInverse : cfg.color}
                    style={{ marginRight: 4 }}
                  />
                  <ZText
                    variant="caption"
                    color={isSelected ? colors.textInverse : colors.textSecondary}
                    style={{ fontWeight: isSelected ? '700' : '600' }}
                  >
                    {cfg.label}
                  </ZText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Tasks List ────────────────────────────────────────────── */}
          <View style={styles.taskListContainer}>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const categoryCfg = task.category
                  ? TASK_CATEGORY_CONFIG[task.category as TaskCategory]
                  : null;
                const priorityCfg = TASK_PRIORITY_CONFIG[task.priority] || TASK_PRIORITY_CONFIG.medium;

                return (
                  <ZCard
                    key={task.id}
                    elevation="xs"
                    radius={radii.xl}
                    style={styles.taskCardItem}
                  >
                    {/* Completion Checkbox */}
                    <Pressable
                      onPress={() => handleToggleTask(task)}
                      style={[
                        styles.checkboxWrap,
                        task.is_completed && styles.checkboxWrapCompleted,
                      ]}
                      hitSlop={8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: task.is_completed }}
                      accessibilityLabel={`Mark "${task.title}" as ${task.is_completed ? 'incomplete' : 'complete'}`}
                    >
                      {task.is_completed && (
                        <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                      )}
                    </Pressable>

                    {/* Task Details */}
                    <View style={styles.taskMainCol}>
                      <View style={styles.titleRow}>
                        <ZText
                          variant="bodyMedium"
                          color={task.is_completed ? colors.textTertiary : colors.textPrimary}
                          style={[
                            styles.taskTitleText,
                            task.is_completed && styles.strikethrough,
                          ]}
                        >
                          {task.title}
                        </ZText>
                      </View>

                      {task.description ? (
                        <ZText
                          variant="caption"
                          color={colors.textSecondary}
                          style={[task.is_completed && styles.strikethrough]}
                          numberOfLines={2}
                        >
                          {task.description}
                        </ZText>
                      ) : null}

                      {/* Metadata Row: Date, Time, Category, Priority */}
                      <View style={styles.metaRow}>
                        {/* Due Date & Time */}
                        <View style={styles.dateMetaPill}>
                          <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
                          <ZText variant="caption" color={colors.textTertiary} style={{ fontSize: 11.5 }}>
                            {formatTaskDate(task.due_date)}
                            {task.due_time ? ` • ${task.due_time}` : ''}
                          </ZText>
                        </View>

                        {/* Category */}
                        {categoryCfg && (
                          <View
                            style={[
                              styles.categoryBadge,
                              { backgroundColor: categoryCfg.bg, borderColor: categoryCfg.borderColor },
                            ]}
                          >
                            <Ionicons
                              name={categoryCfg.icon as any}
                              size={11}
                              color={categoryCfg.color}
                              style={{ marginRight: 3 }}
                            />
                            <ZText
                              variant="caption"
                              color={categoryCfg.color}
                              style={{ fontSize: 11, fontWeight: '700' }}
                            >
                              {categoryCfg.label}
                            </ZText>
                          </View>
                        )}

                        {/* Priority */}
                        <View style={[styles.priorityBadge, { backgroundColor: priorityCfg.bg }]}>
                          <Ionicons
                            name={priorityCfg.icon as any}
                            size={11}
                            color={priorityCfg.color}
                            style={{ marginRight: 3 }}
                          />
                          <ZText
                            variant="caption"
                            color={priorityCfg.color}
                            style={{ fontSize: 11, fontWeight: '700' }}
                          >
                            {priorityCfg.label}
                          </ZText>
                        </View>
                      </View>
                    </View>

                    {/* Action buttons (Edit & Delete) */}
                    <View style={styles.taskActionsCol}>
                      {!task.is_completed ? (
                        <Pressable
                          onPress={() => openEditModal(task)}
                          style={styles.iconBtn}
                          hitSlop={8}
                          accessibilityLabel="Edit task"
                        >
                          <Ionicons name="pencil-outline" size={17} color={colors.textSecondary} />
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => handleToggleTask(task)}
                          style={styles.iconBtn}
                          hitSlop={8}
                          accessibilityLabel="Undo completion"
                        >
                          <Ionicons name="arrow-undo-outline" size={17} color={colors.primary} />
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => openDeleteModal(task)}
                        style={styles.iconBtn}
                        hitSlop={8}
                        accessibilityLabel="Delete task"
                      >
                        <Ionicons name="trash-outline" size={17} color={colors.error} />
                      </Pressable>
                    </View>
                  </ZCard>
                );
              })
            ) : (
              /* Empty state */
              <ZCard elevation="xs" radius={radii.xl} style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name={
                      activeTab === 'completed'
                        ? 'checkmark-done-circle-outline'
                        : activeTab === 'upcoming'
                        ? 'time-outline'
                        : 'leaf-outline'
                    }
                    size={32}
                    color={colors.primary}
                  />
                </View>

                <ZText variant="headingSmall" color={colors.textPrimary} align="center">
                  {activeTab === 'completed'
                    ? 'No completed tasks yet'
                    : activeTab === 'upcoming'
                    ? 'No upcoming tasks'
                    : 'All clear for today! 🌸'}
                </ZText>

                <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ maxWidth: 300 }}>
                  {activeTab === 'completed'
                    ? 'When you check off to-dos, they will appear here with instant undo support.'
                    : activeTab === 'upcoming'
                    ? 'Plan ahead by scheduling tasks for tomorrow and future days.'
                    : 'Take a restful breath, or capture a gentle priority to guide your hours.'}
                </ZText>

                {activeTab !== 'completed' && (
                  <ZButton
                    label="Add a Task"
                    variant="primary"
                    size="sm"
                    leftIcon={<Ionicons name="add" size={16} color={colors.textInverse} />}
                    onPress={openCreateModal}
                    style={{ marginTop: spacing[2] }}
                  />
                )}
              </ZCard>
            )}
          </View>

          <View style={{ height: spacing[16] }} />
        </View>
      </ScrollView>

      {/* ── Floating Action Button (FAB) ─────────────────────────────────── */}
      <Pressable
        onPress={openCreateModal}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Create task"
      >
        <Ionicons name="add" size={26} color={colors.textInverse} />
      </Pressable>

      {/* ── ADD / EDIT TASK MODAL ────────────────────────────────────────── */}
      <Modal
        visible={isFormVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !isSaving && setIsFormVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <ZText variant="headingMedium" color={colors.textBrand}>
                  {editingTask ? 'Edit Task' : 'Add Task'}
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  {editingTask ? 'Update priority and schedule' : 'Keep your day clear and intentional'}
                </ZText>
              </View>
              <Pressable
                onPress={() => !isSaving && setIsFormVisible(false)}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[4] }}
              showsVerticalScrollIndicator={false}
            >
              {/* Validation Error banner */}
              {formError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <ZText variant="caption" color={colors.error} style={{ flex: 1, fontWeight: '600' }}>
                    {formError}
                  </ZText>
                </View>
              )}

              {/* Title Input */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Task Title *
                </ZText>
                <TextInput
                  value={formTitle}
                  onChangeText={(text) => {
                    setFormTitle(text);
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g. Read 20 pages of wellness book, Biology quiz prep"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.textInput}
                />
              </View>

              {/* Description Input */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Notes / Description (Optional)
                </ZText>
                <TextInput
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Add details, links, or checklist reminders..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={2}
                  style={[styles.textInput, styles.textArea]}
                />
              </View>

              {/* Category Picker */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Category
                </ZText>
                <View style={styles.chipsRowWrap}>
                  {(Object.keys(TASK_CATEGORY_CONFIG) as TaskCategory[]).map((cat) => {
                    const cfg = TASK_CATEGORY_CONFIG[cat];
                    const isSelected = formCategory === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => {
                          triggerHaptic();
                          setFormCategory(cat);
                        }}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isSelected ? cfg.color : cfg.bg,
                            borderColor: cfg.borderColor,
                          },
                        ]}
                      >
                        <Ionicons
                          name={cfg.icon as any}
                          size={13}
                          color={isSelected ? colors.textInverse : cfg.color}
                          style={{ marginRight: 4 }}
                        />
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.textInverse : cfg.color}
                          style={{ fontWeight: isSelected ? '700' : '600', fontSize: 12 }}
                        >
                          {cfg.label}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Priority Picker */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Priority
                </ZText>
                <View style={styles.chipsRowWrap}>
                  {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
                    const cfg = TASK_PRIORITY_CONFIG[p];
                    const isSelected = formPriority === p;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => {
                          triggerHaptic();
                          setFormPriority(p);
                        }}
                        style={[
                          styles.priorityChip,
                          isSelected && { backgroundColor: cfg.color, borderColor: cfg.color },
                        ]}
                      >
                        <Ionicons
                          name={cfg.icon as any}
                          size={13}
                          color={isSelected ? colors.textInverse : cfg.color}
                          style={{ marginRight: 4 }}
                        />
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.textInverse : colors.textPrimary}
                          style={{ fontWeight: isSelected ? '700' : '600', fontSize: 12 }}
                        >
                          {cfg.label}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Due Date Input & Quick Presets */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Due Date
                </ZText>
                <View style={styles.quickDateRow}>
                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      setFormDueDate(todayISO);
                    }}
                    style={[styles.datePill, formDueDate === todayISO && styles.datePillActive]}
                  >
                    <ZText
                      variant="caption"
                      color={formDueDate === todayISO ? colors.textInverse : colors.textPrimary}
                      style={{ fontWeight: '600' }}
                    >
                      Today
                    </ZText>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      setFormDueDate(getTomorrowISO());
                    }}
                    style={[styles.datePill, formDueDate === getTomorrowISO() && styles.datePillActive]}
                  >
                    <ZText
                      variant="caption"
                      color={formDueDate === getTomorrowISO() ? colors.textInverse : colors.textPrimary}
                      style={{ fontWeight: '600' }}
                    >
                      Tomorrow
                    </ZText>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      const d3 = new Date(Date.now() + 86400000 * 3);
                      setFormDueDate(
                        `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}-${String(
                          d3.getDate()
                        ).padStart(2, '0')}`
                      );
                    }}
                    style={styles.datePill}
                  >
                    <ZText variant="caption" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                      In 3 days
                    </ZText>
                  </Pressable>
                </View>

                <TextInput
                  value={formDueDate}
                  onChangeText={setFormDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.textInput, { marginTop: spacing[1] }]}
                />
              </View>

              {/* Due Time Selector */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Due Time (Optional)
                </ZText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScroll}>
                  {TIME_PRESETS.map((t) => {
                    const isSelected = formDueTime === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => {
                          triggerHaptic();
                          setFormDueTime(t);
                        }}
                        style={[styles.timeChip, isSelected && styles.timeChipActive]}
                      >
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.textInverse : colors.textSecondary}
                          style={{ fontWeight: isSelected ? '700' : '500' }}
                        >
                          {t}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalBtnRow}>
              <ZButton
                label="Cancel"
                variant="ghost"
                size="md"
                onPress={() => !isSaving && setIsFormVisible(false)}
                disabled={isSaving}
                style={{ flex: 1 }}
              />
              <ZButton
                label={editingTask ? 'Update Task' : 'Save Task'}
                variant="primary"
                size="md"
                isLoading={isSaving}
                onPress={handleSaveTask}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      <Modal
        visible={isDeleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 400 }]}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash-outline" size={26} color={colors.error} />
            </View>

            <ZText variant="headingMedium" color={colors.textPrimary} align="center">
              Delete Task?
            </ZText>
            <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ marginTop: 4 }}>
              Are you sure you want to remove "{taskToDelete?.title}"? This cannot be undone.
            </ZText>

            <View style={[styles.modalBtnRow, { marginTop: spacing[4] }]}>
              <ZButton
                label="Keep Task"
                variant="secondary"
                size="md"
                onPress={() => setIsDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <ZButton
                label="Delete"
                variant="danger"
                size="md"
                onPress={handleConfirmDelete}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: spacing[3.5],
  },

  /* Header */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    ...shadows.xs,
  },

  /* Undo Banner */
  undoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.xl,
    ...shadows.xs,
  },
  undoBtn: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* Main Tab Buttons */
  tabsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing[2.5],
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  tabCountPillActive: {
    backgroundColor: colors.surface,
  },
  tabCountPillInactive: {
    backgroundColor: colors.backgroundMuted,
  },

  /* Search & Sort */
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 42,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 42,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* Category Scroll */
  categoryScroll: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  catFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  /* Tasks List */
  taskListContainer: {
    gap: spacing[2.5],
    marginTop: spacing[1],
  },
  taskCardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3.5],
    gap: spacing[3],
  },
  checkboxWrap: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 1.8,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: colors.surface,
  },
  checkboxWrapCompleted: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  taskMainCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitleText: {
    fontWeight: '600',
    fontSize: 15,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: 2,
  },
  dateMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radii.full,
  },
  taskActionsCol: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundMuted,
  },

  /* Empty Card */
  emptyCard: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },

  /* Floating Action Button */
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[6],
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 20, 37, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: spacing[2.5],
    borderRadius: radii.lg,
  },
  formGroup: {
    gap: spacing[1.5],
  },
  textInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3.5],
    fontSize: 15,
    fontFamily: fontFamilies.sans,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  textArea: {
    height: 70,
    paddingTop: spacing[2.5],
    textAlignVertical: 'top',
  },
  chipsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  datePill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.backgroundMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeScroll: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  timeChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.backgroundMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  deleteIconCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
});
