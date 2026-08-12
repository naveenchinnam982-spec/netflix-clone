# API Reference

All routes are Next.js Route Handlers under `src/app/api/**`. JSON in/out. Public reads fall back to the demo dataset when Firebase is unconfigured.

## Auth

### `POST /api/auth/login`
Sign in with email/password (Firebase) **or** demo credentials. Verifies the user, mints a JWT, and sets an `httpOnly` session cookie (`token`).

- Body: `{ email, password, demo?: boolean }`
- 200 → `{ user }` · 401 on bad credentials

### `GET /api/auth/me`
Returns the current user from the JWT cookie. 401 when absent/expired.

## Videos

### `GET /api/videos?category=action&search=big&featured=true&trending=true&page=1&limit=24`
List videos with filters + pagination. 200 → `{ videos, page, hasMore }`.

### `GET /api/videos/[id]`
Single video detail. 404 when not found.

### `POST /api/videos` · `PATCH /api/videos/[id]` · `DELETE /api/videos/[id]`
Create/update/delete. **Requires admin or teacher role** (JWT). Body mirrors the `Video` type (`title`, `description`, `thumbnail`, `videoUrl`, `hlsUrl`, `duration`, `categoryId`, `visibility`, `isFeatured`, `isTrending`, `tags`, …).

## Upload (chunked, resumable)

### `POST /api/upload/chunk`
Accepts one multipart chunk. Body fields: `chunk` (Blob), `chunkIndex`, `totalChunks`, `uploadId`, `fileName`.
Writes the chunk to the upload temp dir; returns `{ received, chunkIndex, totalChunks }`. Missing/empty chunks return a 400 the client can retry.

### `POST /api/upload/complete`
Body: `{ uploadId, fileName, title, description, categoryId, visibility, isFeatured, isTrending, tags }`.
Assembles chunks → streams to Cloudinary (resumable ChunkedUpload + eager HLS/MP4 transformations) → writes the `videos` doc → returns `{ video }`.

### `POST /api/upload/webhook`
Cloudinary notification endpoint; flips the video to `published` on `eager` completion.

## Catalog

- `GET /api/categories` — all active categories.
- `GET /api/search?q=…&category=…&language=…&duration=…&sort=trending|latest|popular&page=…` — instant search with filters.
- `GET /api/recommendations?videoId=…` — similar videos (tag/shared category scoring, demo-aware).
- `GET /api/share/[id]` — share metadata (title, thumbnail, URL) for link previews.

## Engagement

- `GET /api/comments?videoId=…` / `POST /api/comments` — comments with replies; like/dislike/pin/report supported via `PATCH /api/comments/[id]`.
- `POST /api/notifications` — admin/teacher push notifications to users.

## Admin

- `GET /api/users?role=…&banned=…` — user management (admin).
- `GET /api/analytics` — daily users, watch time, most-watched, top categories, revenue, storage/bandwidth usage (admin).

## Payments

- `POST /api/subscriptions/checkout` — creates a Stripe Checkout Session for `monthly`/`yearly` premium; returns `{ url }`.
- `POST /api/subscriptions/webhook` — Stripe webhook; upgrades the Firestore subscription + records revenue.

## Health

- `GET /api/health` — `{ ok: true, env: 'demo' | 'firebase', time }`. Used by uptime monitors and the dashboard.

---

## Firestore Schema

| Collection        | Document id       | Key fields                                                                 |
| ----------------- | ----------------- | -------------------------------------------------------------------------- |
| `users`           | uid               | `role` (`admin|teacher|user`), `email`, `displayName`, `photoURL`, `isBanned`, `subscription`, `preferences`, `stats` |
| `videos`          | video id          | `title`, `description`, `thumbnail`, `poster`, `videoUrl`, `hlsUrl`, `dashUrl`, `duration`, `categoryId`, `visibility` (`public|private|unlisted`), `ownerId`, `views`, `likes`, `status` (`processing|published`), `resolutions`, `captions`, `chapters`, `isFeatured`, `isTrending`, `createdAt` |
| `categories`      | `cat-<slug>`      | `name`, `slug`, `description`, `color`, `image`, `order`, `isActive`, `videoCount` |
| `comments`        | auto              | `videoId`, `userId`, `text`, `parentId` (replies), `likes`, `dislikes`, `isPinned`, `isReported`, `emojiReactions`, `createdAt` |
| `watchProgress`   | userId            | `{ [videoId]: { position, duration, updatedAt } }` — continue watching    |
| `myList`          | userId            | `{ [videoId]: { addedAt } }` — favorites/bookmarks                          |
| `notifications`   | auto              | `userId`, `type` (`upload|live|video`), `title`, `body`, `read`, `createdAt` |
| `subscriptions`   | auto              | `userId`, `plan` (`free|monthly|yearly`), `status`, `provider` (`stripe|razorpay`), `renewsAt` |
| `analytics`       | `daily-<YYYY-MM-DD>` | `activeUsers`, `newUsers`, `watchTime`, `videoViews`, `revenue`, `topVideos`, `topCategories`, `storageBytes`, `bandwidthBytes` |
| `liveStreams`     | stream id         | `title`, `teacherId`, `status` (`live|ended`), `viewerCount`, `startedAt`  |
| `uploadSessions`  | uploadId          | `userId`, `fileName`, `size`, `chunksReceived`, `totalChunks`, `status`, `createdAt` |
