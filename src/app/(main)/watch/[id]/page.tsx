// ============================
// Watch Page
// ============================
// Video playback page: resumes from last position, saves watch progress,
// real comments (add/reply/report/delete), like/dislike, share link, and a
// recommendations sidebar.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Share2, Clock, ListPlus, Check, Copy, Link2 } from 'lucide-react';
import { VideoPlayer } from '@/components/ui/video-player';
import { CommentSection } from '@/components/ui/comment-section';
import { useVideoStore } from '@/store/video-store';
import { repo } from '@/lib/repository';
import { useAuthStore } from '@/store/auth-store';
import { cn, formatViews, formatRelativeDate, formatDuration } from '@/lib/utils';
import type { Video, Comment } from '@/types';
import toast from 'react-hot-toast';

export default function WatchPage() {
  const params = useParams();
  const videoId = params.id as string;
  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startPosition, setStartPosition] = useState(0);
  const [inMyList, setInMyList] = useState(false);

  const saveTimer = useRef<NodeJS.Timeout>();
  const positionRef = useRef(0);
  const durationRef = useRef(0);

  const { getVideoById, addToHistory, videos, toggleLike, myList, fetchVideos } = useVideoStore();
  const user = useAuthStore(s => s.user);

  const loadComments = useCallback(async () => {
    const list = await repo.getComments(videoId);
    setComments(list);
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    const loadVideo = async () => {
      setLoading(true);
      const videoData = await getVideoById(videoId);
      if (cancelled) return;
      if (videoData) {
        setVideo(videoData);
        addToHistory(videoId);
        // Resume from last watched position.
        const saved = localStorage.getItem(`watch_progress_${videoId}`);
        if (saved && !Number.isNaN(parseFloat(saved))) {
          setStartPosition(parseFloat(saved));
        }
        if (user) {
          const likedIds = await repo.getLikedVideoIds(user.uid);
          if (!cancelled) setLiked(likedIds.includes(videoId));
        }
      }
      setLoading(false);
    };
    loadVideo();
    loadComments();
    // Populate the store-wide catalog so the "More Videos" sidebar renders.
    if (videos.length === 0) fetchVideos();
    return () => {
      cancelled = true;
    };
  }, [videoId, getVideoById, addToHistory, loadComments, user, videos.length, fetchVideos]);

  // Reflect my-list membership when the store updates.
  useEffect(() => {
    setInMyList(myList.includes(videoId));
  }, [myList, videoId]);

  const handleProgress = useCallback(
    (position: number) => {
      positionRef.current = position;
      localStorage.setItem(`watch_progress_${videoId}`, position.toString());
    },
    [videoId]
  );

  // Persist progress to the repository (Firestore/demo) on an interval and on unmount.
  useEffect(() => {
    // Capture ref objects so the cleanup reads the live values at unmount
    // without tripping the ref-in-cleanup lint rule.
    const position = positionRef;
    const duration = durationRef;
    saveTimer.current = setInterval(() => {
      if (position.current > 10 && user) {
        repo.saveWatchProgress(user.uid, videoId, position.current, duration.current);
      }
    }, 10000);
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
      if (position.current > 10 && user) {
        repo.saveWatchProgress(user.uid, videoId, position.current, duration.current);
      }
    };
  }, [videoId, user]);

  const handleLike = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    const nowLiked = await toggleLike(videoId, 'like');
    setLiked(nowLiked);
    if (disliked) setDisliked(false);
    if (video) setVideo({ ...video, likes: video.likes + (nowLiked ? 1 : -1) });
  };

  const handleDislike = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    const nowDisliked = await toggleLike(videoId, 'dislike');
    setDisliked(nowDisliked);
    if (liked) setLiked(false);
    if (video) setVideo({ ...video, dislikes: video.dislikes + (nowDisliked ? 1 : -1) });
  };

  const handleShare = async () => {
    setShowShare(true);
    setShareCopied(false);
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/watch/${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleAddComment = async (text: string) => {
    if (!user) return;
    await repo.addComment(user.uid, videoId, text);
    await loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await repo.deleteComment(commentId, videoId);
    await loadComments();
  };

  const handleReportComment = async (commentId: string) => {
    await repo.reportComment(commentId, videoId);
    toast.success('Comment reported for review');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-black">
        <div className="aspect-video bg-netflix-dark animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 space-y-6">
          <div className="h-8 w-2/3 bg-netflix-dark rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-netflix-dark rounded animate-pulse" />
          <div className="h-20 w-full bg-netflix-dark rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Video not found</p>
          <a href="/browse" className="text-netflix-red hover:underline">Browse videos</a>
        </div>
      </div>
    );
  }

  // Recommendations: same category/tags first, then the rest. Deduplicated so
  // a video matching both groups never appears twice (fixes duplicate-key UI
  // warnings) and capped at 10.
  const others = videos.filter(v => v.id !== video.id);
  const related = Array.from(new Map(
    others
      .filter(v => v.categoryId === video.categoryId || v.tags?.some(t => video.tags?.includes(t)))
      .concat(others.filter(v => v.categoryId !== video.categoryId))
      .map(v => [v.id, v])
  ).values()).slice(0, 10);

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="w-full bg-black">
        <div className="max-w-7xl mx-auto">
          <VideoPlayer
            video={video}
            autoPlay
            startPosition={startPosition}
            onProgress={handleProgress}
            onEnd={() => {
              if (related.length > 0) window.location.href = `/watch/${related[0].id}`;
            }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-white text-2xl font-bold">{video.title}</h1>
              <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
                <div className="flex items-center gap-4 text-sm text-netflix-gray">
                  <span>{formatViews(video.views)} views</span>
                  <span>·</span>
                  <span>{formatRelativeDate(video.createdAt)}</span>
                  {video.category && (
                    <>
                      <span>·</span>
                      <a href={`/category/${video.category.slug}`} className="text-white hover:text-netflix-red transition-colors">{video.category.name}</a>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleLike}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all',
                      liked ? 'bg-netflix-red text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    {video.likes > 0 && formatViews(video.likes)}
                  </button>
                  <button
                    onClick={handleDislike}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all',
                      disliked ? 'bg-netflix-red text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm text-white hover:bg-white/20 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) {
                        window.location.href = '/login';
                        return;
                      }
                      if (inMyList) {
                        await useVideoStore.getState().removeFromMyList(video.id);
                        toast.success('Removed from My List');
                      } else {
                        await useVideoStore.getState().addToMyList(video.id);
                        toast.success('Added to My List');
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all',
                      inMyList ? 'bg-netflix-red text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                  >
                    {inMyList ? <Check className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
                    {inMyList ? 'Saved' : 'Save'}
                  </button>
                  <a
                    href={`/watch-together/${video.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm text-white hover:bg-white/20 transition-all"
                  >
                    <UsersIcon />
                    Watch Together
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-netflix-dark/50 rounded-lg p-4">
              <div className="w-12 h-12 rounded-full bg-netflix-red flex items-center justify-center text-white font-bold text-lg">
                {video.uploaderName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-white font-medium">{video.uploaderName}</p>
                <p className="text-netflix-gray text-sm">
                  {video.processedQualities?.length || video.quality?.length || 0} qualities · {formatDuration(video.duration)}
                </p>
              </div>
            </div>

            <div>
              <button onClick={() => setShowDescription(!showDescription)} className="text-white font-medium flex items-center gap-2">
                Description
                <span className="text-netflix-gray text-xs">{showDescription ? 'less' : 'more'}</span>
              </button>
              <p className={cn('text-netflix-gray text-sm mt-2 whitespace-pre-wrap', !showDescription && 'line-clamp-2')}>
                {video.description || 'No description available.'}
              </p>
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {video.tags.map((tag) => (
                    <span key={tag} className="text-netflix-gray text-xs bg-white/5 px-2 py-1 rounded">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {video.chapters && video.chapters.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-white font-medium">Chapters</h3>
                <div className="space-y-1">
                  {video.chapters.map((chapter) => (
                    <div key={chapter.id} className="flex items-center gap-3 p-2 bg-white/5 rounded hover:bg-white/10 transition-colors cursor-pointer">
                      <span className="text-netflix-gray text-xs w-8">{formatDuration(chapter.startTime)}</span>
                      <span className="text-white text-sm">{chapter.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <CommentSection
              videoId={videoId}
              comments={comments}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onReportComment={handleReportComment}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-white text-lg font-semibold">More Videos</h3>
            <div className="space-y-3">
              {related.map((recVideo) => (
                <a key={recVideo.id} href={`/watch/${recVideo.id}`} className="flex gap-2 group">
                  <div className="flex-shrink-0 w-40 aspect-video bg-netflix-dark rounded overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={recVideo.thumbnail || '/images/placeholder.jpg'} alt={recVideo.title} className="w-full h-full object-cover" loading="lazy" />
                    {recVideo.duration > 0 && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">{formatDuration(recVideo.duration)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-netflix-red transition-colors">{recVideo.title}</h4>
                    <p className="text-netflix-gray text-xs mt-1">{recVideo.uploaderName}</p>
                    <p className="text-netflix-gray text-xs">{formatViews(recVideo.views)} views</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowShare(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-netflix-dark border border-white/10 rounded-2xl p-8 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-netflix-red/10 text-netflix-red">
                  <Link2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Share this video</h3>
                  <p className="text-netflix-gray text-sm">Anyone with the link can watch</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-netflix-black border border-white/10 rounded-lg p-2 mb-4">
                <input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/watch/${videoId}`}
                  className="flex-1 bg-transparent text-white text-sm outline-none px-2"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-2 bg-netflix-red hover:bg-red-700 text-white text-sm font-medium rounded px-4 py-2 transition-colors"
                >
                  {shareCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {shareCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-netflix-gray flex items-center gap-1">
                <Clock className="w-3 h-3" /> Visibility: {video.visibility === 'public' ? 'Public' : video.visibility === 'unlisted' ? 'Unlisted' : 'Private'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
