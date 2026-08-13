// ============================
// Video Store
// ============================
// Zustand store managing video state, uploads, history, and my list.
// All reads/writes go through the repository (src/lib/repository.ts), which
// transparently uses Firestore when configured and demo data otherwise.

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { repo } from '@/lib/repository';
import type { Video, VideoUploadProgress, Category, WatchHistory, SearchFilters } from '@/types';

interface VideoState {
  videos: Video[];
  trendingVideos: Video[];
  recentVideos: Video[];
  featuredVideo: Video | null;
  currentVideo: Video | null;
  categories: Category[];
  continueWatching: WatchHistory[];
  watchHistory: string[];
  myList: string[];
  uploadProgress: VideoUploadProgress | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;

  // Actions
  fetchVideos: (categoryId?: string, page?: number) => Promise<Video[]>;
  fetchTrendingVideos: () => Promise<void>;
  fetchRecentVideos: () => Promise<void>;
  fetchFeaturedVideo: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchContinueWatching: () => Promise<void>;
  getVideoById: (videoId: string) => Promise<Video | null>;
  getVideosByCategory: (categoryId: string) => Promise<Video[]>;
  searchVideos: (query: string, filters?: Partial<SearchFilters>) => Promise<Video[]>;

  // Upload Management
  setUploadProgress: (progress: VideoUploadProgress | null) => void;
  updateUploadProgress: (progress: Partial<VideoUploadProgress>) => void;

  // Watch History & My List
  addToHistory: (videoId: string) => void;
  saveWatchProgress: (videoId: string, position: number, duration: number) => Promise<void>;
  addToMyList: (videoId: string) => Promise<void>;
  removeFromMyList: (videoId: string) => Promise<void>;
  isInMyList: (videoId: string) => boolean;
  toggleLike: (videoId: string, action: 'like' | 'dislike') => Promise<boolean>;

  // Video Management (Admin)
  deleteVideo: (videoId: string) => Promise<void>;
  updateVideo: (videoId: string, data: Partial<Video>) => Promise<void>;
  createVideo: (data: Partial<Video>) => Promise<Video>;

  // Current Video
  setCurrentVideo: (video: Video | null) => void;
  clearError: () => void;
}

// Helper: current user id (reads the persisted auth store directly).
function currentUid(): string {
  if (typeof window === 'undefined') return 'demo-user';
  try {
    const raw = window.localStorage.getItem('auth-storage');
    if (raw) {
      const user = JSON.parse(raw)?.state?.user;
      if (user?.uid) return user.uid;
    }
  } catch {
    // ignore
  }
  return 'demo-user';
}

export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      videos: [],
      trendingVideos: [],
      recentVideos: [],
      featuredVideo: null,
      currentVideo: null,
      categories: [],
      continueWatching: [],
      watchHistory: [],
      myList: [],
      uploadProgress: null,
      isLoading: false,
      error: null,
      hasMore: true,

      fetchVideos: async (categoryId?: string, page = 1) => {
        set({ isLoading: true, error: null });
        try {
          const { videos, hasMore } = await repo.getVideos({ categoryId, page, limit: 24 });
          set(state => ({
            videos: page > 1 ? [...state.videos, ...videos] : videos,
            hasMore,
            isLoading: false,
          }));
          return videos;
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'Failed to fetch videos' });
          return [];
        }
      },

      fetchTrendingVideos: async () => {
        try {
          const trending = await repo.getTrending();
          set({ trendingVideos: trending });
        } catch {
          set({ error: 'Failed to load trending videos' });
        }
      },

      fetchRecentVideos: async () => {
        try {
          const recent = await repo.getRecent();
          set({ recentVideos: recent });
        } catch {
          set({ error: 'Failed to load recent videos' });
        }
      },

      fetchFeaturedVideo: async () => {
        try {
          const featured = await repo.getFeatured();
          set({ featuredVideo: featured });
        } catch {
          set({ error: 'Failed to load featured video' });
        }
      },

      fetchCategories: async () => {
        try {
          const categories = await repo.getCategories();
          set({ categories });
        } catch {
          set({ error: 'Failed to load categories' });
        }
      },

      fetchContinueWatching: async () => {
        try {
          const history = await repo.getContinueWatching(currentUid());
          set({ continueWatching: history });
        } catch {
          // Non-fatal.
        }
      },

      getVideoById: async (videoId: string) => {
        try {
          return await repo.getVideoById(videoId);
        } catch {
          return null;
        }
      },

      getVideosByCategory: async (categoryId: string) => {
        const { videos } = await repo.getVideos({ categoryId, limit: 50 });
        return videos;
      },

      searchVideos: async (query: string, filters: Partial<SearchFilters> = {}) => {
        return repo.searchVideos(query, filters);
      },

      setUploadProgress: (progress) => set({ uploadProgress: progress }),

      updateUploadProgress: (progress) => {
        const current = get().uploadProgress;
        if (current) {
          set({ uploadProgress: { ...current, ...progress } });
        }
      },

      addToHistory: (videoId) => {
        set(state => ({
          watchHistory: [videoId, ...state.watchHistory.filter(id => id !== videoId)].slice(0, 100),
        }));
      },

      saveWatchProgress: async (videoId, position, duration) => {
        await repo.saveWatchProgress(currentUid(), videoId, position, duration);
        // Refresh the continue-watching rail opportunistically.
        get().fetchContinueWatching();
      },

      addToMyList: async (videoId) => {
        await repo.addToMyList(currentUid(), videoId);
        set(state => ({ myList: state.myList.includes(videoId) ? state.myList : [videoId, ...state.myList] }));
      },

      removeFromMyList: async (videoId) => {
        await repo.removeFromMyList(currentUid(), videoId);
        set(state => ({ myList: state.myList.filter(id => id !== videoId) }));
      },

      isInMyList: (videoId) => {
        return get().myList.includes(videoId);
      },

      toggleLike: async (videoId, action) => {
        return repo.toggleLike(currentUid(), videoId, action);
      },

      deleteVideo: async (videoId) => {
        await repo.deleteVideo(videoId);
        set(state => ({ videos: state.videos.filter(v => v.id !== videoId) }));
      },

      updateVideo: async (videoId, data) => {
        await repo.updateVideo(videoId, data);
        set(state => ({
          videos: state.videos.map(v => (v.id === videoId ? { ...v, ...data } : v)),
        }));
      },

      createVideo: async (data) => {
        const video = await repo.createVideo(data);
        set(state => ({ videos: [video, ...state.videos] }));
        return video;
      },

      setCurrentVideo: (video) => set({ currentVideo: video }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'video-storage',
      partialize: (state) => ({
        watchHistory: state.watchHistory,
        myList: state.myList,
      }),
    }
  )
);

