# Deployment

## 1. Frontend → Vercel

```bash
npm i -g vercel
vercel
```

Zero-config: the framework auto-detects Next.js. Set every non-`NEXT_PUBLIC_` variable in **Vercel Project Settings → Environment Variables** (see checklist below).

Notes:

- **Serverless function size**: the upload routes assemble chunks on disk, so keep function memory ≥ 1 GB (`vercel.json` can set `maxDuration: 300` for upload endpoints).
- **Temp storage**: Vercel functions have ephemeral `/tmp`. Chunk assembly works within one invocation (chunks are streamed to Cloudinary incrementally), but for very large files (20 GB+) prefer a persistent worker — the included `server/` Socket.io box or Railway job can own the assembly step. The chunk/complete contract is storage-agnostic by design.

## 2. Socket.io backend → Railway

`server/index.js` is plain Node (no build step, no TypeScript).

```bash
# Deploy via the Railway dashboard: New Project → Deploy from repo → set root = server/
# or from the CLI:
railway up --dir server
```

- Set `PORT` (default 4000) and optionally `REDIS_URL` for multi-instance scaling (Redis adapter).
- Set `CORS_ORIGIN` (default `http://localhost:3000`) to your production origin.
- Point the frontend at it: `NEXT_PUBLIC_SOCKET_URL=https://<your-app>.up.railway.app`.

## 3. Firebase setup

1. Console → Project → **Authentication**: enable Email/Password + Google.
2. **Firestore**: create database (production mode), then deploy rules:

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules
```

3. Copy the web app config into `NEXT_PUBLIC_FIREBASE_*`.
4. Generate a service account (**Project Settings → Service accounts → Generate new private key**) and paste the JSON into `FIREBASE_SERVICE_ACCOUNT_KEY` (single-line string).
5. Seed the catalog:

```bash
node scripts/seed.mjs
```

6. For local auth you can create the admin user with the demo flow or via Firebase console; `scripts/seed.mjs` also upserts `demo-admin`, `demo-teacher`, `demo-user`.

## 4. Cloudinary (video storage + transcoding)

1. Create a Cloudinary account → copy **Cloud Name, API Key, API Secret** into `CLOUDINARY_*`.
2. The upload pipeline uses Cloudinary's **resumable ChunkedUpload** and `eager` transformations to generate adaptive HLS (240p→1080p) + MP4 renditions — no extra config needed beyond the env keys.
3. Register the webhook URL `https://<your-app>.vercel.app/api/upload/webhook` as a notification endpoint if you want `processing → published` transitions.

## 5. Environment checklist

| Variable | Where | Required |
| -------- | ----- | -------- |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_URL` | Vercel | ✅ |
| `NEXT_PUBLIC_FIREBASE_*` (6–7 keys) | Vercel | ✅ for prod auth |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Vercel | ✅ for Firestore writes |
| `JWT_SECRET` | Vercel | ✅ |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Vercel | ✅ for uploads |
| `REDIS_URL` | Vercel + Railway | optional |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel | optional |
| `RAZORPAY_KEY_ID` / `KEY_SECRET` | Vercel | optional |
| `SMTP_*`, `OPENAI_API_KEY`, `ASSEMBLYAI_API_KEY` | Vercel | optional |

Generate `JWT_SECRET` with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 6. Post-deploy checks

- [ ] `GET /api/health` returns 200.
- [ ] Browse/search/player work without Firebase (demo mode) *and* with Firebase.
- [ ] Admin upload of a small MP4 completes and produces an HLS stream.
- [ ] `firebase deploy --only firestore:rules` succeeded (rules block non-owner writes).
- [ ] Socket.io: two tabs join the same live stream and chat works (or the demo fallback shows).
