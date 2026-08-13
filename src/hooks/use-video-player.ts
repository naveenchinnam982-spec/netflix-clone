// ============================
// useVideoPlayer Hook
// ============================
// Manages video player state, controls, keyboard shortcuts, and quality selection.

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VideoQuality } from '@/types';

interface PlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isPiP: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  quality: VideoQuality;
  isControlsVisible: boolean;
  isLoading: boolean;
  buffered: number;
  error: string | null;
}

interface PlayerControls {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  togglePiP: () => void;
  setPlaybackRate: (rate: number) => void;
  setQuality: (quality: VideoQuality) => void;
  showControls: () => void;
  hideControls: () => void;
}

export function useVideoPlayer(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    isMuted: false,
    isFullscreen: false,
    isPiP: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    quality: '1080p',
    isControlsVisible: true,
    isLoading: true,
    buffered: 0,
    error: null,
  });

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Video element event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setState(s => ({ ...s, currentTime: video.currentTime }));
    const onDurationChange = () => setState(s => ({ ...s, duration: video.duration }));
    const onPlay = () => setState(s => ({ ...s, isPlaying: true }));
    const onPause = () => setState(s => ({ ...s, isPlaying: false }));
    const onWaiting = () => setState(s => ({ ...s, isLoading: true }));
    const onCanPlay = () => setState(s => ({ ...s, isLoading: false }));
    const onVolumeChange = () => setState(s => ({ ...s, volume: video.volume, isMuted: video.muted }));
    const onError = () => setState(s => ({ ...s, error: 'Video playback error' }));
    const onProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setState(s => ({ ...s, buffered: (bufferedEnd / video.duration) * 100 }));
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('error', onError);
    video.addEventListener('progress', onProgress);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('error', onError);
      video.removeEventListener('progress', onProgress);
    };
  }, [videoRef]);

  // Auto-hide controls
  const showControls = useCallback(() => {
    setState(s => ({ ...s, isControlsVisible: true }));
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (state.isPlaying) {
        setState(s => ({ ...s, isControlsVisible: false }));
      }
    }, 3000);
  }, [state.isPlaying]);

  const hideControls = useCallback(() => {
    setState(s => ({ ...s, isControlsVisible: false }));
  }, []);

  // Player controls
  const play = useCallback(() => {
    videoRef.current?.play();
  }, [videoRef]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    if (videoRef.current?.paused) {
      videoRef.current?.play();
    } else {
      videoRef.current?.pause();
    }
  }, [videoRef]);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  }, [videoRef]);

  const skipForward = useCallback((seconds: number = 10) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.currentTime + seconds,
        videoRef.current.duration
      );
    }
  }, [videoRef]);

  const skipBackward = useCallback((seconds: number = 10) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - seconds, 0);
    }
  }, [videoRef]);

  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = volume === 0;
      setState(s => ({ ...s, volume, isMuted: volume === 0 }));
    }
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setState(s => ({ ...s, isMuted: videoRef.current?.muted || false }));
    }
  }, [videoRef]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setState(s => ({ ...s, isFullscreen: true }));
      } else {
        await document.exitFullscreen();
        setState(s => ({ ...s, isFullscreen: false }));
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setState(s => ({ ...s, isPiP: false }));
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
        setState(s => ({ ...s, isPiP: true }));
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  }, [videoRef]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setState(s => ({ ...s, playbackRate: rate }));
    }
  }, [videoRef]);

  const setQuality = useCallback((quality: VideoQuality) => {
    setState(s => ({ ...s, quality }));
    // Quality switching is handled by HLS.js
  }, []);

  // Keyboard shortcuts — declared after the control callbacks so their
  // identities are stable and can be listed as dependencies safely.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'ArrowLeft':
          skipBackward();
          break;
        case 'ArrowRight':
          skipForward();
          break;
        case 'ArrowUp':
          setVolume(Math.min(state.volume + 0.1, 1));
          break;
        case 'ArrowDown':
          setVolume(Math.max(state.volume - 0.1, 0));
          break;
        case 'KeyP':
          togglePiP();
          break;
        case 'Digit0':
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
        case 'Digit9':
          const percent = parseInt(e.code.replace('Digit', '')) / 10;
          seek(percent * state.duration);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    state.duration,
    state.volume,
    videoRef,
    seek,
    setVolume,
    skipBackward,
    skipForward,
    toggleFullscreen,
    toggleMute,
    togglePiP,
    togglePlay,
  ]);

  const controls: PlayerControls = {
    play,
    pause,
    togglePlay,
    seek,
    skipForward,
    skipBackward,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    setPlaybackRate,
    setQuality,
    showControls,
    hideControls,
  };

  return {
    ...state,
    controls,
    containerRef,
  };
}
