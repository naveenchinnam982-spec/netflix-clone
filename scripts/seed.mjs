// ============================
// Firestore Seed Script
// ============================
// Populates Firestore with categories, an admin user, demo users, and sample
// videos (public HLS/MP4 test streams so playback works out of the box).
//
// Usage:
//   1. Set FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) or point
//      GOOGLE_APPLICATION_CREDENTIALS at a service-account file.
//   2. node scripts/seed.mjs
//
// Safe to re-run: it upserts by stable document id.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- Minimal .env.local loader (KEY=VALUE) ----------
function loadEnvLocal() {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };

let admin;
try {
  admin = await import('firebase-admin');
} catch {
  console.error('firebase-admin is not installed. Run: npm install');
  process.exit(1);
}

if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)),
    projectId: env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
} else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
} else {
  console.error(
    'No credentials found. Set FIREBASE_SERVICE_ACCOUNT_KEY (JSON) or GOOGLE_APPLICATION_CREDENTIALS.'
  );
  process.exit(1);
}

const db = admin.firestore();
const now = Date.now();
const ts = (daysAgo = 0) => new Date(now - daysAgo * 86400000).toISOString();

// ---------- Data ----------
const CATEGORIES = [
  { name: 'Action', slug: 'action', color: '#E50914', description: 'High-octane thrills and explosive set pieces.' },
  { name: 'Sci-Fi', slug: 'sci-fi', color: '#9C27B0', description: 'Futuristic worlds and mind-bending tech.' },
  { name: 'Documentaries', slug: 'documentaries', color: '#2196F3', description: 'Real stories, real people.' },
  { name: 'Thriller', slug: 'thriller', color: '#FF5722', description: 'Suspense that keeps you on edge.' },
  { name: 'Drama', slug: 'drama', color: '#4CAF50', description: 'Emotional stories that stay with you.' },
  { name: 'Kids & Family', slug: 'kids-family', color: '#FFC107', description: 'Fun for the whole family.' },
];

const USERS = [
  { uid: 'demo-admin', email: 'admin@streamflix.dev', displayName: 'StreamFlix Admin', role: 'admin', subscription: 'yearly' },
  { uid: 'demo-teacher', email: 'teacher@streamflix.dev', displayName: 'Alex Rivera', role: 'teacher', subscription: 'premium' },
  { uid: 'demo-user', email: 'user@streamflix.dev', displayName: 'Sam Carter', role: 'user', subscription: 'free' },
];

const GTV = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';
const HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const VIDEOS = [
  {
    id: 'demo-video-1',
    title: 'Big Buck Bunny',
    description: 'A gentle giant rabbit and three rodents. A classic open-source short film.',
    thumbnail: `${GTV}/images/BigBuckBunny.jpg`,
    poster: `${GTV}/images/BigBuckBunny.jpg`,
    videoUrl: `${GTV}/BigBuckBunny.mp4`,
    hlsUrl: HLS,
    duration: 596,
    categorySlug: 'kids-family',
    visibility: 'public',
    views: 48213,
    likes: 3112,
    language: 'en',
  },
  {
    id: 'demo-video-2',
    title: 'Elephants Dream',
    description: "The first open movie made entirely with open source graphics software.",
    thumbnail: `${GTV}/images/ElephantsDream.jpg`,
    poster: `${GTV}/images/ElephantsDream.jpg`,
    videoUrl: `${GTV}/ElephantsDream.mp4`,
    hlsUrl: HLS,
    duration: 653,
    categorySlug: 'sci-fi',
    visibility: 'public',
    views: 35402,
    likes: 2401,
    language: 'en',
  },
  {
    id: 'demo-video-3',
    title: 'Sintel',
    description: 'A lone warrior on an epic quest to find a baby dragon.',
    thumbnail: `${GTV}/images/Sintel.jpg`,
    poster: `${GTV}/images/Sintel.jpg`,
    videoUrl: `${GTV}/Sintel.mp4`,
    hlsUrl: HLS,
    duration: 888,
    categorySlug: 'action',
    visibility: 'public',
    views: 67210,
    likes: 5120,
    language: 'en',
  },
  {
    id: 'demo-video-4',
    title: 'Tears of Steel',
    description: 'A sci-fi short about a group of warriors and scientists who gather at the "Omniscience" to save the world.',
    thumbnail: `${GTV}/images/TearsOfSteel.jpg`,
    poster: `${GTV}/images/TearsOfSteel.jpg`,
    videoUrl: `${GTV}/TearsOfSteel.mp4`,
    hlsUrl: HLS,
    duration: 734,
    categorySlug: 'sci-fi',
    visibility: 'public',
    views: 28904,
    likes: 1876,
    language: 'en',
  },
  {
    id: 'demo-video-5',
    title: 'For Bigger Blazes',
    description: 'Chromecast demo clip — fast-paced action.',
    thumbnail: `${GTV}/images/ForBiggerBlazes.jpg`,
    poster: `${GTV}/images/ForBiggerBlazes.jpg`,
    videoUrl: `${GTV}/ForBiggerBlazes.mp4`,
    hlsUrl: HLS,
    duration: 15,
    categorySlug: 'action',
    visibility: 'public',
    views: 9812,
    likes: 643,
    language: 'en',
  },
];

