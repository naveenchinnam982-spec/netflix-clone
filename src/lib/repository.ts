// ============================
// Repository (Data Access Layer)
// ============================
// The single source of truth for data in the app (MVVM "model" layer).
//
// Two backends:
//   1. Firebase Firestore — used when the client Firebase config is real and
//      the project is reachable.
//   2. Demo mode — rich static dataset (src/lib/demo-data.ts) with user data
//      (my list, history, likes, comments, uploads) persisted in localStorage.
//
// Every read/write is wrapped so that a broken or unreachable Firebase
// configuration degrades gracefully to demo mode instead of crashing the UI.
// The chosen backend is cached after the first successful/authoritative check.

import type {
  Video,
  Category,
  Comment,
  User,
  Analytics,
  WatchHistory,
  Notification,
  LiveStream,
  SearchFilters,
} from '@/types';
import {
  DEMO_VIDEOS,
  DEMO_CATEGORIES,
  DEMO_COMMENTS,
  DEMO_HISTORY,
  DEMO_NOTIFICATIONS,
  DEMO_ANALYTICS,
  DEMO_USERS,
  DEMO_ADMIN,
  DEMO_LIVE_STREAM,
} from './demo-data';
import { readLocal, writeLocal } from './storage';

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------

type Backend = 'firebase' | 'demo';

let cachedBackend: Backend | null = null;

function resolveBackend(): Backend {
  if (cachedBackend) return cachedBackend;
  const hasApiKey = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes('YOUR_'));
  cachedBackend = hasApiKey ? 'firebase' : 'demo';
  return cachedBackend;
}

export function getBackend(): Backend {
  return resolveBackend();
}

export const isDemoMode = (): boolean => resolveBackend() === 'demo';

/** Force demo backend when a live Firebase call fails authoritatively. */
function markDemo() {
  cachedBackend = 'demo';
}

// ---------------------------------------------------------------------------
// Firestore lazy import (client only)
// ---------------------------------------------------------------------------

function getFirestore() {
  // Dynamic require so importing this module never pulls firebase into the
  // server bundle or crashes in demo mode.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/firebase').db;
}

// ---------------------------------------------------------------------------
// Demo-mode persistence keys
// ---------------------------------------------------------------------------

const K_UPLOADS = (uid: string) => `demo:uploads:${uid}`;
const K_MYLIST = (uid: string) => `demo:mylist:${uid}`;
const K_HISTORY = (uid: string) => `demo:history:${uid}`;
const K_LIKES = (uid: string) => `demo:likes:${uid}`;
const K_COMMENTS = (videoId: string) => `demo:comments:${videoId}`;
const K_NOTIFS = (uid: string) => `demo:notifications:${uid}`;

