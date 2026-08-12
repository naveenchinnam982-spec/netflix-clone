// ============================
// History Page
// ============================
// Watch history with resume progress bars and clear history.

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Trash2, Play } from 'lucide-react';
import { repo } from '@/lib/repository';
import { useAuthStore } from '@/store/auth-store';
import { formatViews, formatRelativeDate, formatDuration, getWatchProgress } from '@/lib/utils';
import type { WatchHistory } from '@/types';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const user = useAuthStore(s => s.user);
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const items = await repo.getWatchHistory(user.uid);
    setHistory(items);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const clearHistory = async () => {
    if (!user) return;
    toast.success('History cleared');
    setHistory([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-black">
        <div className="max-w-5xl mx-auto px-4 md:px-12 py-8 space-y-4">
          <div className="h-8 w-48 bg-netflix-dark rounded animate-pulse" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-netflix-dark rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-5xl mx-auto px-4 md:px-12 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-netflix-red" />
              <div>
                <h1 className="text-white text-3xl font-bold">Watch History</h1>
                <p className="text-netflix-gray text-sm">{history.length} {history.length === 1 ? 'title' : 'titles'}</p>
              </div>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-2 text-netflix-gray hover:text-red-500 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" /> Clear history
              </button>
            )}
          </div>

          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item) => (
                <a
                  key={item.id}
                  href={`/watch/${item.videoId}`}
                  className="group flex gap-4 bg-netflix-dark/50 border border-white/5 rounded-xl p-3 hover:border-white/20 transition-all"
                >
                  <div className="relative flex-shrink-0 w-40 sm:w-56 aspect-video rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.video.thumbnail} alt={item.video.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-10 h-10 bg-netflix-red rounded-full flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                      {formatDuration(item.video.duration)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="text-white font-medium line-clamp-1 group-hover:text-netflix-red transition-colors">{item.video.title}</h3>
                    <p className="text-netflix-gray text-sm">{formatViews(item.video.views)} views · {formatRelativeDate(item.watchedAt)}</p>
                    <div className="mt-3">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-netflix-red rounded-full"
                          style={{ width: `${getWatchProgress(item.lastPosition, item.video.duration)}%` }}
                        />
                      </div>
                      <p className="text-netflix-gray text-xs mt-1">
                        {item.completed ? 'Completed' : `Resume at ${formatDuration(item.lastPosition)}`}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Clock className="w-16 h-16 text-netflix-gray mx-auto mb-4" />
              <h2 className="text-white text-xl font-medium mb-2">No watch history yet</h2>
              <p className="text-netflix-gray mb-8">Videos you watch will appear here</p>
              <a href="/browse" className="inline-block bg-netflix-red text-white px-8 py-3 rounded font-semibold hover:bg-red-700 transition-colors">
                Browse titles
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
