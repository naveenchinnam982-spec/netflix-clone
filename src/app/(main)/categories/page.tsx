// ============================
// Categories Page
// ============================
// Grid of all categories with video counts, linking to per-category pages.

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { useVideoStore } from '@/store/video-store';

export default function CategoriesPage() {
  const { categories, fetchCategories, videos, fetchVideos } = useVideoStore();

  useEffect(() => {
    fetchCategories();
    if (videos.length === 0) fetchVideos();
  }, [fetchCategories, fetchVideos, videos.length]);

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-white text-3xl font-bold mb-2">Categories</h1>
          <p className="text-netflix-gray mb-8">Browse content by genre</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category, index) => {
              const count = videos.filter(v => v.categoryId === category.id).length;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/category/${category.slug}`}
                    className="group relative overflow-hidden rounded-xl bg-netflix-dark border border-white/5 hover:border-white/20 transition-all hover:scale-[1.02] block"
                  >
                    <div
                      className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
                      style={{ background: `linear-gradient(135deg, ${category.color}, transparent)` }}
                    />
                    <div className="relative p-6 min-h-[120px] flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <FolderOpen className="w-8 h-8" style={{ color: category.color }} />
                        <ChevronRight className="w-5 h-5 text-netflix-gray group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                      <div>
                        <h3 className="text-white text-lg font-semibold">{category.name}</h3>
                        <p className="text-netflix-gray text-sm">{count} {count === 1 ? 'title' : 'titles'}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
