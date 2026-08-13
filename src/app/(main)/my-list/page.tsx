// ============================
// My List Page
// ============================
// User's saved videos list with grid view and empty state.

'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';
import { VideoCard } from '@/components/ui/video-card';
import { useVideoStore } from '@/store/video-store';

export default function MyListPage() {
  const { myList, videos, fetchVideos } = useVideoStore();

  // My List stores ids; the catalog (videos) is loaded on demand so the
  // saved titles render even when this page is deep-linked to.
  useEffect(() => {
    if (videos.length === 0) fetchVideos();
  }, [videos.length, fetchVideos]);

  const savedVideos = videos.filter(v => myList.includes(v.id));

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-white text-3xl font-bold mb-2">My List</h1>
          <p className="text-netflix-gray mb-8">
            {savedVideos.length} {savedVideos.length === 1 ? 'title' : 'titles'} saved
          </p>

          {savedVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {savedVideos.map((video, index) => (
                <div key={video.id} className="relative group">
                  <VideoCard video={video} index={index} />
                  <button
                    onClick={() => useVideoStore.getState().removeFromMyList(video.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Heart className="w-16 h-16 text-netflix-gray mx-auto mb-4" />
              <h2 className="text-white text-xl font-medium mb-2">Your list is empty</h2>
              <p className="text-netflix-gray mb-8">
                Add titles you want to watch later by clicking the + icon
              </p>
              <a
                href="/browse"
                className="inline-block bg-netflix-red text-white px-8 py-3 rounded font-semibold hover:bg-red-700 transition-colors"
              >
                Browse titles
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
