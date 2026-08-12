# StreamFlix — Netflix-Style Video Streaming Platform

A production-ready, Netflix-inspired video streaming platform built with **Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, Firebase, Cloudinary, Socket.io and WebRTC** — using an **MVVM architecture** with a repository data layer that transparently falls back to a rich demo dataset when Firebase isn't configured, so the app is fully functional out of the box.

---

## ✨ Highlights

- **Netflix-style UI** — dark premium theme, glassmorphism, Framer Motion animations, loading skeletons, hover cards, fully responsive.
- **Chunked, resumable uploads** — files are sliced into 6 MB chunks, uploaded with parallel concurrency, per-chunk completion tracking, pause/resume/retry, exponential backoff, and auto-resume after connectivity loss. Assembled server-side and transcoded by **Cloudinary** into adaptive-bitrate HLS/DASH (240p → 4K). Supports MP4/MOV/AVI/MKV/WEBM and multi-hour, 20 GB+ files.
- **Netflix-style player** — HLS.js adaptive streaming, auto/manual quality, 10s skip, speed control, PiP, fullscreen, captions, keyboard shortcuts, and **continue watching** from last position.
- **Live streaming** — WebRTC + Socket.io rooms with live chat, raise hand, screen share, camera/mic toggles, recording, attendance, mute users, and a shared whiteboard.
- **Auth** — email + Google sign-in, forgot password, email verification, JWT session cookie, role-based access (admin / teacher / user), demo login.
- **User dashboard** — continue watching, watch history, my list, profile settings, notifications.
- **Admin dashboard** — upload, manage videos, categories, users (ban/unban), analytics, live streams, storage monitoring.
- **Comments** — like/dislike, replies, pinning, report, emoji reactions.
- **Payments** — Stripe checkout + webhook for monthly/yearly premium (Razorpay-ready).
- **Performance** — Server Components, lazy loading, code splitting, image optimization, infinite scroll, Redis caching, rate limiting, edge middleware.
- **PWA, SEO, and analytics** — manifest + generated icons, Open Graph metadata, Google Analytics hookup.

## 🚀 Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
#    → Fill in Firebase public keys (required for auth) and Cloudinary keys (for uploads)

# 3. Run the dev server
npm run dev
```

Open http://localhost:3000. **No configuration is required to see the full product** — without Firebase keys the repository layer serves the built-in demo catalog (with real playable HLS/MP4 streams). Set your keys and the same code automatically reads/writes Firestore.

### Demo accounts

| Role    | Email                   | How to sign in                                 |
| ------- | ----------------------- | ---------------------------------------------- |
| Admin   | `admin@streamflix.dev`  | Click **"Try demo login"** on the login page   |
| Teacher | `teacher@streamflix.dev`| Demo login (role `teacher`)                    |
| User    | `user@streamflix.dev`   | Demo login (role `user`)                       |

> The demo login button signs you in locally with a JWT cookie — no network or Firebase needed, ideal for previewing the admin dashboard and upload flow.

## 📁 Folder Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             #   login, register, forgot-password
│   │   ├── (main)/             #   browse, watch, video, search, trending, latest,
│   │   │                       #   categories, category/[slug], history, my-list,
│   │   │                       #   profile, pricing, live, live/[id], watch-together/[id]
│   │   ├── dashboard/          #   admin: overview, upload, videos, users, categories,
│   │   │                       #   analytics, live, settings
│   │   ├── api/                #   Route Handlers (see docs/API.md)
│   │   └── page.tsx            #   landing page
│   ├── components/
│   │   ├── ui/                 # navbar, hero-banner, video-card, video-row,
│   │   │                       # video-player, upload-dropzone, comment-section, footer
│   │   └── providers.tsx       # theme + store providers
│   ├── hooks/                  # use-upload, use-video-player, use-live-stream,
│   │   │                       # use-auth, use-infinite-scroll, use-online-status, …
│   ├── lib/                    # repository (MVVM data layer), demo-data, firebase,
│   │   │                       # firebase-admin, cloudinary, redis, rate-limit, auth, socket
│   ├── store/                  # zustand stores: auth-store, video-store
│   └── types/index.ts          # shared domain types
├── server/index.js             # standalone Socket.io server (Railway)
├── scripts/seed.mjs            # Firestore seed script
├── scripts/generate-icons.mjs  # PWA icon generator
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
└── public/manifest.json        # PWA manifest
```

## 🔌 Architecture (MVVM)

- **View** — `src/app/**` pages + `src/components/**` (presentation only).
- **ViewModel** — `src/store/*` (zustand) and `src/hooks/*`, exposing state + commands.
- **Model** — `src/lib/repository.ts`, the single gateway to data. It detects whether Firebase is configured and serves either Firestore or the in-memory demo dataset behind the *same interface*, so views never know the difference.
- **API layer** — `src/app/api/**` route handlers (auth, videos, upload, comments, analytics, users, subscriptions, notifications, search) used by client-side mutations; the browser never talks to Firestore/Cloudinary directly.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data flow, security model, and scaling notes, and [docs/API.md](docs/API.md) for the endpoint + Firestore schema reference.

## ☁️ Deployment

- **Frontend** → Vercel (`vercel` CLI, zero config).
- **Socket.io server** → Railway (`server/index.js`, plain Node — no build step).
- **Database** → Firebase Firestore (deploy `firestore.rules` + `storage.rules`).
- **Video storage/transcoding** → Cloudinary (HLS/DASH adaptive streaming).

Full walkthrough with env values in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 🧪 Quality Gates

```bash
npm run type-check   # tsc --noEmit
npm run lint         # next lint
npm run build        # production build
```

## 📄 License

MIT
