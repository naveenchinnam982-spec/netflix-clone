// ============================
// Hero Banner Component
// ============================
// Netflix-inspired hero banner with featured video, gradient overlays, autoplay, and action buttons.

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Info, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import type { HeroBannerProps } from '@/types';

export function HeroBanner({ video, onPlay: _onPlay, onMyList }: HeroBannerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      video.play().catch(() => {
        // Autoplay was prevented by the browser — the play button remains visible.
      });
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [video?.videoUrl]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  if (!video) {
    return <div className="relative h-[80vh] bg-netflix-darker animate-pulse" />;
  }

  return (
    <div className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0">
        {video.videoUrl ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="w-full h-full object-cover"
            muted={isMuted}
            loop
            playsInline
            poster={video.thumbnail}
          />
        ) : (
          <Image
            src={video.thumbnail || '/images/hero-fallback.jpg'}
            alt={video.title}
            fill
            className="object-cover"
            priority
          />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-netflix" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-netflix-black to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="px-4 md:px-12 lg:px-16 w-full max-w-3xl">
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-lg"
          >
            {video.title}
          </motion.h1>

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center gap-4 text-sm text-white/80 mb-4"
          >
            <span className="text-green-500 font-semibold">
              {Math.random() > 0.5 ? '97% Match' : '94% Match'}
            </span>
            <span>{video.duration ? `${Math.floor(video.duration / 60)}m` : '2h 14m'}</span>
            <span className="border border-white/40 px-2 py-0.5 text-xs rounded">
              HD
            </span>
            {video.category && (
              <span className="text-white/70">{video.category.name}</span>
            )}
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-white/80 text-sm md:text-base leading-relaxed mb-6 line-clamp-3 md:line-clamp-4"
          >
            {video.description || 'Experience the ultimate streaming platform with thousands of movies, TV shows, and exclusive content. Watch anywhere, anytime.'}
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-3"
          >
            <Link
              href={`/watch/${video.id}`}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded font-semibold hover:bg-white/90 transition-all duration-200 hover:scale-105"
            >
              <Play className="w-5 h-5 fill-black" />
              Play
            </Link>
            <button
              onClick={onMyList}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded font-semibold border border-white/20 hover:bg-white/20 transition-all duration-200 hover:scale-105"
            >
              <Info className="w-5 h-5" />
              More Info
            </button>
          </motion.div>
        </div>
      </div>

      {/* Volume Toggle */}
      <button
        onClick={toggleMute}
        className="absolute bottom-32 right-4 md:right-12 z-20 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all duration-200"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-white/60"
        >
          <span className="text-xs uppercase tracking-wider">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.div>

      {/* Maturity Rating */}
      <div className="absolute bottom-8 right-4 md:right-12 z-20">
        <span className="bg-white/10 backdrop-blur-sm text-white text-xs px-2 py-1 border-l-2 border-white/40">
          {video.ageRestricted ? '18+' : '13+'}
        </span>
      </div>
    </div>
  );
}
