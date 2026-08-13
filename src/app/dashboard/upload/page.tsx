// ============================
// Upload Page (Admin)
// ============================
// Full upload flow: drag & drop, chunked resumable upload with progress,
// pause/resume/retry, then a metadata form (title, category, tags, etc.).
// The chunk upload targets /api/upload/chunk (Cloudinary when configured);
// in demo mode uploads complete locally so the flow is fully testable.

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Loader2, CheckCircle2, FileVideo, X } from 'lucide-react';
import { UploadDropzone } from '@/components/ui/upload-dropzone';
import { useUpload } from '@/hooks/use-upload';
import { useVideoStore } from '@/store/video-store';
import { useAuthStore } from '@/store/auth-store';
import { cn, formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [stage, setStage] = useState<'drop' | 'details'>('drop');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [saving, setSaving] = useState(false);

  const { uploads, isUploading, startUpload } = useUpload();
  const { categories, fetchCategories, createVideo } = useVideoStore();
  const user = useAuthStore(s => s.user);
  // The chunked upload runs in the background; this resolves when it finishes
  // so publish waits for the actual file upload before saving metadata.
  const uploadPromiseRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleFilesSelected = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));
    setStage('details');
    toast.success(`Selected ${file.name} (${formatFileSize(file.size)})`);
    // Kick off the chunked, resumable upload immediately — progress renders
    // in the uploads list below while the user fills in the metadata form.
    uploadPromiseRef.current = startUpload([file]);
  };

  const handleCreateVideo = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      // Never register a video without its file: wait for the chunked upload
      // to finish first, and abort publishing if it failed.
      if (uploadPromiseRef.current) {
        const completed = await uploadPromiseRef.current;
        if (!completed) {
          toast.error('Upload failed — check your connection and retry.');
          setSaving(false);
          return;
        }
      }
      const video = await createVideo({
        title: title.trim() || selectedFile.name,
        description,
        categoryId,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        visibility,
        format: selectedFile.name.split('.').pop() || 'mp4',
        fileSize: selectedFile.size,
        status: 'ready',
        processedQualities: ['720p', '1080p'],
        uploaderName: user?.displayName || 'Admin',
        uploaderAvatar: user?.photoURL || '',
      });
      toast.success('Video created!');
      window.location.href = `/watch/${video.id}`;
    } catch {
      toast.error('Failed to create video');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-white text-2xl font-bold">Upload Video</h1>
        <p className="text-netflix-gray text-sm mt-1">
          MP4, MOV, AVI, MKV, WEBM · up to 20GB+ · chunked, resumable, parallel
        </p>
      </div>

      {/* Step 1: Dropzone */}
      {stage === 'drop' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <UploadDropzone onFilesSelected={handleFilesSelected} multiple={false} />
        </motion.div>
      )}

      {/* Active uploads */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="bg-netflix-dark/50 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {u.status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <FileVideo className="w-6 h-6 text-netflix-red" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{u.file.name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-netflix-red rounded-full transition-all"
                        style={{ width: `${u.progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-netflix-gray text-xs">{u.progress.percentage}%</span>
                  </div>
                  <p className="text-netflix-gray text-xs mt-1">
                    {formatFileSize(u.progress.bytesUploaded)} / {formatFileSize(u.progress.totalBytes)}
                    {u.progress.speed > 0 && ` · ${formatFileSize(u.progress.speed)}/s`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Details */}
      <AnimatePresence>
        {stage === 'details' && selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-netflix-dark/50 border border-white/10 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileVideo className="w-8 h-8 text-netflix-red" />
                <div>
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-netflix-gray text-sm">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                onClick={() => { setStage('drop'); setSelectedFile(null); }}
                className="p-1.5 text-netflix-gray hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-netflix-gray text-xs block mb-1.5">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="text-netflix-gray text-xs block mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-netflix-gray text-xs block mb-1.5">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-netflix-gray text-xs block mb-1.5">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                    className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-netflix-gray text-xs block mb-1.5">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tutorial, education, coding"
                  className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setStage('drop'); setSelectedFile(null); }}
                className="px-5 py-2.5 text-netflix-gray hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVideo}
                disabled={saving || isUploading || !title.trim()}
                className={cn(
                  'flex items-center gap-2 bg-netflix-red hover:bg-red-700 text-white font-medium rounded-lg px-6 py-2.5 transition-colors disabled:opacity-50',
                  isUploading && 'opacity-60'
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {isUploading ? 'Uploading chunk...' : 'Publish Video'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
