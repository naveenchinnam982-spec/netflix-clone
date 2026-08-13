// ============================
// Browse Page (Main Landing)
// ============================
// Netflix-style browse page with hero banner, trending section, continue
// watching, and one row per category. Data flows from the repository
// (Firestore when configured, demo dataset otherwise).

'use client';

import { useEffect, useCallback } from 'react';
import { HeroBanner } from '@/components/ui/hero-banner';
import { VideoRow } from '@/components/ui/video-row';
import { useVideoStore } from '@/store/video-store';

export default function BrowsePage() {
  const {
    featuredVideo,
    trendingVideos,
    recentVideos,
    continueWatching,
    categories,
    videos,
    isLoading,
    fetchFeaturedVideo,
    fetchTrendingVideos,
    fetchRecentVideos,
    fetchCategories,
    fetchContinueWatching,
    fetchVideos,
  } = useVideoStore();

  const loadAll = useCallback(async () => {
    await Promise.all([
      fetchFeaturedVideo(),
      fetchTrendingVideos(),
      fetchRecentVideos(),
      fetchCategories(),
      fetchContinueWatching(),
      // Populate the store-wide catalog so per-category rows render every
      // category's videos (not just the recent slice).
      fetchVideos(),
    ]);
  }, [fetchFeaturedVideo, fetchTrendingVideos, fetchRecentVideos, fetchCategories, fetchContinueWatching, fetchVideos]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const playVideo = useCallback((videoId: string) => {
    window.location.href = `/watch/${videoId}`;
  }, []);

  if (isLoading && !featuredVideo) {
    return (
      <div className="min-h-screen bg-netflix-black">
        <div className="h-[80vh] bg-netflix-dark animate-pulse" />
        <div className="space-y-8 px-4 md:px-12 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-48 bg-netflix-dark rounded animate-pulse" />
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="flex-shrink-0 w-[260px] aspect-video bg-netflix-dark rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      {featuredVideo && (
        <HeroBanner
          video={featuredVideo}
          onPlay={() => playVideo(featuredVideo.id)}
          onMyList={() => useVideoStore.getState().addToMyList(featuredVideo.id)}
        />
      )}

      <div className="relative z-10 -mt-32 space-y-8 pb-16">
        {continueWatching.length > 0 && (
          <VideoRow
            title="Continue Watching"
            videos={continueWatching.map(h => h.video)}
          />
        )}

        {trendingVideos.length > 0 && (
          <VideoRow title="Trending Now" videos={trendingVideos} />
        )}

        {recentVideos.length > 0 && (
          <VideoRow title="Recently Added" videos={recentVideos} />
        )}

        {categories.map((category) => {
          const categoryVideos = videos.length > 0
            ? videos.filter(v => v.categoryId === category.id)
            : recentVideos.filter(v => v.categoryId === category.id);
          if (categoryVideos.length === 0) return null;
          return (
            <VideoRow
              key={category.id}
              title={category.name}
              videos={categoryVideos}
              onSeeAll={() => window.location.assign(`/category/${category.slug}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
