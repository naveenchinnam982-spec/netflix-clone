#!/usr/bin/env node
// ============================================================================
// verify-upload.mjs
// ============================================================================
// End-to-end verification of the multi-chunk upload pipeline against REAL
// Cloudinary credentials. Proves that a video split into many chunks produces
// a *playable* HLS stream (master playlist -> child playlist -> segment) plus
// a DASH manifest and thumbnail.
//
// Two modes:
//
//   1. DIRECT (default) — exercises the same Cloudinary code path the app's
//      /api/upload/chunk route uses (upload_chunked_stream with 6MB parts,
//      eager HLS + DASH via streaming_profile). No server needed.
//
//   2. --server <baseUrl> — runs the FULL app pipeline: logs in, POSTs every
//      chunk to /api/upload/chunk, finalizes via /api/upload/complete, then
//      verifies the returned HLS URL is playable.
//
// Credentials: reads CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY /
// CLOUDINARY_API_SECRET from the environment or .env.local. Can also be passed
// explicitly with --cloud / --key / --secret.
//
// Usage:
//   node scripts/verify-upload.mjs                            # downloads a ~20MB sample
//   node scripts/verify-upload.mjs --file ./movie.mp4
//   node scripts/verify-upload.mjs --file ./movie.mp4 --chunk-size 3145728
//   node scripts/verify-upload.mjs --server http://localhost:3000
//   node scripts/verify-upload.mjs --file ./movie.mp4 --keep   # keep asset in Media Library
// ============================================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import cloudinaryPkg from 'cloudinary';

const { v2: cloudinary } = cloudinaryPkg;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Config: CLI > process.env > .env.local
// ---------------------------------------------------------------------------
function loadEnvFile() {
  try {
    const raw = fs.readFileSync(path.resolve('.env.local'), 'utf8');
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return env;
  } catch {
    return {};
  }
}

const envFile = loadEnvFile();
const cloud =
  args.cloud || process.env.CLOUDINARY_CLOUD_NAME || envFile.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || envFile.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const key = args.key || process.env.CLOUDINARY_API_KEY || envFile.CLOUDINARY_API_KEY;
const secret = args.secret || process.env.CLOUDINARY_API_SECRET || envFile.CLOUDINARY_API_SECRET;

const CHUNK_SIZE = args['chunk-size'] ? Number(args['chunk-size']) : 6 * 1024 * 1024;
const PROFILE = args.profile || 'full_hd';
const TIMEOUT_MS = args.timeout ? Number(args.timeout) : 180_000;
const KEEP = Boolean(args.keep);
const SERVER = typeof args.server === 'string' ? args.server.replace(/\/$/, '') : null;

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? GREEN('✔') : RED('✘')} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Resolve a local video file (explicit path or downloaded sample)
// ---------------------------------------------------------------------------
const SAMPLE_URLS = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_30s_20MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_10MB.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
];

async function resolveVideo() {
  if (args.file) {
    const p = path.resolve(args.file);
    if (!fs.existsSync(p)) {
      console.error(RED(`File not found: ${p}`));
      process.exit(2);
    }
    return { path: p, source: args.file };
  }
  console.log(CYAN('No --file given; downloading a sample video…'));
  const dest = path.join(os.tmpdir(), `verify-${Date.now()}.mp4`);
  for (const url of SAMPLE_URLS) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(`  downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB from ${url}`);
      return { path: dest, source: url };
    } catch {
      /* try next source */
    }
  }
  console.error(RED('Could not download a sample video (offline?). Pass --file <video> instead.'));
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Playability verification for HLS
// ---------------------------------------------------------------------------
async function fetchText(url) {
  const res = await fetch(url);
  const text = await res.text();
  return { status: res.status, text, contentType: res.headers.get('content-type') || '' };
}

async function waitForOk(url, timeoutMs = TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return { status: 200, text: await res.text() };
      lastStatus = res.status; // 423 = still processing
    } catch {
      /* retry */
    }
    await sleep(3000);
  }
  return { status: lastStatus || -1, text: '' };
}

