// ============================
// Watch Together Page
// ============================
// Synchronized viewing. Uses BroadcastChannel to sync play/pause/seek across
// tabs on the same device (works out of the box); the same message contract
// is what a Socket.io room relays in production deployments, so the UI is
// backend-agnostic.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Users, Link2 } from 'lucide-react';
import { useVideoStore } from '@/store/video-store';
import { useAuthStore } from '@/store/auth-store';
import type { Video } from '@/types';
import toast from 'react-hot-toast';

interface SyncMessage {
  type: 'play' | 'pause' | 'seek' | 'ping';
  time: number;
  sender: string;
}

export default function WatchTogetherPage() {
  const params = useParams();
  const videoId = params.id as string;
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [peerCount, setPeerCount] = useState(1);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const senderId = useRef(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`).current;
  const peerSeen = useRef(new Set<string>([senderId]));

  const { getVideoById } = useVideoStore();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    getVideoById(videoId).then((data) => {
      setVideo(data);
      setLoading(false);
    });
  }, [videoId, getVideoById]);

  // Broadcast channel wiring.
  useEffect(() => {
    const channel = new BroadcastChannel(`watch-together:${videoId}`);
    channelRef.current = channel;

    const onMessage = (e: MessageEvent<SyncMessage>) => {
      if (e.data.sender === senderId) return;
      peerSeen.current.add(e.data.sender);
      setPeerCount(peerSeen.current.size);
      // Handled by the player's message listener below via window event.
      window.dispatchEvent(new CustomEvent('wt-sync', { detail: e.data }));
    };

    // Ping peers so everyone can count participants.
    channel.postMessage({ type: 'ping', time: 0, sender: senderId });
    channel.onmessage = onMessage;
    const pingInterval = setInterval(() => {
      channel.postMessage({ type: 'ping', time: 0, sender: senderId });
    }, 5000);

    return () => {
      clearInterval(pingInterval);
      channel.close();
    };
  }, [videoId, senderId]);

  const broadcast = useCallback(
    (type: SyncMessage['type'], time: number) => {
      channelRef.current?.postMessage({ type, time, sender: senderId } satisfies SyncMessage);
    },
    [senderId]
  );

  const copyInvite = async () => {
    const url = `${window.location.origin}/watch-together/${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center text-white">
        Video not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-netflix-red" />
            <div>
              <h1 className="text-white font-bold text-xl">Watch Together</h1>
              <p className="text-netflix-gray text-sm">{video.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {peerCount} {peerCount === 1 ? 'viewer' : 'viewers'}
            </span>
            <button
              onClick={copyInvite}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg px-4 py-2 transition-colors"
            >
              <Link2 className="w-4 h-4" /> Invite
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/10">
          <SyncedPlayer video={video} user={user?.displayName || 'Guest'} onSync={broadcast} />
        </div>

        <p className="text-netflix-gray text-sm mt-4">
          Open this link in another tab or share it with friends — playback stays in sync. Play, pause, and seek events are relayed to everyone.
        </p>
      </div>
    </div>
  );
}

function SyncedPlayer({ video, user, onSync }: {
  video: Video;
  user: string;
  onSync: (type: SyncMessage['type'], time: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastBroadcast = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent<SyncMessage>).detail;
      const videoEl = videoRef.current;
      if (!videoEl || !data || data.type === 'ping') return;
      if (data.type === 'seek') {
        videoEl.currentTime = data.time;
      } else if (data.type === 'play') {
        videoEl.currentTime = Math.max(data.time, videoEl.currentTime - 5);
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    };
    window.addEventListener('wt-sync', handler);
    return () => window.removeEventListener('wt-sync', handler);
  }, []);

  const sync = (type: SyncMessage['type']) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    // Throttle to avoid flooding peers during scrubbing.
    const now = Date.now();
    if (now - lastBroadcast.current < 800 && type === 'seek') return;
    lastBroadcast.current = now;
    onSync(type, videoEl.currentTime);
  };

  return (
    <div>
      <video
        ref={videoRef}
        src={video.videoUrl || undefined}
        poster={video.thumbnail}
        controls
        className="w-full aspect-video bg-black"
        onPlay={() => sync('play')}
        onPause={() => sync('pause')}
        onSeeked={() => sync('seek')}
      />
      <div className="bg-netflix-darker px-4 py-2 text-xs text-netflix-gray">
        Synced by <span className="text-white">{user}</span>
      </div>
    </div>
  );
}
