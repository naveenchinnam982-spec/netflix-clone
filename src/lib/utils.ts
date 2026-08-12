// ============================
// Utility Functions
// ============================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Merge Tailwind CSS classes with proper precedence.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format video duration from seconds to human-readable string.
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format view count to compact representation.
 */
export function formatViews(views: number): string {
  if (views >= 1_000_000_000) {
    return `${(views / 1_000_000_000).toFixed(1)}B`;
  }
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K`;
  }
  return views.toString();
}

/**
 * Format file size from bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  }
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(2)} MB`;
  }
  if (bytes >= 1_024) {
    return `${(bytes / 1_024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Format date relative to now.
 */
export function formatRelativeDate(dateString: string): string {
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

/**
 * Format date to standard format.
 */
export function formatDate(dateString: string, formatStr: string = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return dateString;
  }
}

/**
 * Truncate text to specified length.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Generate a random color based on string input.
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.abs(hash).toString(16).slice(0, 6);
  return `#${color.padStart(6, '0')}`;
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle a function call.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Check if a string is a valid URL.
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML string to prevent XSS.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse video duration from YouTube-like format.
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1]?.replace('H', '') || '0', 10);
  const minutes = parseInt(match[2]?.replace('M', '') || '0', 10);
  const seconds = parseInt(match[3]?.replace('S', '') || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get video quality label based on height.
 */
export function getQualityLabel(height: number): string {
  if (height >= 2160) return '4K';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  return '240p';
}

/**
 * Format upload speed.
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Calculate estimated time remaining for upload.
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

/**
 * Group videos by category.
 */
export function groupByCategory(videos: Array<{ category: { name: string; id: string } }>) {
  return videos.reduce(
    (acc, video) => {
      const categoryName = video.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(video);
      return acc;
    },
    {} as Record<string, any[]>
  );
}

/**
 * Get appropriate gradient for category color.
 */
export function getCategoryGradient(color: string): string {
  return `linear-gradient(135deg, ${color}22, ${color}44)`;
}

/**
 * Check if user has premium access.
 */
export function hasPremiumAccess(plan?: string): boolean {
  if (!plan || plan === 'free') return false;
  return ['premium', 'monthly', 'yearly'].includes(plan);
}

/**
 * Get subscription price based on plan.
 */
export function getSubscriptionPrice(plan: string): number {
  switch (plan) {
    case 'monthly':
      return 9.99;
    case 'yearly':
      return 99.99;
    case 'premium':
      return 14.99;
    default:
      return 0;
  }
}

/**
 * Generate a slug from a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Check if device is mobile.
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Check if device supports touch.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get initials from display name.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format currency amount.
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Check if a video is currently trending.
 */
export function isTrending(video: { views: number; likes: number; createdAt: string }): boolean {
  const ageInDays = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const engagementRate = video.likes / Math.max(video.views, 1);
  return ageInDays < 7 && engagementRate > 0.05;
}

/**
 * Calculate watch time percentage.
 */
export function getWatchProgress(currentPosition: number, duration: number): number {
  if (duration === 0) return 0;
  return Math.min((currentPosition / duration) * 100, 100);
}