function resolveUri(base, uri) {
  if (/^https?:\/\//i.test(uri)) return uri;
  const u = new URL(base);
  return new URL(uri, u).toString();
}

async function verifyHlsPlayable(hlsUrl) {
  const master = await waitForOk(hlsUrl);
  check(`HLS master playlist reachable (200)`, master.status === 200, `status=${master.status}`);
  if (master.status !== 200) return;

  check('master is a valid playlist', master.text.startsWith('#EXTM3U'));
  const streamInfs = master.text.split('\n').filter((l) => l.startsWith('#EXT-X-STREAM-INF'));
  check(`≥2 renditions advertised`, streamInfs.length >= 2, `${streamInfs.length} variant streams`);

  // First child playlist (variant stream)
  const lines = master.text.split('\n');
  let childUri = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXT-X-STREAM-INF') && lines[i + 1] && !lines[i + 1].startsWith('#')) {
      childUri = lines[i + 1].trim();
      break;
    }
  }
  check('variant playlist URI found', Boolean(childUri));
  if (!childUri) return;

  const childUrl = resolveUri(hlsUrl, childUri);
  const child = await waitForOk(childUrl);
  check('variant playlist reachable (200)', child.status === 200, `status=${child.status}`);
  if (child.status !== 200) return;

  check('variant is a media playlist', child.text.includes('#EXTINF'));
  const segUri = child.text
    .split('\n')
    .find((l) => l && !l.startsWith('#'));
  check('media segment URI found', Boolean(segUri));
  if (!segUri) return;

  const segUrl = resolveUri(childUrl, segUri);
  const seg = await fetch(segUrl);
  check('first media segment downloads (200)', seg.status === 200, `status=${seg.status}`);
  const segBytes = (await seg.arrayBuffer()).byteLength;
  check('segment has bytes', segBytes > 0, `${(segBytes / 1024).toFixed(0)} KB`);
}

// ---------------------------------------------------------------------------
// Mode 2: FULL app pipeline through a running server
// ---------------------------------------------------------------------------
async function runServerPipeline(videoBuffer, fileName) {
  console.log(BOLD(`\nMode: FULL APP PIPELINE → ${SERVER}`));
  const uploadId = `verify-${Date.now()}`;
  const totalChunks = Math.ceil(videoBuffer.length / CHUNK_SIZE);

  console.log(`\n1) Logging in (demo admin)…`);
  const loginRes = await fetch(`${SERVER}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: 'demo' }),
  });
  const login = await loginRes.json();
  check('login succeeds', loginRes.ok && login.success, login.data?.user?.role || '');
  if (!login.data?.token) return;
  const token = login.data.token;

  console.log(`\n2) Uploading ${totalChunks} chunks (${(CHUNK_SIZE / 1024 / 1024).toFixed(1)} MB each)…`);
  let videoPayload = null;
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const part = videoBuffer.subarray(start, Math.min(start + CHUNK_SIZE, videoBuffer.length));
    const form = new FormData();
    form.append('chunk', new Blob([part]), fileName);
    form.append('chunkIndex', String(i));
    form.append('totalChunks', String(totalChunks));
    form.append('uploadId', uploadId);
    form.append('fileName', fileName);

    const res = await fetch(`${SERVER}/api/upload/chunk`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      check(`chunk ${i + 1}/${totalChunks}`, false, json.error || res.status);
      return;
    }
    if (json.video) videoPayload = json.video;
    process.stdout.write(`  chunk ${i + 1}/${totalChunks} ${GREEN('✔')}\n`);
  }
  check('all chunks accepted', true, `${totalChunks} chunks`);

  console.log(`\n3) Finalizing /api/upload/complete…`);
  const completeRes = await fetch(`${SERVER}/api/upload/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      uploadId,
      title: `Verify ${new Date().toISOString()}`,
      description: 'Created by scripts/verify-upload.mjs',
      categoryId: '1',
      visibility: 'unlisted',
      fileSize: videoBuffer.length,
      format: fileName.split('.').pop() || 'mp4',
      ...(videoPayload || {}),
    }),
  });
  const complete = await completeRes.json();
  check('complete succeeds', completeRes.ok && complete.success, complete.error || '');

  const hlsUrl = videoPayload?.hlsUrl || complete?.data?.hlsUrl;
  check('HLS URL returned by pipeline', Boolean(hlsUrl), hlsUrl || '');
  if (!hlsUrl) return;

  console.log(`\n4) Verifying HLS playability…`);
  await verifyHlsPlayable(hlsUrl);
  console.log(`\n  dashboard route: ${CYAN(`${SERVER}/video/${complete?.data?.id || ''}`)}`);
}

