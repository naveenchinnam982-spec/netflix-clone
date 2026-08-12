// ============================
// Video Card Component
// ============================
// Netflix-inspired video card with hover preview, gradient overlay, and action buttons.

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Plus, ThumbsUp, ChevronDown, Clock } from 'lucide-react';
import { cn, formatDuration, formatViews, formatRelativeDate } from '@/lib/utils';
import type { VideoCardProps } from '@/types';

export function VideoCard({ video, index = 0, isHero = false, showDescription = false, onPlay, onAddToList }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setIsHovered(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={cn(
        'relative group cursor-pointer',
        isHero ? 'col-span-2 row-span-2' : ''
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/video/${video.id}`} className="block">
        <div className="relative aspect-video rounded-md overflow-hidden bg-netflix-dark">
          {/* Thumbnail */}
          <Image
            src={video.thumbnail || '/images/placeholder.jpg'}
            alt={video.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            className={cn(
              'object-cover transition-all duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0',
              isHovered ? 'scale-110' : 'scale-100'
            )}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />

          {/* Loading Skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-netflix-light animate-pulse" />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-card opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Duration Badge */}
          {video.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-medium">
              {formatDuration(video.duration)}
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute top-2 left-2 flex items-center gap-2">
            {video.quality?.includes('4K') && (
              <span className="bg-netflix-red text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                ULTRA HD
              </span>
            )}
            {video.quality?.includes('1080p') && (
              <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                HD
              </span>
            )}
          </div>

          {/* Hover Preview */}
          {isHovered && video.videoUrl && (
            <div className="absolute inset-0 z-10">
              <video
                src={video.videoUrl}
                className="w-full h-full object-cover"
                muted
                autoPlay
                loop
                playsInline
                preload="metadata"
              />
            </div>
          )}

          {/* Play Button Overlay */}
          <div className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-200',
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          )}>
            <div className="w-12 h-12 bg-netflix-red rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* Card Info */}
        <div className="mt-2 space-y-1">
          <h3 className="text-sm text-white font-medium line-clamp-1 group-hover:text-white transition-colors">
            {video.title}
          </h3>
          
          {showDescription && (
            <p className="text-xs text-netflix-gray line-clamp-2">
              {video.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-netflix-gray">
            <span className="text-green-500 font-medium">
              {Math.round((video.likes / Math.max(video.views, 1)) * 100)}% Match
            </span>
            <span>{formatRelativeDate(video.createdAt)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-netflix-gray">
            <span>{formatViews(video.views)} views</span>
            {video.category && (
              <>
                <span>·</span>
                <span>{video.category.name}</span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Hover Actions */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-2 right-2 z-20 flex flex-col gap-1"
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              onPlay?.(video);
            }}
            className="p-1.5 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
            aria-label="Play"
          >
            <Play className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onAddToList?.(video);
            }}
            className="p-1.5 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
            aria-label="Add to list"
          >
            <Plus className="w-3 h-3 text-white" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
