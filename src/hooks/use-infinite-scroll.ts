'use client';

import { useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
  const {
    onLoadMore,
    hasMore,
    isLoading,
    rootMargin = '100px',
    enabled = true,
  } = options;

  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading && enabled) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading, enabled]
  );

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin,
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver, rootMargin]);

  return { observerRef };
}
