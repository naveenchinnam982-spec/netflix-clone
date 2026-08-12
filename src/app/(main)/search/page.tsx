// ============================
// Search Page
// ============================
// Instant search with debounce, category/language/duration filters, sorting,
// and infinite-style results grid. Data comes from the repository.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { VideoCard } from '@/components/ui/video-card';
import { useDebounce } from '@/hooks/use-debounce';
import { useVideoStore } from '@/store/video-store';
import { cn } from '@/lib/utils';
import type { Video } from '@/types';

const DURATIONS = [
  { label: 'Under 10 minutes', value: 'short' },
  { label: '10-30 minutes', value: 'medium' },
  { label: '30-60 minutes', value: 'long' },
  { label: 'Over 60 minutes', value: 'extra-long' },
];
const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Upload Date', value: 'date' },
  { label: 'View Count', value: 'views' },
  { label: 'Rating', value: 'rating' },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<Video[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    language: '',
    duration: '',
    sortBy: 'relevance',
    uploadDate: '',
  });
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { categories, fetchCategories, searchVideos } = useVideoStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const runSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const durationMap: Record<string, { min: number; max: number }> = {
      short: { min: 0, max: 600 },
      medium: { min: 600, max: 1800 },
      long: { min: 1800, max: 3600 },
      'extra-long': { min: 3600, max: Infinity },
    };
    const results = await searchVideos(debouncedQuery, {
      category: filters.category || undefined,
      language: filters.language || undefined,
      duration: filters.duration ? durationMap[filters.duration] : undefined,
      sortBy: (filters.sortBy as any) || 'relevance',
    });
    setResults(results);
    setLoading(false);
  }, [debouncedQuery, filters, searchVideos]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const updateQuery = (value: string) => {
    setSearchQuery(value);
    router.replace(value ? `/search?q=${encodeURIComponent(value)}` : '/search', { scroll: false });
  };

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-netflix-gray" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="Search titles, tags, genres"
              className="w-full bg-netflix-dark text-white text-lg border border-white/20 rounded-full pl-12 pr-12 py-3 outline-none focus:border-white/40 focus:ring-1 focus:ring-netflix-red transition-all"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => updateQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-netflix-gray hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 mt-4 text-netflix-gray hover:text-white transition-colors text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-netflix-dark/50 backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-netflix-gray text-xs block mb-2">Sort by</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="w-full bg-netflix-light text-white text-sm border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-netflix-gray text-xs block mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full bg-netflix-light text-white text-sm border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-netflix-gray text-xs block mb-2">Language</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                  className="w-full bg-netflix-light text-white text-sm border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
                >
                  <option value="">All Languages</option>
                  {['en', 'es', 'fr', 'de', 'ja', 'ko'].map((lang) => (
                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-netflix-gray text-xs block mb-2">Duration</label>
                <select
                  value={filters.duration}
                  onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
                  className="w-full bg-netflix-light text-white text-sm border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
                >
                  <option value="">All Durations</option>
                  {DURATIONS.map((dur) => (
                    <option key={dur.value} value={dur.value}>{dur.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-video bg-netflix-dark rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-netflix-dark rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-netflix-dark rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <p className="text-netflix-gray text-sm mb-6">
              Found {results.length} {results.length === 1 ? 'result' : 'results'} for &ldquo;{debouncedQuery}&rdquo;
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((video, index) => (
                <VideoCard key={video.id} video={video} index={index} />
              ))}
            </div>
          </>
        ) : debouncedQuery ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-netflix-gray mx-auto mb-4" />
            <h2 className="text-white text-xl font-medium mb-2">No results found</h2>
            <p className="text-netflix-gray">Try different keywords or remove search filters</p>
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-netflix-gray mx-auto mb-4" />
            <h2 className="text-white text-xl font-medium mb-2">Search for videos</h2>
            <p className="text-netflix-gray">Find your favorite content across thousands of titles</p>
          </div>
        )}
      </div>
    </div>
  );
}
