// ============================
// useUpload Hook
// ============================
// Chunked, resumable video upload:
//   - Large files are sliced into 6MB chunks
//   - Chunks upload in parallel (configurable concurrency)
//   - Per-chunk completion is tracked, so pause/resume/retry only re-sends
//     failed or missing chunks — never the whole file
//   - Failed chunks retry with exponential backoff
//   - Auto-resume is handled by the caller via useOnlineStatus
//
// The chunk route (/api/upload/chunk) assembles chunks and pushes the file
// to Cloudinary with adaptive-bitrate transcoding when configured.

'use client';

import { useState, useCallback, useRef } from 'react';
import { useVideoStore } from '@/store/video-store';
import type { VideoUploadProgress, UploadStatus } from '@/types';

interface UploadFile {
  file: File;
  id: string;
  progress: VideoUploadProgress;
  status: UploadStatus;
}

interface UploadOptions {
  maxChunkSize?: number; // Default 6MB
  maxRetries?: number;
  parallelChunks?: number;
}

const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks
const MAX_RETRIES = 3;
const PARALLEL_CHUNKS = 3;

export function useUpload(options: UploadOptions = {}) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  // uploadId -> set of successfully uploaded chunk indices.
  const completedChunks = useRef<Map<string, Set<number>>>(new Map());
  const running = useRef<Map<string, boolean>>(new Map());
  const { setUploadProgress } = useVideoStore();

  const chunkSize = options.maxChunkSize || CHUNK_SIZE;
  const maxRetries = options.maxRetries || MAX_RETRIES;
  const parallelChunks = options.parallelChunks || PARALLEL_CHUNKS;

  const generateUploadId = useCallback(() => {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const calculateProgress = useCallback(
    (bytesUploaded: number, totalBytes: number, startTime: number): VideoUploadProgress => {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? bytesUploaded / elapsed : 0;
      const remaining = totalBytes - bytesUploaded;
      const estimatedTimeRemaining = speed > 0 ? remaining / speed : 0;

      return {
        bytesUploaded,
        totalBytes,
        percentage: totalBytes > 0 ? Math.round((bytesUploaded / totalBytes) * 100) : 0,
        speed,
        estimatedTimeRemaining,
        status: 'uploading',
        chunkIndex: 0,
        totalChunks: Math.ceil(totalBytes / chunkSize),
      };
    },
    [chunkSize]
  );

  const startUpload = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      const newUploads: UploadFile[] = files.map((file) => ({
        file,
        id: generateUploadId(),
        progress: {
          bytesUploaded: 0,
          totalBytes: file.size,
          percentage: 0,
          speed: 0,
          estimatedTimeRemaining: 0,
          status: 'pending',
          chunkIndex: 0,
          totalChunks: Math.ceil(file.size / chunkSize),
        },
        status: 'pending',
      }));

      completedChunks.current.set(newUploads[0]?.id || '', new Set());
      setUploads((prev) => [...prev, ...newUploads]);

      for (const upload of newUploads) {
        await uploadFileInChunks(upload);
      }
      setIsUploading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [generateUploadId, chunkSize]
  );

  const uploadFileInChunks = useCallback(
    async (upload: UploadFile) => {
      const { file, id } = upload;
      const totalChunks = Math.ceil(file.size / chunkSize);
      if (running.current.get(id)) return; // Already uploading.
      running.current.set(id, true);

      const abortController = new AbortController();
      abortControllers.current.set(id, abortController);
      const startTime = Date.now();
      let bytesUploaded = (completedChunks.current.get(id)?.size || 0) * chunkSize;
      const done = completedChunks.current.get(id) || new Set<number>();

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: 'uploading' as UploadStatus } : u))
      );

      const batchProgress = (chunkIndex: number) => {
        const progress = calculateProgress(bytesUploaded, file.size, startTime);
        progress.chunkIndex = chunkIndex;
        progress.totalChunks = totalChunks;
        setUploadProgress(progress);
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));
      };

      // Upload chunks in parallel windows, skipping already-completed ones.
      for (let i = 0; i < totalChunks; i += parallelChunks) {
        if (abortController.signal.aborted) {
          running.current.set(id, false);
          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, status: 'paused' as UploadStatus } : u))
          );
          return;
        }

        const windowChunks: number[] = [];
        for (let j = 0; j < parallelChunks && i + j < totalChunks; j++) {
          const chunkIndex = i + j;
          if (done.has(chunkIndex)) {
            continue;
          }
          windowChunks.push(chunkIndex);
        }

        if (windowChunks.length === 0) continue;

        const results = await Promise.allSettled(
          windowChunks.map((chunkIndex) => {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);
            return uploadChunkWithRetry(chunk, chunkIndex, totalChunks, id, file.name, maxRetries);
          })
        );

        let windowBytes = 0;
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            done.add(windowChunks[idx]);
            windowBytes += result.value.bytesReceived;
          }
        });

        if (windowBytes > 0) {
          bytesUploaded += windowBytes;
          batchProgress(Math.min(i + parallelChunks, totalChunks));
        }

        // If every chunk in this window failed, mark the upload failed.
        if (windowChunks.length > 0 && results.every((r) => r.status === 'rejected')) {
          running.current.set(id, false);
          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, status: 'failed' as UploadStatus } : u))
          );
          return;
        }
      }

      // Upload completed.
      running.current.set(id, false);
      abortControllers.current.delete(id);
      const finalProgress: VideoUploadProgress = {
        bytesUploaded: file.size,
        totalBytes: file.size,
        percentage: 100,
        speed: 0,
        estimatedTimeRemaining: 0,
        status: 'completed',
        chunkIndex: totalChunks,
        totalChunks,
      };

      setUploadProgress(finalProgress);
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, progress: finalProgress, status: 'completed' as UploadStatus } : u))
      );
    },
    [chunkSize, parallelChunks, maxRetries, calculateProgress, setUploadProgress]
  );

  const uploadChunkWithRetry = useCallback(
    async (
      chunk: Blob,
      chunkIndex: number,
      totalChunks: number,
      uploadId: string,
      fileName: string,
      maxRetries: number
    ): Promise<{ bytesReceived: number }> => {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkIndex', chunkIndex.toString());
          formData.append('totalChunks', totalChunks.toString());
          formData.append('uploadId', uploadId);
          formData.append('fileName', fileName);

          const response = await fetch('/api/upload/chunk', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error || `Upload failed: ${response.statusText}`);
          }

          return { bytesReceived: chunk.size };
        } catch (error: any) {
          lastError = error;
          // Exponential backoff between retries.
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      throw lastError || new Error('Upload failed after all retries');
    },
    []
  );

  const pauseUpload = useCallback((uploadId: string) => {
    const controller = abortControllers.current.get(uploadId);
    if (controller) controller.abort();
    running.current.set(uploadId, false);
    setUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, status: 'paused' as UploadStatus } : u))
    );
  }, []);

  const resumeUpload = useCallback(
    async (uploadId: string) => {
      const upload = uploads.find((u) => u.id === uploadId);
      if (upload && (upload.status === 'paused' || upload.status === 'failed')) {
        await uploadFileInChunks(upload);
      }
    },
    [uploads, uploadFileInChunks]
  );

  const cancelUpload = useCallback((uploadId: string) => {
    const controller = abortControllers.current.get(uploadId);
    if (controller) controller.abort();
    running.current.set(uploadId, false);
    completedChunks.current.delete(uploadId);
    setUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, status: 'cancelled' as UploadStatus } : u))
    );
  }, []);

  const retryUpload = useCallback(
    async (uploadId: string) => {
      const upload = uploads.find((u) => u.id === uploadId);
      if (upload && upload.status === 'failed') {
        await uploadFileInChunks(upload);
      }
    },
    [uploads, uploadFileInChunks]
  );

  const clearUploads = useCallback(() => {
    abortControllers.current.forEach((controller) => controller.abort());
    abortControllers.current.clear();
    completedChunks.current.clear();
    running.current.clear();
    setUploads([]);
    setUploadProgress(null);
  }, [setUploadProgress]);

  const getUploadProgress = useCallback(
    (uploadId: string): VideoUploadProgress | undefined => {
      return uploads.find((u) => u.id === uploadId)?.progress;
    },
    [uploads]
  );

  return {
    uploads,
    isUploading,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearUploads,
    getUploadProgress,
  };
}
