// ============================
// Video Player Component
// ============================
// Netflix-style video player with HLS/DASH streaming, adaptive quality,
// keyboard shortcuts, subtitles, playback speed, and picture-in-picture.

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles, PictureInPicture2,
  ChevronDown, Loader2
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { useVideoPlayer } from '@/hooks/use-video-player';
import type { Video, VideoQuality, Caption } from '@/types';
import Hls from 'hls.js';

interface VideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  startPosition?: number;
  onProgress?: (position: number) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITY_OPTIONS: VideoQuality[] = ['240p', '360p', '480p', '720p', '1080p', '1440p', '4K'];

export function VideoPlayer({
  video,
  autoPlay = true,
  startPosition = 0,
  onProgress,
  onEnd,
  onError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const {
    isPlaying, isMuted, isFullscreen, isPiP,
    currentTime, duration, volume, playbackRate,
    quality, isControlsVisible, isLoading, buffered,
    error, controls, containerRef
  } = useVideoPlayer(videoRef);

  const [showSettings, setShowSettings] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeCaption, setActiveCaption] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewPosition, setPreviewPosition] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize HLS
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (video.hlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      
      hlsRef.current = hls;
      hls.loadSource(video.hlsUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          videoEl.play().catch(() => {});
        }
        if (startPosition > 0) {
          videoEl.currentTime = startPosition;
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          onError?.(new Error('HLS playback error'));
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.videoUrl) {
      videoEl.src = video.videoUrl;
      if (autoPlay) {
        videoEl.play().catch(() => {});
      }
      if (startPosition > 0) {
        videoEl.currentTime = startPosition;
      }
    }
  }, [video.hlsUrl, video.videoUrl, autoPlay, startPosition, onError]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
          setShowSettings(false);
          setShowQuality(false);
          setShowSubtitles(false);
        }, 3000);
      }
    };

    const container = playerContainerRef.current;
    container?.addEventListener('mousemove', handleMouseMove);
    return () => {
      container?.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Progress reporting
  useEffect(() => {
    onProgress?.(currentTime);
  }, [currentTime, onProgress]);

  // Handle seeking
  const handleProgressBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || !videoRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const time = pos * (duration || videoRef.current.duration);
      controls.seek(time);
    },
    [duration, controls]
  );

  const handleProgressBarHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      setPreviewPosition(pos * 100);
      setPreviewTime(pos * (duration || 0));
    },
    [duration]
  );

  // Quality selection
  const handleQualityChange = useCallback(
    (newQuality: VideoQuality) => {
      controls.setQuality(newQuality);
      setShowQuality(false);
      setShowSettings(false);
    },
    [controls]
  );

  // Caption selection
  const handleCaptionChange = useCallback(
    (captionId: string | null) => {
      setActiveCaption(captionId);
      setShowSubtitles(false);
      if (videoRef.current) {
        const tracks = videoRef.current.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = captionId === tracks[i].language ? 'showing' : 'hidden';
        }
      }
    },
    []
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load video</p>
          <button
            onClick={() => window.location.reload()}
            className="text-white bg-netflix-red px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playerContainerRef}
      className="relative bg-black group cursor-pointer"
      onDoubleClick={controls.toggleFullscreen}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video max-h-[80vh] bg-black"
        playsInline
        onClick={controls.togglePlay}
        onEnded={onEnd}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Subtitles Track */}
      {video.captions?.map((caption) => (
        <track
          key={caption.id}
          kind="subtitles"
          src={caption.url}
          srcLang={caption.srclang}
          label={caption.label}
          default={caption.isDefault}
        />
      ))}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"
          >
            {/* Top Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-medium truncate">{video.title}</h2>
              <div className="flex items-center gap-2">
                {/* Captions */}
                {video.captions && video.captions.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSubtitles(!showSubtitles)}
                      className="p-2 text-white hover:text-white/80 transition-colors"
                      aria-label="Subtitles"
                    >
                      <Subtitles className="w-5 h-5" />
                    </button>
                    {showSubtitles && (
                      <div className="absolute right-0 top-full mt-2 bg-black/90 rounded-lg overflow-hidden min-w-[150px]">
                        <button
                          onClick={() => handleCaptionChange(null)}
                          className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                        >
                          Off
                        </button>
                        {video.captions.map((cap) => (
                          <button
                            key={cap.id}
                            onClick={() => handleCaptionChange(cap.srclang)}
                            className={cn(
                              'w-full text-left px-4 py-2 text-sm hover:bg-white/10',
                              activeCaption === cap.srclang ? 'text-netflix-red' : 'text-white'
                            )}
                          >
                            {cap.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Picture in Picture */}
                {document.pictureInPictureEnabled && (
                  <button
                    onClick={controls.togglePiP}
                    className="p-2 text-white hover:text-white/80 transition-colors"
                    aria-label="Picture in Picture"
                  >
                    <PictureInPicture2 className="w-5 h-5" />
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  onClick={controls.toggleFullscreen}
                  className="p-2 text-white hover:text-white/80 transition-colors"
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Center Play Button */}
            {!isPlaying && (
              <button
                onClick={controls.togglePlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-netflix-red rounded-full flex items-center justify-center hover:bg-red-700 transition-all hover:scale-110"
                aria-label="Play"
              >
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </button>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* Progress Bar */}
              <div
                ref={progressBarRef}
                className="relative h-1 bg-white/20 rounded-full group/progress cursor-pointer"
                onClick={handleProgressBarClick}
                onMouseMove={handleProgressBarHover}
              >
                {/* Buffer */}
                <div
                  className="absolute h-full bg-white/30 rounded-full"
                  style={{ width: `${buffered}%` }}
                />
                {/* Progress */}
                <div
                  className="absolute h-full bg-netflix-red rounded-full"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-netflix-red rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                  style={{
                    left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    marginLeft: '-6px',
                  }}
                />
                {/* Preview Tooltip */}
                {showControls && duration > 0 && (
                  <div
                    className="absolute -top-10 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
                    style={{ left: `${previewPosition}%`, transform: 'translateX(-50%)' }}
                  >
                    {formatDuration(previewTime)}
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={controls.togglePlay}
                    className="text-white hover:text-white/80 transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>

                  {/* Skip Backward */}
                  <button
                    onClick={() => controls.skipBackward(10)}
                    className="text-white hover:text-white/80 transition-colors"
                    aria-label="Rewind 10 seconds"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  {/* Skip Forward */}
                  <button
                    onClick={() => controls.skipForward(10)}
                    className="text-white hover:text-white/80 transition-colors"
                    aria-label="Forward 10 seconds"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2 group/volume">
                    <button
                      onClick={controls.toggleMute}
                      className="text-white hover:text-white/80 transition-colors"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => controls.setVolume(parseFloat(e.target.value))}
                        className="w-full h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        aria-label="Volume"
                      />
                    </div>
                  </div>

                  {/* Time Display */}
                  <span className="text-white text-sm tabular-nums">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Playback Speed */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowSettings(!showSettings);
                        setShowQuality(false);
                      }}
                      className="text-white text-sm hover:text-white/80 transition-colors flex items-center gap-1"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">{playbackRate}x</span>
                    </button>
                    {showSettings && (
                      <div className="absolute right-0 bottom-full mb-2 bg-black/90 rounded-lg overflow-hidden min-w-[150px]">
                        <div className="px-4 py-2 text-xs text-netflix-gray border-b border-white/10">
                          Playback Speed
                        </div>
                        {PLAYBACK_RATES.map((rate) => (
                          <button
                            key={rate}
                            onClick={() => {
                              controls.setPlaybackRate(rate);
                              setShowSettings(false);
                            }}
                            className={cn(
                              'w-full text-left px-4 py-2 text-sm hover:bg-white/10',
                              playbackRate === rate ? 'text-netflix-red' : 'text-white'
                            )}
                          >
                            {rate}x
                          </button>
                        ))}
                        <div className="border-t border-white/10">
                          <button
                            onClick={() => {
                              setShowSettings(false);
                              setShowQuality(true);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                          >
                            Quality: {quality}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quality Settings */}
                  {showQuality && (
                    <div className="absolute right-0 bottom-full mb-2 bg-black/90 rounded-lg overflow-hidden min-w-[150px]">
                      <div className="px-4 py-2 text-xs text-netflix-gray border-b border-white/10">
                        Video Quality
                      </div>
                      {QUALITY_OPTIONS.filter(q => video.processedQualities?.includes(q)).map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQualityChange(q)}
                          className={cn(
                            'w-full text-left px-4 py-2 text-sm hover:bg-white/10',
                            quality === q ? 'text-netflix-red' : 'text-white'
                          )}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
