// ============================
// Core Platform Types
// ============================

export type UserRole = 'admin' | 'teacher' | 'student' | 'user';
export type VideoVisibility = 'public' | 'private' | 'unlisted';
export type VideoStatus = 'processing' | 'ready' | 'failed' | 'uploading';
export type SubscriptionPlan = 'free' | 'premium' | 'monthly' | 'yearly';
export type LiveStreamStatus = 'idle' | 'live' | 'ended' | 'processing';
export type NotificationType = 'upload' | 'live_started' | 'new_video' | 'comment' | 'subscription' | 'system';
export type CommentStatus = 'active' | 'pinned' | 'reported' | 'hidden';
export type VideoQuality = '240p' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '4K';
export type PaymentProvider = 'stripe' | 'razorpay';
export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';

// ============================
// User Types
// ============================

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  phoneNumber?: string;
  emailVerified: boolean;
  isBanned: boolean;
  subscription: SubscriptionPlan;
  subscriptionEndDate?: string;
  createdAt: string;
  lastLoginAt: string;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  autoplay: boolean;
  autoplayNext: boolean;
  videoQuality: VideoQuality;
  subtitlesEnabled: boolean;
  subtitleLanguage: string;
  matureContent: boolean;
  playNextEpisode: boolean;
  notifications: NotificationPreferences;
  theme: 'dark' | 'light' | 'system';
  language: string;
}

export interface NotificationPreferences {
  uploads: boolean;
  liveStreams: boolean;
  comments: boolean;
  recommendations: boolean;
  marketing: boolean;
}

export interface UserStats {
  totalWatchTime: number;
  videosWatched: number;
  commentsPosted: number;
  followers: number;
  following: number;
  joinDate: string;
}

// ============================
// Video Types
// ============================

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnailBlur?: string;
  videoUrl: string;
  hlsUrl?: string;
  dashUrl?: string;
  duration: number;
  views: number;
  likes: number;
  dislikes: number;
  categoryId: string;
  category: Category;
  tags: string[];
  visibility: VideoVisibility;
  status: VideoStatus;
  uploadedBy: string;
  uploader: User;
  uploaderName: string;
  uploaderAvatar: string;
  language: string;
  ageRestricted: boolean;
  allowComments: boolean;
  allowRatings: boolean;
  captions: Caption[];
  chapters: Chapter[];
  quality: VideoQuality[];
  resolution: VideoResolution;
  fileSize: number;
  format: string;
  processedQualities: VideoQuality[];
  processingProgress: number;
  shareLink?: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
}

export interface VideoResolution {
  width: number;
  height: number;
  label: VideoQuality;
  bitrate: number;
}

export interface VideoUploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  estimatedTimeRemaining: number;
  status: UploadStatus;
  chunkIndex: number;
  totalChunks: number;
}

export interface VideoChunk {
  chunk: Blob;
  index: number;
  totalChunks: number;
  uploadId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

// ============================
// Caption & Chapter Types
// ============================

export interface Caption {
  id: string;
  language: string;
  label: string;
  url: string;
  isDefault?: boolean;
  srclang: string;
}

export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

// ============================
// Category Types
// ============================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  color: string;
  videoCount: number;
  isActive: boolean;
  order: number;
  createdAt: string;
}

// ============================
// Comment Types
// ============================

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  user: User;
  text: string;
  likes: number;
  dislikes: number;
  replies: number;
  parentId?: string;
  status: CommentStatus;
  isEdited: boolean;
  hasReplies?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ============================
// Live Stream Types
// ============================

export interface LiveStream {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  teacherId: string;
  teacher: User;
  status: LiveStreamStatus;
  viewers: number;
  maxViewers: number;
  duration: number;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  screenShareEnabled: boolean;
  whiteboardEnabled: boolean;
  raiseHandEnabled: boolean;
  muteAllEnabled: boolean;
  startTime?: string;
  endTime?: string;
  streamKey: string;
  rtmpUrl: string;
  hlsUrl?: string;
  chatMessages: ChatMessage[];
  participants: StreamParticipant[];
  isRecording: boolean;
  createdAt: string;
}

export interface StreamParticipant {
  userId: string;
  user: User;
  role: 'teacher' | 'student' | 'moderator';
  joinedAt: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  hasLeft: boolean;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  user: User;
  message: string;
  type: 'text' | 'system' | 'raise_hand' | 'mute' | 'join' | 'leave';
  timestamp: string;
  isPinned?: boolean;
}

// ============================
// Playlist Types
// ============================

