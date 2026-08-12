// ============================
// Trending Page
// ============================
// Most-viewed videos ranked as a grid.

'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { VideoCard } from '@/components/ui/video-card';
import { useVideoStore } from '@/store/video-store';

export default function TrendingPage() {
  const { trendingVideos, fetchTrendingVideos } = useVideoStore();

  useEffect(() => {
    fetchTrendingVideos();
  }, [fetchTrendingVideos]);

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-8 h-8 text-netflix-red" />
            <h1 className="text-white text-3xl font-bold">Trending Now</h1>
          </div>
          <p className="text-netflix-gray mb-8">What everyone is watching</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trendingVideos.map((video, index) => (
              <VideoCard key={video.id} video={video} index={index} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