// ---------------------------------------------------------------------------
// Mode 1: DIRECT Cloudinary chunked upload (same options as production)
// ---------------------------------------------------------------------------
async function runDirectPipeline(videoBuffer, fileName) {
  console.log(BOLD('\nMode: DIRECT CLOUDINARY CHUNKED UPLOAD (as /api/upload/chunk does)'));
  const totalChunks = Math.ceil(videoBuffer.length / CHUNK_SIZE);
  console.log(`\n  file: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB → ${totalChunks} chunk(s) of ${(CHUNK_SIZE / 1024 / 1024).toFixed(1)} MB`);
  if (totalChunks < 2) {
    console.log(YELLOW('  ⚠ Only one chunk — use a larger file or --chunk-size to exercise multi-chunk upload.'));
  }

  const publicId = `verify/upload-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  console.log(`\n  public_id: ${publicId}\n`);

  let result;
  try {
    result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_chunked_stream(
        {
          resource_type: 'video',
          public_id: publicId,
          folder: 'streamflix/verify',
          chunk_size: CHUNK_SIZE,
          eager: [
            { streaming_profile: PROFILE, format: 'm3u8' },
            { streaming_profile: PROFILE, format: 'mpd' },
          ],
          eager_async: true,
          overwrite: true,
        },
        (error, res) => (error ? reject(error) : resolve(res))
      );
      stream.on('error', reject);
      stream.end(videoBuffer);
    });
  } catch (err) {
    console.error(RED(`  Cloudinary upload failed: ${err?.message || err}`));
    failures++;
    return;
  }

  check('chunked upload to Cloudinary succeeded', Boolean(result?.public_id), `duration=${result?.duration ?? '?'}s`);
  if (!result?.public_id) return;

  const hlsUrl = cloudinary.url(publicId, { resource_type: 'video', format: 'm3u8', streaming_profile: PROFILE });
  const dashUrl = cloudinary.url(publicId, { resource_type: 'video', format: 'mpd', streaming_profile: PROFILE });
  const thumbUrl = cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [{ width: 1280, height: 720, crop: 'fill', quality: 'auto' }],
  });

  console.log(`\n4) Waiting for eager HLS/DASH processing (async)…`);
  check('HLS master playlist eventually returns 200', (await waitForOk(hlsUrl)).status === 200);
  await verifyHlsPlayable(hlsUrl);

  const dash = await waitForOk(dashUrl);
  check('DASH manifest reachable', dash.status === 200 && dash.text.includes('<MPD'), `status=${dash.status}`);

  const thumb = await fetch(thumbUrl);
  check('thumbnail generated', thumb.status === 200 && (thumb.headers.get('content-type') || '').startsWith('image'), thumb.headers.get('content-type') || '');

  if (!KEEP) {
    console.log(`\n5) Cleanup — destroying asset…`);
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true });
    check('asset destroyed', true, publicId);
  } else {
    console.log(YELLOW(`\n  --keep: asset retained — view it in the Cloudinary Media Library (public_id ${publicId})`));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(BOLD('\nStreamflix — multi-chunk upload → playable HLS verification\n'));

  if (!cloud || !key || !secret || String(key).includes('YOUR_') || String(secret).includes('YOUR_')) {
    console.error(RED('Missing Cloudinary credentials.'));
    console.error(`  Add to .env.local:\n`);
    console.error(`    CLOUDINARY_CLOUD_NAME=your-cloud\n    CLOUDINARY_API_KEY=your-key\n    CLOUDINARY_API_SECRET=your-secret\n`);
    console.error(`  or pass --cloud / --key / --secret.`);
    process.exit(2);
  }

  cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret, secure: true });

  const { path: videoPath, source } = await resolveVideo();
  const fileName = path.basename(videoPath);
  const videoBuffer = fs.readFileSync(videoPath);
  console.log(`  input: ${CYAN(source)} (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

  if (SERVER) {
    await runServerPipeline(videoBuffer, fileName);
  } else {
    await runDirectPipeline(videoBuffer, fileName);
  }

  console.log(BOLD(failures === 0 ? `\n${GREEN('PASS — all checks succeeded ✔')}\n` : `\n${RED(`FAIL — ${failures} check(s) failed ✘`)}\n`));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(RED(`\nUnexpected error: ${err?.message || err}`));
  process.exit(1);
});
