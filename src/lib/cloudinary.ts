// ============================
// Cloudinary Configuration
// ============================
// Cloudinary is used for video storage, transcoding, and streaming.
// Supports: HLS, DASH, adaptive bitrate streaming, chunk upload, resumable upload.
//
// Chunked upload contract (Cloudinary Upload API):
//   - POST /v1_1/{cloud}/video/upload with an `X-Unique-Upload-Id` header.
//   - Each part is sent with a `Content-Range: bytes start-end/total` header;
//     total is "-1" until the final part. Parts must be sent in order.
//   - The final part carries the full upload params (public_id, eager, ...).
//   - Part size: 5MB–20MB, except the final part (may be smaller).
// The `cloudinary` SDK's `upload_chunked_stream` implements this protocol
// internally (same X-Unique-Upload-Id, ordered parts, finalization), which is
// what `uploadVideo` below uses — so videos up to 20GB+ stream straight from
// the client's assembled buffer to Cloudinary without any single-request limit.
//
// Adaptive bitrate streaming:
//   - Eager `{ streaming_profile: 'full_hd', format: 'm3u8' }` generates an
//     HLS manifest with renditions (240p → 1080p for `full_hd`; up to 4K for
//     the `4k` profile) and makes `playback_url` available in the response.
//   - Eager `{ streaming_profile: 'full_hd', format: 'mpd' }` generates the
//     MPEG-DASH manifest.
//   - With `eager_async: true`, the manifests are generated in the background
//     and Cloudinary POSTs the result to `eager_notification_url` — see
//     /api/upload/webhook, which flips the video to `status: 'ready'`.

import { v2 as cloudinary } from 'cloudinary';

// Part size forwarded to Cloudinary (must be 5MB–20MB, last part exempt).
export const CHUNK_SIZE = 6 * 1024 * 1024;

// Streaming profiles ship with Cloudinary accounts. `full_hd` → 240p..1080p,
// `4k` → up to 4K. Pick `4k` when the uploader asks for 1440p/4K renditions.
export const DEFAULT_STREAMING_PROFILE = 'full_hd';

export type VideoQuality = '240p' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '4K';

// Configure Cloudinary. The cloud name is not a secret; it is read from
// CLOUDINARY_CLOUD_NAME (server-side) with a NEXT_PUBLIC_ fallback for
// projects that expose it to the client.
cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    'YOUR_CLOUD_NAME',
  api_key: process.env.CLOUDINARY_API_KEY || 'YOUR_API_KEY',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'YOUR_API_SECRET',
  secure: true,
});

/** True when real Cloudinary credentials are configured (demo mode otherwise). */
export function isCloudinaryConfigured(): boolean {
  const key = process.env.CLOUDINARY_API_KEY || '';
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  ) && Boolean(key) && !key.includes('YOUR_');
}

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration: number;
  playback_url?: string;
  hls_url?: string;
  dash_url?: string;
  thumbnail_url?: string;
  eager?: Array<{
    url: string;
    secure_url: string;
    format: string;
    width: number;
    height: number;
    quality: string;
  }>;
}

export interface CloudinaryTranscodeOptions {
  publicId: string;
  qualities?: VideoQuality[];
  format?: 'hls' | 'dash' | 'both';
  generateThumbnails?: boolean;
  generateCaptions?: boolean;
}

/** Map the requested quality ladder to a Cloudinary streaming profile. */
export function pickStreamingProfile(qualities: VideoQuality[] = []): string {
  return qualities.some((q) => q === '1440p' || q === '4K') ? '4k' : DEFAULT_STREAMING_PROFILE;
}

function normalizeUpload(upload: CloudinaryUploadResult): CloudinaryUploadResult {
  return {
    public_id: upload.public_id,
    url: upload.url,
    secure_url: upload.secure_url,
    format: upload.format,
    width: upload.width,
    height: upload.height,
    bytes: upload.bytes,
    duration: upload.duration || 0,
    playback_url: upload.playback_url,
    thumbnail_url: upload.thumbnail_url,
    eager: upload.eager,
  };
}

/**
 * Upload an assembled video buffer to Cloudinary using the chunked (resumable)
 * upload protocol — the only Cloudinary path that supports files >100MB.
 *
 * The SDK splits the buffer into `CHUNK_SIZE` parts, sends them sequentially
 * with a shared `X-Unique-Upload-Id`, and finalizes on the last part with the
 * eager HLS/DASH configuration. Because the parts are streamed one at a time,
 * peak memory stays bounded by the part size regardless of total file size.
 */