export interface Playlist {
  id: string;
  title: string;
  description: string;
  userId: string;
  videos: string[];
  videoCount: number;
  isPublic: boolean;
  thumbnail: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

// ============================
// Notification Types
// ============================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  image?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

// ============================
// Payment Types
// ============================

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
  trialEnd?: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  provider: PaymentProvider;
  providerPaymentId: string;
  createdAt: string;
}

// ============================
// Analytics Types
// ============================

export interface Analytics {
  dailyUsers: number[];
  mostWatched: Video[];
  watchTime: number;
  revenue: number;
  topCategories: Category[];
  storageUsage: number;
  bandwidthUsage: number;
  userGrowth: number[];
  videoUploads: number[];
  activeStreams: number;
  totalVideos: number;
  totalUsers: number;
  totalComments: number;
}

export interface WatchHistory {
  id: string;
  userId: string;
  videoId: string;
  video: Video;
  watchedAt: string;
  watchDuration: number;
  completed: boolean;
  lastPosition: number;
}

// ============================
// API Types
// ============================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SearchFilters {
  query: string;
  category?: string;
  language?: string;
  duration?: { min?: number; max?: number };
  sortBy?: 'relevance' | 'date' | 'views' | 'rating';
  uploadDate?: 'today' | 'week' | 'month' | 'year';
  type?: 'video' | 'channel' | 'playlist';
  page?: number;
  limit?: number;
}

export interface UploadOptions {
  fileName: string;
  fileSize: number;
  fileType: string;
  chunkSize?: number;
  onProgress?: (progress: VideoUploadProgress) => void;
  onComplete?: (videoId: string) => void;
  onError?: (error: Error) => void;
  onPause?: () => void;
  onResume?: () => void;
}

// ============================
// Socket Events
// ============================

export interface SocketEvents {
  // Live Stream Events
  'stream:join': { streamId: string; userId: string };
  'stream:leave': { streamId: string; userId: string };
  'stream:chat': { streamId: string; message: string };
  'stream:raise-hand': { streamId: string; userId: string };
  'stream:mute': { streamId: string; userId: string };
  'stream:unmute': { streamId: string; userId: string };
  'stream:camera-on': { streamId: string; userId: string };
  'stream:camera-off': { streamId: string; userId: string };
  'stream:screen-share': { streamId: string; userId: string };
  'stream:whiteboard': { streamId: string; data: unknown };
  
  // Notification Events
  'notification:new': { userId: string; notification: Notification };
  'notification:read': { notificationId: string };
  
  // Video Events
  'video:uploaded': { videoId: string };
  'video:processed': { videoId: string };
  'video:deleted': { videoId: string };
}

// ============================
// Component Props Types
// ============================

export interface VideoCardProps {
  video: Video;
  index?: number;
  isHero?: boolean;
  showDescription?: boolean;
  onPlay?: (video: Video) => void;
  onAddToList?: (video: Video) => void;
}

export interface VideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  startPosition?: number;
  onProgress?: (position: number) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  controls?: boolean;
}

export interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxSize?: number;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  disabled?: boolean;
}

export interface CommentSectionProps {
  videoId: string;
  comments: Comment[];
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onReportComment?: (commentId: string) => void;
}

export interface LiveStreamPlayerProps {
  stream: LiveStream;
  isTeacher: boolean;
  onStartStream?: () => void;
  onEndStream?: () => void;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
}

export interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export interface CategoryCardProps {
  category: Category;
  onClick?: (category: Category) => void;
}

export interface NavbarProps {
  transparent?: boolean;
  onSearchToggle?: () => void;
}

export interface HeroBannerProps {
  video: Video;
  onPlay?: () => void;
  onMyList?: () => void;
}

// ============================
// AI Generated Types
// ============================

export interface AIGeneratedThumbnail {
  id: string;
  url: string;
  prompt: string;
  style: string;
  generatedAt: string;
}

export interface VideoSummary {
  title: string;
  description: string;
  chapters: Chapter[];
  tags: string[];
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  duration: string;
}

export interface SpeechToTextResult {
  text: string;
  segments: SpeechSegment[];
  language: string;
  confidence: number;
  duration: number;
}

export interface SpeechSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface Recommendation {
  video: Video;
  score: number;
  reason: string;
  type: 'similar' | 'trending' | 'personalized' | 'category';
}

// ============================
// WebRTC Types
// ============================

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  sdpSemantics: 'unified-plan';
}

export interface StreamMediaState {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

export interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  state: StreamMediaState;
}
