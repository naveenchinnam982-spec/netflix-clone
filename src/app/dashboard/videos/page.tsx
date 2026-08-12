// ============================
// Videos Management (Admin)
// ============================
// Manage all videos: edit metadata, toggle visibility, delete.

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Eye, EyeOff, Play, Search } from 'lucide-react';
import { useVideoStore } from '@/store/video-store';
import { formatViews, formatFileSize, formatRelativeDate, formatDuration } from '@/lib/utils';
import type { Video } from '@/types';
import toast from 'react-hot-toast';

export default function VideosPage() {
  const { videos, fetchVideos, updateVideo, deleteVideo } = useVideoStore();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (videos.length === 0) fetchVideos();
  }, [videos.length, fetchVideos]);

  const filtered = videos.filter(
    v => v.title.toLowerCase().includes(query.toLowerCase()) || v.uploaderName?.toLowerCase().includes(query.toLowerCase())
  );

  const saveEdit = async () => {
    if (!editing) return;
    await updateVideo(editing.id, { title: editTitle, description: editDescription });
    toast.success('Video updated');
    setEditing(null);
  };

  const handleDelete = async (video: Video) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    await deleteVideo(video.id);
    toast.success('Video deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Videos</h1>
          <p className="text-netflix-gray text-sm">{videos.length} total</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-netflix-gray" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos..."
            className="bg-netflix-light text-white text-sm border border-white/10 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-white/30"
          />
        </div>
      </div>

      <div className="bg-netflix-dark/50 border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-netflix-gray">
                <th className="px-4 py-3 font-medium">Video</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Views</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((video) => (
                <tr key={video.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-[260px]">
                      <div className="relative w-28 aspect-video rounded overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={video.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 rounded">
                          {formatDuration(video.duration)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{video.title}</p>
                        <p className="text-netflix-gray text-xs">{formatRelativeDate(video.createdAt)} · {video.uploaderName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-netflix-gray">{video.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-netflix-gray">{formatViews(video.views)}</td>
                  <td className="px-4 py-3 text-netflix-gray">{video.fileSize ? formatFileSize(video.fileSize) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={video.status === 'ready'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full text-xs'
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-xs'}>
                      {video.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/watch/${video.id}`} className="p-2 text-netflix-gray hover:text-white transition-colors" title="Watch">
                        <Play className="w-4 h-4" />
                      </a>
                      <button
                        onClick={async () => {
                          await updateVideo(video.id, { visibility: video.visibility === 'private' ? 'public' : 'private' });
                          toast.success(video.visibility === 'private' ? 'Made public' : 'Made private');
                        }}
                        className="p-2 text-netflix-gray hover:text-white transition-colors"
                        title="Toggle visibility"
                      >
                        {video.visibility === 'private' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setEditing(video); setEditTitle(video.title); setEditDescription(video.description); }}
                        className="p-2 text-netflix-gray hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(video)}
                        className="p-2 text-netflix-gray hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-netflix-gray">
                    No videos found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setEditing(null)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-netflix-dark border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4"
          >
            <h3 className="text-white font-semibold text-lg">Edit Video</h3>
            <div>
              <label className="text-netflix-gray text-xs block mb-1.5">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="text-netflix-gray text-xs block mb-1.5">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="px-5 py-2.5 text-netflix-gray hover:text-white transition-colors">Cancel</button>
              <button onClick={saveEdit} className="bg-netflix-red hover:bg-red-700 text-white font-medium rounded-lg px-6 py-2.5 transition-colors">Save</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