// ---------- Seed ----------
let created = 0;
async function set(docPath, data) {
  await db.doc(docPath).set(data, { merge: true });
  created++;
}

console.log('Seeding Firestore…');

for (const c of CATEGORIES) {
  const id = `cat-${c.slug}`;
  await set(`categories/${id}`, { id, isActive: true, order: 1, videoCount: 0, createdAt: ts(90), ...c });
}

for (const u of USERS) {
  await set(`users/${u.uid}`, {
    uid: u.uid,
    email: u.email,
    emailVerified: true,
    displayName: u.displayName,
    photoURL: '',
    bio: '',
    phoneNumber: null,
    isBanned: false,
    banReason: null,
    createdAt: ts(60),
    lastLoginAt: ts(1),
    preferences: {
      autoplay: true,
      autoplayNext: true,
      videoQuality: '1080p',
      subtitlesEnabled: false,
      subtitleLanguage: 'en',
      matureContent: false,
      playNextEpisode: true,
      notifications: { uploads: true, liveStreams: true, comments: true, recommendations: true, marketing: false },
      theme: 'dark',
      language: 'en',
    },
    stats: { totalWatchTime: 0, videosWatched: 0, commentsPosted: 0, followers: 0, following: 0, joinDate: ts(60) },
    subscription: u.subscription,
    subscriptionStatus: 'active',
    ...u,
  });
}

for (const v of VIDEOS) {
  const cat = CATEGORIES.find((c) => c.slug === v.categorySlug);
  await set(`videos/${v.id}`, {
    id: v.id,
    title: v.title,
    description: v.description,
    thumbnail: v.thumbnail,
    poster: v.poster,
    videoUrl: v.videoUrl,
    hlsUrl: v.hlsUrl,
    dashUrl: null,
    duration: v.duration,
    durationLabel: `${Math.floor(v.duration / 60)}m`,
    categoryId: `cat-${v.categorySlug}`,
    categoryName: cat?.name || 'Other',
    categorySlug: v.categorySlug,
    visibility: v.visibility,
    isFeatured: v.id === 'demo-video-3',
    isTrending: true,
    tags: ['demo'],
    ownerId: 'demo-admin',
    ownerName: 'StreamFlix Admin',
    views: v.views,
    likes: v.likes,
    dislikes: 0,
    watchTime: v.views * 240,
    status: 'published',
    rating: 4.5 + ((v.id.charCodeAt(10) % 5) / 10),
    language: v.language,
    captions: [],
    chapters: [],
    resolutions: ['240p', '360p', '480p', '720p', '1080p'],
    createdAt: ts(7),
    updatedAt: ts(1),
    publishedAt: ts(7),
  });
}

console.log(`Done. Wrote ${created} documents.`);
process.exit(0);