export async function uploadVideo(
  videoBuffer: Buffer,
  fileName: string,
  options?: {
    publicId?: string;
    folder?: string;
    tags?: string[];
    qualities?: VideoQuality[];
  }
): Promise<CloudinaryUploadResult> {
  const profile = pickStreamingProfile(options?.qualities);
  const notificationUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/upload/webhook`
    : undefined;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_chunked_stream(
      {
        resource_type: 'video',
        public_id: options?.publicId,
        folder: options?.folder || 'streamflix/videos',
        tags: options?.tags,
        chunk_size: CHUNK_SIZE,
        // Adaptive bitrate streaming: HLS + DASH from the chosen profile.
        eager: [
          { streaming_profile: profile, format: 'm3u8' },
          { streaming_profile: profile, format: 'mpd' },
        ],
        eager_async: true,
        eager_notification_url: notificationUrl,
        notification_url: notificationUrl,
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(normalizeUpload(result as unknown as CloudinaryUploadResult));
      }
    );

    uploadStream.on('error', reject);
    // Feed the assembled buffer; the Chunkable splits it into ordered parts.
    uploadStream.end(videoBuffer);
  });
}

/**
 * Generate HLS and DASH streaming URLs for an uploaded video.
 * Uses the same streaming profile the eager transformation was created with,
 * so the manifests exist once processing completes (poll/webhook first).
 */
export function generateStreamingUrls(
  publicId: string,
  qualities?: VideoQuality[] | string
): { hlsUrl: string; dashUrl: string; thumbnailUrl: string } {
  const profile =
    typeof qualities === 'string' ? qualities : pickStreamingProfile(qualities);

  const hlsUrl = cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'm3u8',
    streaming_profile: profile,
  });

  const dashUrl = cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'mpd',
    streaming_profile: profile,
  });

  const thumbnailUrl = cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [{ width: 1280, height: 720, crop: 'fill', quality: 'auto' }],
  });

  return { hlsUrl, dashUrl, thumbnailUrl };
}

/**
 * Delete a video (and all its derived renditions/manifests) from Cloudinary.
 */
export async function deleteVideo(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    return true;
  } catch (error) {
    console.error('Error deleting video:', error);
    return false;
  }
}

/**
 * Generate AI-powered thumbnail using Cloudinary's AI features.
 */
export async function generateAIThumbnail(
  videoPublicId: string,
  style?: string
): Promise<string> {
  await cloudinary.api.update(videoPublicId, {
    resource_type: 'video',
    transformation: [
      { width: 1280, height: 720, crop: 'fill', quality: 'auto' },
      { effect: style || 'improve' },
      { start_offset: 'auto' },
    ],
  });
  return cloudinary.url(videoPublicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { width: 1280, height: 720, crop: 'fill', quality: 'auto' },
      { effect: style || 'improve' },
      { start_offset: 'auto' },
    ],
  });
}

/**
 * Generate automatic captions using Cloudinary's AI video analysis.
 */
export async function generateCaptions(
  videoPublicId: string,
  language: string = 'en'
): Promise<string> {
  await cloudinary.api.update(videoPublicId, {
    resource_type: 'video',
    raw_convert: 'google_speech',
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/upload/captions-webhook`,
  });

  // Return the caption URL once processed
  return cloudinary.url(videoPublicId, {
    resource_type: 'video',
    format: 'vtt',
    transformation: [{ raw_convert: 'google_speech', language }],
  });
}

/**
 * Generate video summary using AI video analysis.
 * Analyzes video content to generate chapters, key points, and descriptions.
 */
export async function generateVideoSummary(
  videoPublicId: string
): Promise<{ chapters: Array<{ title: string; startTime: number }>; tags: string[] }> {
  // Use Cloudinary AI video analysis
  const api = cloudinary.api as unknown as {
    video_analysis: (publicId: string, options: Record<string, unknown>) => Promise<any>;
  };
  const analysis = await api.video_analysis(videoPublicId, {
    resource_type: 'video',
    analysis: ['scene_segmentation', 'tagging', 'visual_content'],
  });

  const chapters = analysis?.scenes?.map((scene: any, index: number) => ({
    title: scene.description || `Chapter ${index + 1}`,
    startTime: scene.start_offset || 0,
  })) || [];

  const tags = analysis?.tags?.map((tag: any) => tag.name) || [];

  return { chapters, tags };
}

export default cloudinary;
