// ============================
// Video Row Component
// ============================
// Netflix-inspired horizontal scrolling row of video cards with navigation arrows.

'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { VideoCard } from './video-card';
import type { Video } from '@/types';

interface VideoRowProps {
  title: string;
  videos: Video[];
  loading?: boolean;
  /** Renders a "See All" link next to the title (e.g. linking to a category page). */
  onSeeAll?: () => void;
}

function VideoRowSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-6 w-48 bg-netflix-light rounded animate-pulse" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[250px] aspect-video bg-netflix-light rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function VideoRow({ title, videos, loading = false, onSeeAll }: VideoRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      const targetScroll = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  if (loading) return <VideoRowSkeleton />;
  if (!videos.length) return null;

  return (
    <div className="relative group/row">
      {/* Category Title */}
      <div className="flex items-center justify-between mb-4 ml-4 md:ml-12 pr-4">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl md:text-2xl text-white font-bold"
        >
          {title}
        </motion.h2>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-xs font-semibold uppercase tracking-wider text-netflix-gray hover:text-white transition-colors"
          >
            See All ›
          </button>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hover:bg-black/70"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Videos */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-4 md:px-12 py-2 cursor-grab active:cursor-grabbing"
          style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
        >
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[260px] lg:w-[280px] transition-all duration-300 hover:scale-105 hover:z-10"
            >
              <VideoCard
                video={video}
                index={index}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hover:bg-black/70"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
