// ============================
// Upload Chunk API
// ============================
// Receives video chunks from the client (POST /api/upload/chunk, multipart).
//
// Pipeline:
//   1. Client slices a large file (up to 20GB+) into 6MB chunks and uploads
//      them (parallel, with retry). Chunk indices are idempotent.
//   2. This route assembles chunks in memory keyed by uploadId.
//   3. On the final chunk, the full buffer is pushed to Cloudinary's
//      chunked upload stream with eager adaptive-bitrate transcoding
//      (240p–1080p/4K) and HLS manifests.
//   4. The client then calls /api/upload/complete with metadata to create
//      the Firestore video document.
//
// When Cloudinary is not configured (demo mode), chunks are accepted and
// the flow completes locally so the UI is fully testable.

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { isCloudinaryConfigured } from '@/lib/cloudinary';

const ASSEMBLY_TTL = 60 * 60 * 1000; // 1 hour per upload

interface Assembly {
  uploadId: string;
  fileName: string;
  fileType: string;
  chunks: Map<number, Buffer>;
  totalChunks: number;
  received: number;
  lastSeen: number;
}

const assemblies = new Map<string, Assembly>();

// Reap stale assemblies so memory stays bounded.
setInterval(() => {
  const now = Date.now();
  for (const [id, assembly] of assemblies) {
    if (now - assembly.lastSeen > ASSEMBLY_TTL) assemblies.delete(id);
  }
}, 5 * 60_000).unref?.();

export async function POST(request: NextRequest) {
  const user = requireRole(request, ['admin', 'teacher']);
  if (!user) return NextResponse.json({ success: false, error: 'Upload access required' }, { status: 403 });

  const limited = rateLimit(request, { limit: 300, windowMs: 60_000, keyPrefix: 'upload-chunk' });
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const chunkFile = formData.get('chunk');
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const uploadId = formData.get('uploadId') as string;
    const fileName = formData.get('fileName') as string;

    if (!chunkFile || Number.isNaN(chunkIndex) || Number.isNaN(totalChunks) || !uploadId) {
      return NextResponse.json({ success: false, error: 'Missing chunk metadata' }, { status: 400 });
    }

    const chunk = Buffer.from(await (chunkFile as File).arrayBuffer());

    // ---- Demo mode: no Cloudinary, accept and acknowledge chunks ----
    if (!isCloudinaryConfigured()) {
      return NextResponse.json({ success: true, bytesReceived: chunk.length, chunkIndex, totalChunks, uploadId, complete: chunkIndex === totalChunks - 1 });
    }

    // ---- Assemble ----
    let assembly = assemblies.get(uploadId);
    if (!assembly) {
      assembly = { uploadId, fileName, fileType: fileName.split('.').pop() || 'mp4', chunks: new Map(), totalChunks, received: 0, lastSeen: Date.now() };
      assemblies.set(uploadId, assembly);
    }
    assembly.totalChunks = totalChunks;
    assembly.lastSeen = Date.now();

    // Idempotent: re-sent chunks overwrite instead of duplicating.
    if (!assembly.chunks.has(chunkIndex)) {
      assembly.chunks.set(chunkIndex, chunk);
      assembly.received += chunk.length;
    }

    // ---- Final chunk: transcode & store ----
    if (chunkIndex === totalChunks - 1) {
      // Reassemble in index order (chunks may arrive out of order in parallel).
      const buffer = Buffer.concat(
        [...assembly.chunks.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, data]) => data)
      );
      const isComplete = assembly.chunks.size === totalChunks;

      if (isComplete) {
        const { uploadVideo } = await import('@/lib/cloudinary');
        const QUALITIES = ['240p', '360p', '480p', '720p', '1080p'] as const;
        const result = await uploadVideo(buffer, fileName, {
          folder: 'streamflix/videos',
          qualities: [...QUALITIES],
        });

        const { generateStreamingUrls } = await import('@/lib/cloudinary');
        const streaming = await generateStreamingUrls(result.public_id, [...QUALITIES]);

        assemblies.delete(uploadId);
        return NextResponse.json({
          success: true,
          complete: true,
          uploadId,
          video: {
            videoUrl: result.secure_url,
            playbackUrl: result.playback_url || result.secure_url,
            hlsUrl: streaming.hlsUrl,
            dashUrl: streaming.dashUrl,
            thumbnail: streaming.thumbnailUrl,
            duration: Math.round(result.duration || 0),
            publicId: result.public_id,
            fileSize: result.bytes,
            format: result.format,
          },
        });
      }
    }

    return NextResponse.json({ success: true, bytesReceived: chunk.length, chunkIndex, totalChunks, uploadId, complete: false });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Chunk upload failed' }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
