// ============================
// Video Detail Page
// ============================
// Full video detail view with backdrop banner, metadata, and actions.
// Linked from video cards; deep-links into the watch page.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Plus, Check, ThumbsUp, Clock, CalendarDays } from 'lucide-react';
import { VideoRow } from '@/components/ui/video-row';
import { useVideoStore } from '@/store/video-store';
import { formatViews, formatRelativeDate, formatDuration } from '@/lib/utils';
import type { Video } from '@/types';
import toast from 'react-hot-toast';

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const { getVideoById, videos, myList, addToMyList, removeFromMyList } = useVideoStore();
  const [inMyList, setInMyList] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await getVideoById(videoId);
      setVideo(data);
      setLoading(false);
    };
    load();
  }, [videoId, getVideoById]);

  useEffect(() => {
    setInMyList(myList.includes(videoId));
  }, [myList, videoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-black">
        <div className="h-[70vh] bg-netflix-dark animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 space-y-6">
          <div className="h-10 w-1/2 bg-netflix-dark rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-netflix-dark rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <p className="text-white text-xl">Video not found</p>
      </div>
    );
  }

  const related = videos.filter(v => v.id !== video.id).slice(0, 12);

  return (
    <div className="min-h-screen bg-netflix-black">
      {/* Backdrop */}
      <div className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
        <Image src={video.thumbnail} alt={video.title} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-netflix" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-netflix-black to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="px-4 md:px-12 pb-20 w-full max-w-3xl"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">{video.title}</h1>
            <div className="flex items-center gap-4 text-sm text-white/80 mb-4 flex-wrap">
              <span className="text-green-500 font-semibold">
                {Math.round((video.likes / Math.max(video.views, 1)) * 100) || 90}% Match
              </span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDuration(video.duration)}</span>
              <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {formatRelativeDate(video.createdAt)}</span>
              <span className="border border-white/40 px-2 py-0.5 text-xs rounded">
                {video.processedQualities?.includes('4K') ? '4K' : 'HD'}
              </span>
              {video.category && <a href={`/category/${video.category.slug}`} className="hover:text-netflix-red transition-colors">{video.category.name}</a>}
            </div>
            <p className="text-white/80 text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 mb-6">
              {video.description}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={`/watch/${video.id}`}
                className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-semibold hover:bg-white/90 transition-all hover:scale-105"
              >
                <Play className="w-5 h-5 fill-black" /> Play
              </a>
              <button
                onClick={async () => {
                  if (inMyList) {
                    await removeFromMyList(video.id);
                    toast.success('Removed from My List');
                  } else {
                    await addToMyList(video.id);
                    toast.success('Added to My List');
                  }
                }}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded font-semibold border border-white/20 hover:bg-white/20 transition-all"
              >
                {inMyList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {inMyList ? 'In My List' : 'My List'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-10 space-y-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-netflix-red flex items-center justify-center text-white font-bold text-lg">
            {video.uploaderName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white font-medium">{video.uploaderName}</p>
            <p className="text-netflix-gray text-sm">{formatViews(video.views)} views · {video.language?.toUpperCase()} · {video.format?.toUpperCase()}</p>
          </div>
        </div>

        {related.length > 0 && <VideoRow title="More Like This" videos={related} />}
      </div>
    </div>
  );
}
