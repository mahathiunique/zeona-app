/**
 * Zeona — Memory Store (Zustand + Supabase + AsyncStorage)
 *
 * Full memory persistence, private image gallery, and lifecycle:
 * - Scoped to authenticated Supabase user ('memories' table)
 * - Resilient offline / guest storage fallback via AsyncStorage
 * - CRUD operations: create, read, update, delete, toggle favorite
 * - Date search, filter by month/year, and favorites
 * - Seed memories for immediate welcoming experience
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { deleteMemoryPhoto } from '@/services/photoStorage';
import type { Memory } from '@/types';

const MEMORY_STORAGE_KEY = 'zeona_memories_v1';

// ── Initial Seed Memories ─────────────────────────────────────────────────────
function generateSeedMemories(): Memory[] {
  return [
    {
      id: 'memory-seed-1',
      user_id: 'local-user',
      title: 'Sunset Over the Lavender Hills',
      description:
        'Walked along the ridge just as the golden sun dipped behind the purple slopes. The cool evening breeze carried the gentle scent of wild herbs and quiet gratitude.',
      image_urls: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      ],
      memory_date: '2026-10-15',
      is_favorite: true,
      tags: ['Nature', 'Gratitude', 'GoldenHour'],
      created_at: new Date('2026-10-15T18:30:00Z').toISOString(),
      updated_at: new Date('2026-10-15T18:30:00Z').toISOString(),
    },
    {
      id: 'memory-seed-2',
      user_id: 'local-user',
      title: 'Baking Fresh Blueberry Scones',
      description:
        'Woke up early on a rainy Saturday. The kitchen was warm with vanilla and lemon zest. Shared warm scones with herbal tea.',
      image_urls: [
        'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80',
      ],
      memory_date: '2026-10-12',
      is_favorite: false,
      tags: ['Home', 'Baking', 'Comfort'],
      created_at: new Date('2026-10-12T10:15:00Z').toISOString(),
      updated_at: new Date('2026-10-12T10:15:00Z').toISOString(),
    },
    {
      id: 'memory-seed-3',
      user_id: 'local-user',
      title: 'Quiet Sunday Reading Sanctuary',
      description:
        'Finally finished the poetry collection by Mary Oliver. Spent three peaceful hours curled up in the velvet armchair with sunlight warming the floorboards.',
      image_urls: [
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
      ],
      memory_date: '2026-10-08',
      is_favorite: true,
      tags: ['Reading', 'Solitude', 'Peace'],
      created_at: new Date('2026-10-08T15:45:00Z').toISOString(),
      updated_at: new Date('2026-10-08T15:45:00Z').toISOString(),
    },
    {
      id: 'memory-seed-4',
      user_id: 'local-user',
      title: 'Morning Stroll in Botanical Gardens',
      description:
        'Dew clinging to fern fronds and the soft trickle of stone water basins. A moment of true stillness before the week began.',
      image_urls: [],
      memory_date: '2026-09-28',
      is_favorite: false,
      tags: ['Morning', 'Walk', 'Stillness'],
      created_at: new Date('2026-09-28T08:20:00Z').toISOString(),
      updated_at: new Date('2026-09-28T08:20:00Z').toISOString(),
    },
  ];
}

interface MemoryStoreState {
  memories: Memory[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  fetchMemories: () => Promise<void>;
  addMemory: (data: {
    title: string;
    description?: string | null;
    image_urls?: string[];
    memory_date: string;
    is_favorite?: boolean;
    tags?: string[];
  }) => Promise<Memory>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<Memory | null>;
  deleteMemory: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  getMemoryById: (id: string) => Memory | undefined;
}

export const useMemoryStore = create<MemoryStoreState>((set, get) => ({
  memories: generateSeedMemories(),
  isLoading: false,
  error: null,

  initialize: async () => {
    await get().fetchMemories();
  },

  fetchMemories: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${MEMORY_STORAGE_KEY}_${user.id}` : MEMORY_STORAGE_KEY;

    // 1. Try Supabase if user authenticated
    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .eq('user_id', user.id)
          .order('memory_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          set({ memories: data, isLoading: false });
          AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
          return;
        }
      } catch (err) {
        console.warn('[Zeona Memories] Supabase fetch notice:', err);
      }
    }

    // 2. Fallback to AsyncStorage
    try {
      const localJson = await AsyncStorage.getItem(storageKey);
      if (localJson) {
        const parsed = JSON.parse(localJson);
        set({ memories: parsed, isLoading: false });
      } else {
        const seed = generateSeedMemories();
        set({ memories: seed, isLoading: false });
        AsyncStorage.setItem(storageKey, JSON.stringify(seed)).catch(() => {});
      }
    } catch {
      set({ memories: generateSeedMemories(), isLoading: false });
    }
  },

  addMemory: async (data) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${MEMORY_STORAGE_KEY}_${user.id}` : MEMORY_STORAGE_KEY;

    const newMemory: Memory = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user?.id || 'local-user',
      title: data.title.trim(),
      description: data.description?.trim() || null,
      image_urls: data.image_urls || [],
      memory_date: data.memory_date,
      is_favorite: data.is_favorite ?? false,
      tags: data.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextMemories = [newMemory, ...get().memories];
    set({ memories: nextMemories });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextMemories)).catch(() => {});

    if (supabase && user) {
      try {
        await supabase.from('memories').insert([newMemory]);
      } catch (err) {
        console.warn('[Zeona Memories] Supabase insert notice:', err);
      }
    }

    return newMemory;
  },

  updateMemory: async (id, updates) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${MEMORY_STORAGE_KEY}_${user.id}` : MEMORY_STORAGE_KEY;

    let updated: Memory | null = null;
    const nextMemories = get().memories.map((m) => {
      if (m.id === id) {
        updated = {
          ...m,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return updated;
      }
      return m;
    });

    if (updated) {
      set({ memories: nextMemories });
      AsyncStorage.setItem(storageKey, JSON.stringify(nextMemories)).catch(() => {});

      if (supabase && user) {
        try {
          await supabase.from('memories').update(updates).eq('id', id).eq('user_id', user.id);
        } catch (err) {
          console.warn('[Zeona Memories] Supabase update notice:', err);
        }
      }
    }

    return updated;
  },

  deleteMemory: async (id) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${MEMORY_STORAGE_KEY}_${user.id}` : MEMORY_STORAGE_KEY;

    const target = get().memories.find((m) => m.id === id);
    const nextMemories = get().memories.filter((m) => m.id !== id);
    set({ memories: nextMemories });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextMemories)).catch(() => {});

    // Delete associated photos from private Supabase Storage
    if (target && target.image_urls.length > 0) {
      target.image_urls.forEach((url) => {
        deleteMemoryPhoto(url).catch(() => {});
      });
    }

    if (supabase && user) {
      try {
        await supabase.from('memories').delete().eq('id', id).eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Memories] Supabase delete notice:', err);
      }
    }
  },

  toggleFavorite: async (id) => {
    const target = get().memories.find((m) => m.id === id);
    if (!target) return;
    await get().updateMemory(id, { is_favorite: !target.is_favorite });
  },

  getMemoryById: (id) => {
    return get().memories.find((m) => m.id === id);
  },
}));
