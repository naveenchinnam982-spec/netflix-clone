// ============================
// Category Card Component
// ============================
// Category card with gradient background, icon, and animated hover effects.

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Film, Sparkles, Music, Globe, Gamepad2, BookOpen, Palette, Radio, Tv, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CategoryCardProps, Category } from '@/types';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'trending': TrendingUp,
  'music': Music,
  'gaming': Gamepad2,
  'education': BookOpen,
  'art': Palette,
  'news': Radio,
  'entertainment': Tv,
  'movies': Film,
  'sports': Globe,
  'technology': Sparkles,
};

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const IconComponent = CATEGORY_ICONS[category.slug] || Film;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className="relative group cursor-pointer"
      onClick={() => onClick?.(category)}
    >
      <Link href={`/category/${category.id}`} className="block">
        <div
          className={cn(
            'relative h-32 md:h-40 rounded-lg overflow-hidden transition-all duration-300',
            'border border-white/10 group-hover:border-white/30'
          )}
          style={{ background: `linear-gradient(135deg, ${category.color || '#E50914'}33, ${category.color || '#E50914'}55)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="relative z-10 p-5 h-full flex flex-col justify-between">
            <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            
            <div>
              <h3 className="text-white text-lg font-bold">{category.name}</h3>
              <p className="text-white/60 text-xs mt-1">
                {category.videoCount || 0} videos
              </p>
            </div>
          </div>

          {/* Animated hover border */}
          <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-white/20 transition-all duration-300" />
        </div>
      </Link>
    </motion.div>
  );
}
