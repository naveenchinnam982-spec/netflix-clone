# Architecture

## 1. Layering (MVVM)

```
┌─────────────────────────────────────────────────────────────┐
│ VIEW  — src/app/** + src/components/**                       │
│         Pages and presentational components. No data logic. │
├─────────────────────────────────────────────────────────────┤
│ VIEWMODEL — src/store/** + src/hooks/**                     │
│         zustand stores (auth, video) + hooks (use-upload,   │
│         use-video-player, use-live-stream) translate user   │
│         intent into repository calls and expose reactive    │
│         state to the view.                                  │
├─────────────────────────────────────────────────────────────┤
│ MODEL — src/lib/repository.ts                               │
│         Single data gateway. Detects Firebase availability  │
│         and serves Firestore or the demo dataset behind one │
│         interface. Also: cloudinary, storage, redis,        │
│         rate-limit, auth, socket helpers.                   │
├─────────────────────────────────────────────────────────────┤
│ BACKEND — src/app/api/** + server/index.js                  │
│         Route Handlers for mutations, uploads, payments.    │
│         Socket.io server for live streaming + watch-together│
└─────────────────────────────────────────────────────────────┘
```

Why this shape:

- **Views never touch Firebase/Cloudinary directly.** All mutations go through Route Handlers, which is where admin checks, rate limiting, and secret keys live. Public reads use the repository.
- **Demo mode is a first-class feature.** When `NEXT_PUBLIC_FIREBASE_*` keys are absent, `repository.ts` serves a rich, playable demo catalog. The UI, upload flow, and dashboards all work against it — the admin upload even simulates Cloudinary processing through the API routes.
- **Stores persist user state** (`zustand/middleware`): watch history, my list, and auth session survive reloads via `localStorage`.

## 2. Upload pipeline (resumable, Cloudinary)

The most important flow — designed for multi-GB, multi-hour files that **never** go to Firebase Storage.

```
Browser (use-upload)
  1. File sliced into 6 MB chunks (CHUNK_SIZE).
  2. Chunks uploaded in parallel windows (PARALLEL_CHUNKS=3) via
     POST /api/upload/chunk  (multipart: chunk, chunkIndex, uploadId, fileName).
  3. Completed chunk indices tracked in a Set → pause/resume/retry only
     re-sends missing chunks, never the whole file.
  4. Failed chunks retried with exponential backoff (2^n seconds).
  5. useOnlineStatus (navigator.onLine + events) auto-resumes paused
     uploads when connectivity returns.

Server (/api/upload/chunk)
  6. Each chunk is written to a per-upload temp dir
     (/tmp/streamflix-uploads/<uploadId>/chunk-<index>).
  7. When all chunks are present → POST /api/upload/complete.
     - With Cloudinary: chunks are streamed to Cloudinary's resumable
       upload API (ChunkedUpload), then `eager` transformations generate
       adaptive HLS (240p→1080p) + MP4 renditions.
     - Without Cloudinary: a processing job is simulated, a demo HLS URL
       is returned, and the video is written to Firestore (or returned to
       the client in demo mode).
  8. /api/upload/webhook receives Cloudinary's processing-complete
     notification and flips the video to `published`.
```

Concurrency controls: window-based parallelism keeps memory bounded; the abort controller stops in-flight fetches instantly on pause/cancel.

## 3. Streaming pipeline

- **HLS-first**: the player prefers `hlsUrl` (`.m3u8`) via **hls.js** with `autoLevelCapping`, `startLevel`, and manual quality override. Falls back to a progressive MP4 `videoUrl`.
- **Continue watching**: the player reports `timeupdate` throttled to the store, which persists `watchProgress`; the watch page seeks to the saved position on load.
- **Adaptive bitrates**: Cloudinary `eager` transformations generate HLS renditions; quality ladder is 240p/360p/480p/720p/1080p/1440p/4K (configurable per upload).

## 4. Live streaming (WebRTC + Socket.io)

```
server/index.js (plain Node, Railway)
  - Socket.io server on PORT (default 4000).
  - Rooms per live stream id: join/leave, chat, raise-hand,
    mute-user, attendance snapshots, whiteboard events.
  - Optional Redis adapter (REDIS_URL) for horizontal scaling.

Browser (use-live-stream + src/lib/socket.ts)
  - Broadcaster: getUserMedia (camera/mic) + getDisplayMedia (screen)
    → RTCPeerConnection → remote stream via socket signaling
    (offer/answer/ice-candidate). Recording via MediaRecorder.
  - Viewer: joins the room, receives the remote stream.
  - Fallback: if the Socket.io server is unreachable, the UI degrades
    gracefully to a "demo broadcast" mode.
```

## 5. Security model

| Layer              | Mechanism                                                                 |
| ------------------ | ------------------------------------------------------------------------- |
| Transport          | HTTPS everywhere (Vercel + Railway).                                      |
| Auth               | Firebase Auth (email/Google) + JWT session cookie (httpOnly) minted by `/api/auth/login`. |
| Authorization      | Role-based: `admin` > `teacher` > `user`. Middleware guards `/dashboard`; API routes re-verify JWT + role server-side. |
| Rate limiting      | `src/lib/rate-limit.ts` (fixed-window counter, optional Redis) applied in middleware to `/api/*`. |
| Database rules     | `firestore.rules` + `storage.rules` — per-collection read/write guards; analytics is admin-read only; storage catch-all denies. |
| Secrets            | Only `NEXT_PUBLIC_*` reach the browser. Service-account, Cloudinary, Stripe, JWT secrets stay server-side. |
| Ban enforcement    | Banned users are rejected by auth store + API helpers (`isBanned`).        |

## 6. Performance & scale

- **Server Components** for page shells; client components isolated to interactive islands.
- **Route Handlers on the edge** by default in Next 15 → global low latency; static assets via Vercel CDN.
- **Redis cache** (`src/lib/redis.ts`) optional layer for hot reads (trending, search) — degrades gracefully to direct reads.
- **Code splitting** via route-level dynamic imports + `next/dynamic` for the player and upload UI.
- **Image optimization** with `next/image`; video thumbnails served from Cloudinary CDN.
- **Infinite scroll** via `use-infinite-scroll` + IntersectionObserver on catalog pages.
- Target: 100k+ users — Firestore scales horizontally; Socket.io scales via Redis adapter; uploads/transcoding are offloaded to Cloudinary.

See [API.md](API.md) for endpoints + Firestore schema and [DEPLOYMENT.md](DEPLOYMENT.md) for the production rollout.
