// ============================
// Category Page
// ============================
// All videos in a category, rendered as a responsive grid.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { VideoCard } from '@/components/ui/video-card';
import { useVideoStore } from '@/store/video-store';
import type { Video } from '@/types';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { categories, fetchCategories, getVideosByCategory } = useVideoStore();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const category = categories.find(c => c.slug === slug);

  useEffect(() => {
    const load = async () => {
      await fetchCategories();
      const cat = useVideoStore.getState().categories.find(c => c.slug === slug);
      if (cat) {
        const list = await getVideosByCategory(cat.id);
        setVideos(list);
      }
      setLoading(false);
    };
    load();
  }, [slug, fetchCategories, getVideosByCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-black">
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
          <div className="h-8 w-56 bg-netflix-dark rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-video bg-netflix-dark rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-white text-3xl font-bold mb-2">{category?.name || 'Category'}</h1>
          {category?.description && <p className="text-netflix-gray mb-8">{category.description}</p>}

          {videos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {videos.map((video, index) => (
                <VideoCard key={video.id} video={video} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-netflix-gray">No videos in this category yet</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
