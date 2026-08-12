// ============================
// Upload Dropzone Component
// ============================
// Professional drag-and-drop upload zone with chunk upload, progress tracking,
// pause/resume, and multi-file support for videos up to 20GB+.

'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileVideo, X, AlertCircle, CheckCircle2, Pause, Play, RefreshCw } from 'lucide-react';
import { cn, formatFileSize, formatSpeed, formatTimeRemaining } from '@/lib/utils';
import { useUpload } from '@/hooks/use-upload';
import { useOnlineStatus } from '@/hooks/use-online-status';
import type { UploadDropzoneProps, UploadStatus, VideoUploadProgress } from '@/types';

const ACCEPTED_TYPES = {
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/x-matroska': ['.mkv'],
  'video/webm': ['.webm'],
};

const MAX_FILE_SIZE = 20 * 1024 * 1024 * 1024; // 20GB

interface UploadItemProps {
  file: File;
  progress: VideoUploadProgress;
  status: UploadStatus;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

function UploadItem({ file, progress, status, onPause, onResume, onCancel, onRetry }: UploadItemProps) {
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isPaused = status === 'paused';
  const isUploading = status === 'uploading';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-netflix-dark/50 backdrop-blur-sm border border-white/10 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {isCompleted ? (
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          ) : isFailed ? (
            <AlertCircle className="w-8 h-8 text-red-500" />
          ) : (
            <FileVideo className="w-8 h-8 text-netflix-red" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{file.name}</p>
          <p className="text-netflix-gray text-xs mt-0.5">
            {formatFileSize(file.size)}
            {isUploading && ` · ${formatSpeed(progress.speed)}`}
            {isUploading && progress.estimatedTimeRemaining > 0 && 
              ` · ${formatTimeRemaining(progress.estimatedTimeRemaining)} remaining`
            }
          </p>

          {/* Progress Bar */}
          {!isCompleted && !isFailed && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-netflix-gray mb-1">
                <span>{progress.percentage}%</span>
                <span>Chunk {progress.chunkIndex}/{progress.totalChunks}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  className={cn(
                    'h-full rounded-full',
                    isPaused ? 'bg-yellow-500' : 'bg-netflix-red'
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isUploading && (
            <button
              onClick={onPause}
              className="p-1.5 text-netflix-gray hover:text-white transition-colors"
              aria-label="Pause"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {isPaused && (
            <button
              onClick={onResume}
              className="p-1.5 text-netflix-gray hover:text-white transition-colors"
              aria-label="Resume"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {isFailed && (
            <button
              onClick={onRetry}
              className="p-1.5 text-netflix-gray hover:text-white transition-colors"
              aria-label="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onCancel}
            className="p-1.5 text-netflix-gray hover:text-red-500 transition-colors"
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function UploadDropzone({
  onFilesSelected,
  maxSize = MAX_FILE_SIZE,
  accept = ACCEPTED_TYPES,
  multiple = true,
  disabled = false,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOnline } = useOnlineStatus();
  const { uploads, startUpload, pauseUpload, resumeUpload, cancelUpload, retryUpload, isUploading } = useUpload();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    validateAndUpload(files);
  }, [disabled, onFilesSelected]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndUpload(files);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onFilesSelected]);

  const validateAndUpload = (files: File[]) => {
    setError(null);

    const validFiles = files.filter(file => {
      const isValidType = Object.keys(accept).includes(file.type);
      const isValidSize = file.size <= maxSize;

      if (!isValidType) {
        setError(`Unsupported format: ${file.name}`);
        return false;
      }
      if (!isValidSize) {
        setError(`File too large: ${file.name}. Max size is ${formatFileSize(maxSize)}`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      startUpload(validFiles);
      onFilesSelected(validFiles);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300',
          isDragging
            ? 'border-netflix-red bg-netflix-red/5 scale-[1.02]'
            : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/[0.07]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={Object.values(accept).join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <motion.div
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className={cn(
            'p-4 rounded-full transition-colors',
            isDragging ? 'bg-netflix-red/20' : 'bg-white/5'
          )}>
            <Upload className={cn(
              'w-10 h-10',
              isDragging ? 'text-netflix-red' : 'text-white/60'
            )} />
          </div>
          <div>
            <p className="text-white text-lg font-medium">
              {isDragging ? 'Drop your files here' : 'Drag & drop your videos here'}
            </p>
            <p className="text-netflix-gray text-sm mt-1">
              or <span className="text-netflix-red hover:underline">browse files</span>
            </p>
          </div>
          <p className="text-netflix-gray text-xs">
            Supports MP4, MOV, AVI, MKV, WEBM · Up to 20GB
          </p>
        </motion.div>

        {/* Online Status Warning */}
        {!isOnline && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 text-yellow-500 text-sm bg-yellow-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>You are offline. Uploads will resume automatically when connected.</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 px-4 py-3 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-medium">
              Upload Queue ({uploads.length})
            </h3>
            {isUploading && (
              <span className="text-netflix-gray text-xs">Uploading...</span>
            )}
          </div>
          {uploads.map((upload) => (
            <UploadItem
              key={upload.id}
              file={upload.file}
              progress={upload.progress}
              status={upload.status}
              onPause={() => pauseUpload(upload.id)}
              onResume={() => resumeUpload(upload.id)}
              onCancel={() => cancelUpload(upload.id)}
              onRetry={() => retryUpload(upload.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