function demoVideosFor(uid: string): Video[] {
  const uploads = readLocal<Video[]>(K_UPLOADS(uid), []);
  return [...uploads, ...DEMO_VIDEOS];
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

class Repository {
  // =========================== VIDEOS ===========================

  async getVideos(options: {
    categoryId?: string;
    limit?: number;
    page?: number;
    query?: string;
    sortBy?: string;
  } = {}): Promise<{ videos: Video[]; hasMore: boolean; total: number }> {
    const { categoryId, limit = 24, page = 1, query, sortBy } = options;
    const uid = this.currentUid();

    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, query: q, where, getDocs } = await import('firebase/firestore');
        // Equality filters only — no composite index required, so this works
        // on a fresh Firebase project with zero console setup. Sorting and
        // pagination happen in memory. (At large scale, add the composite
        // indexes for status+createdAt / status+views and move sort/limit
        // back into the query.)
        const constraints: any[] = [where('status', '==', 'ready')];
        if (categoryId) constraints.push(where('categoryId', '==', categoryId));
        const snap = await getDocs(q(collection(db, 'videos'), ...constraints));
        let videos = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Video);
        if (sortBy === 'views') videos = [...videos].sort((a, b) => b.views - a.views);
        else videos = [...videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const start = (page - 1) * limit;
        const slice = videos.slice(start, start + limit);
        return { videos: slice, hasMore: start + limit < videos.length, total: videos.length };
      } catch {
        markDemo();
      }
    }

    let videos = demoVideosFor(uid);
    if (categoryId) videos = videos.filter(v => v.categoryId === categoryId);
    if (query) {
      const term = query.toLowerCase();
      videos = videos.filter(
        v => v.title.toLowerCase().includes(term) || v.description.toLowerCase().includes(term) || v.tags?.some(t => t.toLowerCase().includes(term))
      );
    }
    if (sortBy === 'views') videos = [...videos].sort((a, b) => b.views - a.views);
    else if (sortBy === 'rating') videos = [...videos].sort((a, b) => b.likes - a.likes);
    else videos = [...videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = (page - 1) * limit;
    const slice = videos.slice(start, start + limit);
    return { videos: slice, hasMore: start + limit < videos.length, total: videos.length };
  }

  async getVideoById(id: string): Promise<Video | null> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'videos', id));
        if (snap.exists()) return { id: snap.id, ...snap.data() } as Video;
        return null;
      } catch {
        markDemo();
      }
    }
    return demoVideosFor(this.currentUid()).find(v => v.id === id) || null;
  }

  async getTrending(): Promise<Video[]> {
    const { videos } = await this.getVideos({ sortBy: 'views', limit: 20 });
    return videos;
  }

  async getRecent(): Promise<Video[]> {
    const { videos } = await this.getVideos({ limit: 20 });
    return videos;
  }

  async getFeatured(): Promise<Video | null> {
    const { videos } = await this.getVideos({ sortBy: 'views', limit: 1 });
    return videos[0] || null;
  }

  async searchVideos(query: string, filters: Partial<SearchFilters> = {}): Promise<Video[]> {
    const { videos } = await this.getVideos({ query, limit: 60 });
    let results = videos;
    if (filters.category) results = results.filter(v => v.categoryId === filters.category);
    if (filters.language) results = results.filter(v => v.language === filters.language);
    if (filters.sortBy === 'views') results = [...results].sort((a, b) => b.views - a.views);
    if (filters.sortBy === 'rating') results = [...results].sort((a, b) => b.likes - a.likes);
    if (filters.duration) {
      const { min = 0, max = Infinity } = filters.duration;
      results = results.filter(v => v.duration >= min && v.duration <= max);
    }
    return results;
  }

  async incrementViews(videoId: string): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, increment, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'videos', videoId), { views: increment(1) });
        return;
      } catch {
        markDemo();
      }
    }
    // Demo mode: views are decorative; nothing to persist.
  }

  // =========================== CATEGORIES ===========================

  async getCategories(): Promise<Category[]> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        // Equality filter only (no composite index needed); sort in memory.
        const snap = await getDocs(query(collection(db, 'categories'), where('isActive', '==', true)));
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Category)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      } catch {
        markDemo();
      }
    }
    return DEMO_CATEGORIES.map((c, i) => ({ ...c, videoCount: DEMO_VIDEOS.filter(v => v.categoryId === c.id).length, order: i }));
  }

  async createCategory(data: Omit<Category, 'id' | 'createdAt' | 'videoCount'>): Promise<Category> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, addDoc } = await import('firebase/firestore');
        const ref = await addDoc(collection(db, 'categories'), { ...data, videoCount: 0, createdAt: new Date().toISOString() });
        return { id: ref.id, ...data, videoCount: 0, createdAt: new Date().toISOString() };
      } catch {
        markDemo();
      }
    }
    throw new Error('Category management requires Firebase configuration');
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'categories', id), data);
        return;
      } catch {
        markDemo();
      }
    }
    throw new Error('Category management requires Firebase configuration');
  }

  async deleteCategory(id: string): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'categories', id));
      } catch {
        markDemo();
      }
    }
  }

  // =========================== MY LIST ===========================

  async getMyList(uid: string): Promise<Video[]> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'myList', uid, 'items'));
        const ids = snap.docs.map(d => d.id);
        const videos = await Promise.all(ids.map(id => this.getVideoById(id)));
        return videos.filter((v): v is Video => v !== null);
      } catch {
        markDemo();
      }
    }
    const ids = readLocal<string[]>(K_MYLIST(uid), []);
    const all = demoVideosFor(uid);
    return ids.map(id => all.find(v => v.id === id)).filter((v): v is Video => v !== undefined);
  }

  async addToMyList(uid: string, videoId: string): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'myList', uid, 'items', videoId), { addedAt: new Date().toISOString() });
        return;
      } catch {
        markDemo();
      }
    }
    const current = readLocal<string[]>(K_MYLIST(uid), []);
    if (!current.includes(videoId)) writeLocal(K_MYLIST(uid), [videoId, ...current]);
  }

  async removeFromMyList(uid: string, videoId: string): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'myList', uid, 'items', videoId));
        return;
      } catch {
        markDemo();
      }
    }
    writeLocal(K_MYLIST(uid), readLocal<string[]>(K_MYLIST(uid), []).filter(id => id !== videoId));
  }

  async isInMyList(uid: string, videoId: string): Promise<boolean> {
    const list = await this.getMyList(uid);
    return list.some(v => v.id === videoId);
  }

  // =========================== HISTORY ===========================

  async getWatchHistory(uid: string): Promise<WatchHistory[]> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'watchHistory', uid, 'items'), orderBy('watchedAt', 'desc'), limit(100)));
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Omit<WatchHistory, 'video'>);
        const videos = await Promise.all(items.map(i => this.getVideoById(i.videoId)));
        return items.map((item, idx) => ({ ...item, video: videos[idx]! })).filter(i => i.video);
      } catch {
        markDemo();
      }
    }
    return readLocal<WatchHistory[]>(K_HISTORY(uid), DEMO_HISTORY);
  }

  async saveWatchProgress(uid: string, videoId: string, lastPosition: number, duration: number): Promise<void> {
    const video = await this.getVideoById(videoId);
    if (!video) return;
    const entry: WatchHistory = {
      id: videoId,
      userId: uid,
      videoId,
      video,
      watchedAt: new Date().toISOString(),
      watchDuration: Math.max(lastPosition, 0),
      completed: duration > 0 && lastPosition >= duration - 10,
      lastPosition,
    };
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'watchHistory', uid, 'items', videoId), entry, { merge: true });
        return;
      } catch {
        markDemo();
      }
    }
    const current = readLocal<WatchHistory[]>(K_HISTORY(uid), DEMO_HISTORY).filter(h => h.videoId !== videoId);
    writeLocal(K_HISTORY(uid), [entry, ...current].slice(0, 100));
  }

  async getContinueWatching(uid: string): Promise<WatchHistory[]> {
    const history = await this.getWatchHistory(uid);
    return history.filter(h => !h.completed && h.lastPosition > 10).slice(0, 12);
  }

  // =========================== LIKES ===========================

  async getLikedVideoIds(uid: string): Promise<string[]> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'likes', uid, 'items'));
        return snap.docs.map(d => d.id);
      } catch {
        markDemo();
      }
    }
    return readLocal<string[]>(K_LIKES(uid), []);
  }

  async toggleLike(uid: string, videoId: string, action: 'like' | 'dislike'): Promise<boolean> {
    const liked = await this.getLikedVideoIds(uid);
    const already = liked.includes(videoId);
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, setDoc, deleteDoc, increment, updateDoc } = await import('firebase/firestore');
        const ref = doc(db, 'likes', uid, 'items', videoId);
        const videoRef = doc(db, 'videos', videoId);
        if (already) {
          await deleteDoc(ref);
          await updateDoc(videoRef, { [action === 'like' ? 'likes' : 'dislikes']: increment(-1) });
          return false;
        }
        await setDoc(ref, { action, at: new Date().toISOString() });
        await updateDoc(videoRef, { [action === 'like' ? 'likes' : 'dislikes']: increment(1) });
        return true;
      } catch {
        markDemo();
      }
    }
    const next = already ? liked.filter(id => id !== videoId) : [videoId, ...liked];
    writeLocal(K_LIKES(uid), next);
    return !already;
  }

  // =========================== COMMENTS ===========================

  async getComments(videoId: string): Promise<Comment[]> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'comments', videoId, 'items'), orderBy('createdAt', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Comment);
      } catch {
        markDemo();
      }
    }
    const local = readLocal<Comment[]>(K_COMMENTS(videoId), []);
    const seeded = local.length > 0 ? local : DEMO_COMMENTS;
    return [...seeded].sort((a, b) => (a.status === 'pinned' ? -1 : 1) || b.createdAt.localeCompare(a.createdAt));
  }

  async addComment(uid: string, videoId: string, text: string, parentId?: string): Promise<Comment> {
    const user = await this.getUser(uid);
    const comment: Comment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      videoId,
      userId: uid,
      user: user || DEMO_ADMIN,
      text,
      likes: 0,
      dislikes: 0,
      replies: 0,
      parentId,
      status: 'active',
      isEdited: false,
      createdAt: new Date().toISOString(),
    };
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, addDoc } = await import('firebase/firestore');
        await addDoc(collection(db, 'comments', videoId, 'items'), comment);
        return comment;
      } catch {
        markDemo();
      }
    }
    writeLocal(K_COMMENTS(videoId), [...readLocal<Comment[]>(K_COMMENTS(videoId), []), comment]);
    return comment;
  }

  async deleteComment(commentId: string, videoId: string): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'comments', videoId, 'items', commentId));
        return;
      } catch {
        markDemo();
      }
    }
    writeLocal(K_COMMENTS(videoId), readLocal<Comment[]>(K_COMMENTS(videoId), []).filter(c => c.id !== commentId));
  }

  async reportComment(commentId: string, videoId: string): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'comments', videoId, 'items', commentId), { status: 'reported' });
      } catch {
        markDemo();
      }
    }
  }

  // =========================== USERS ===========================

  async getUser(uid: string): Promise<User | null> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) return snap.data() as User;
        return null;
      } catch {
        markDemo();
      }
    }
    return DEMO_USERS.find(u => u.uid === uid) || null;
  }

  async getUsers(): Promise<User[]> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500)));
        return snap.docs.map(d => d.data() as User);
      } catch {
        markDemo();
      }
    }
    return DEMO_USERS;
  }

  async setUserBanStatus(uid: string, banned: boolean): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', uid), { isBanned: banned });
      } catch {
        markDemo();
      }
    }
  }

  async setUserRole(uid: string, role: User['role']): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', uid), { role });
      } catch {
        markDemo();
      }
    }
  }

  // =========================== ADMIN: VIDEOS ===========================

  async createVideo(data: Partial<Video>): Promise<Video> {
    const uid = this.currentUid();
    const now = new Date().toISOString();
    const category = DEMO_CATEGORIES.find(c => c.id === data.categoryId);
    const video: Video = {
      id: `v-${Date.now()}`,
      title: data.title || 'Untitled video',
      description: data.description || '',
      thumbnail: data.thumbnail || DEMO_VIDEOS[0].thumbnail,
      videoUrl: data.videoUrl || '',
      hlsUrl: data.hlsUrl,
      dashUrl: data.dashUrl,
      duration: data.duration || 0,
      views: 0,
      likes: 0,
      dislikes: 0,
      categoryId: data.categoryId || 'cat-action',
      category: category || DEMO_CATEGORIES[0],
      tags: data.tags || [],
      visibility: data.visibility || 'public',
      status: data.status || 'processing',
      uploadedBy: uid,
      uploader: DEMO_ADMIN,
      uploaderName: data.uploaderName || 'You',
      uploaderAvatar: data.uploaderAvatar || '',
      language: data.language || 'en',
      ageRestricted: data.ageRestricted || false,
      allowComments: data.allowComments ?? true,
      allowRatings: data.allowRatings ?? true,
      captions: [],
      chapters: [],
      quality: data.quality || ['720p', '1080p'],
      resolution: { width: 1920, height: 1080, label: '1080p', bitrate: 3000 },
      fileSize: data.fileSize || 0,
      format: data.format || 'mp4',
      processedQualities: data.processedQualities || [],
      processingProgress: 0,
      createdAt: now,
      updatedAt: now,
      ...data,
    };

    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, addDoc } = await import('firebase/firestore');
        // Strip the local id before persisting — Firestore generates its own.
        const doc = { ...video } as { id?: string };
        delete doc.id;
        const ref = await addDoc(collection(db, 'videos'), doc);
        return { ...video, id: ref.id };
      } catch {
        markDemo();
      }
    }
    writeLocal(K_UPLOADS(uid), [video, ...readLocal<Video[]>(K_UPLOADS(uid), [])]);
    return video;
  }

  async updateVideo(id: string, data: Partial<Video>): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'videos', id), { ...data, updatedAt: new Date().toISOString() });
        return;
      } catch {
        markDemo();
      }
    }
    const uid = this.currentUid();
    const uploads = readLocal<Video[]>(K_UPLOADS(uid), []);
    writeLocal(K_UPLOADS(uid), uploads.map(v => (v.id === id ? { ...v, ...data, updatedAt: new Date().toISOString() } : v)));
  }

  async deleteVideo(id: string): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'videos', id));
        return;
      } catch {
        markDemo();
      }
    }
    const uid = this.currentUid();
    writeLocal(K_UPLOADS(uid), readLocal<Video[]>(K_UPLOADS(uid), []).filter(v => v.id !== id));
  }

  // =========================== ANALYTICS ===========================

  async getAnalytics(): Promise<Analytics> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'analytics', 'daily', 'events'), orderBy('date', 'desc'), limit(30)));
        const events = snap.docs.map(d => d.data());
        return this.aggregateAnalytics(events);
      } catch {
        markDemo();
      }
    }
    return DEMO_ANALYTICS;
  }

  private aggregateAnalytics(events: any[]): Analytics {
    const users = new Set<string>();
    const videoViews = new Map<string, number>();
    let watchTime = 0;
    const categories = new Map<string, number>();

    events.forEach(e => {
      if (e.userId) users.add(e.userId);
      if (e.type === 'watch') {
        watchTime += e.seconds || 0;
        videoViews.set(e.videoId, (videoViews.get(e.videoId) || 0) + 1);
        if (e.categoryId) categories.set(e.categoryId, (categories.get(e.categoryId) || 0) + 1);
      }
    });

    return {
      dailyUsers: [users.size],
      mostWatched: [],
      watchTime,
      revenue: 0,
      topCategories: [],
      storageUsage: 0,
      bandwidthUsage: 0,
      userGrowth: [],
      videoUploads: [],
      activeStreams: 0,
      totalVideos: 0,
      totalUsers: users.size,
      totalComments: 0,
    };
  }

  // =========================== NOTIFICATIONS ===========================

  async getNotifications(uid: string): Promise<Notification[]> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'notifications', uid, 'items'), orderBy('createdAt', 'desc'), limit(50)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notification);
      } catch {
        markDemo();
      }
    }
    return readLocal<Notification[]>(K_NOTIFS(uid), DEMO_NOTIFICATIONS);
  }

  async markNotificationsRead(uid: string, ids: string[]): Promise<void> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { doc, updateDoc } = await import('firebase/firestore');
        await Promise.all(ids.map(id => updateDoc(doc(db, 'notifications', uid, 'items', id), { isRead: true })));
        return;
      } catch {
        markDemo();
      }
    }
    const current = readLocal<Notification[]>(K_NOTIFS(uid), DEMO_NOTIFICATIONS);
    writeLocal(K_NOTIFS(uid), current.map(n => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
  }

  // =========================== LIVE STREAMS ===========================

  async getLiveStreams(): Promise<LiveStream[]> {
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'liveStreams'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }) as LiveStream);
      } catch {
        markDemo();
      }
    }
    return [DEMO_LIVE_STREAM];
  }

  async createLiveStream(data: Partial<LiveStream>): Promise<LiveStream> {
    const now = new Date().toISOString();
    const stream: LiveStream = {
      id: `live-${Date.now()}`,
      title: data.title || 'Untitled live stream',
      description: data.description || '',
      thumbnail: data.thumbnail || '',
      teacherId: this.currentUid(),
      teacher: DEMO_ADMIN,
      status: 'live',
      viewers: 0,
      maxViewers: data.maxViewers || 500,
      duration: 0,
      chatEnabled: data.chatEnabled ?? true,
      recordingEnabled: data.recordingEnabled ?? true,
      screenShareEnabled: data.screenShareEnabled ?? true,
      whiteboardEnabled: data.whiteboardEnabled ?? true,
      raiseHandEnabled: data.raiseHandEnabled ?? true,
      muteAllEnabled: data.muteAllEnabled ?? true,
      streamKey: `sk-${Date.now()}`,
      rtmpUrl: '',
      chatMessages: [],
      participants: [],
      isRecording: false,
      createdAt: now,
    };
    if (resolveBackend() === 'firebase') {
      try {
        const db = getFirestore();
        const { collection, addDoc } = await import('firebase/firestore');
        // Strip the local id before persisting — Firestore generates its own.
        const doc = { ...stream } as { id?: string };
        delete doc.id;
        const ref = await addDoc(collection(db, 'liveStreams'), doc);
        return { ...stream, id: ref.id };
      } catch {
        markDemo();
      }
    }
    return stream;
  }

  // =========================== HELPERS ===========================

  private currentUid(): string {
    if (typeof window === 'undefined') return 'demo-user';
    try {
      const raw = window.localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        const user = parsed?.state?.user;
        if (user?.uid) return user.uid;
      }
    } catch {
      // ignore
    }
    return 'demo-user';
  }
}

export const repo = new Repository();
