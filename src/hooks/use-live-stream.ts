// ============================
// useLiveStream Hook
// ============================
// Powers the live-classroom experience:
//   - getUserMedia for camera/microphone
//   - getDisplayMedia for screen sharing
//   - WebRTC peer mesh with Socket.io signaling (works in demo mode with
//     local echo when no socket server is configured)
//   - Live chat, raise hand, mute/unmute, recording (MediaRecorder)

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import type { ChatMessage, StreamMediaState } from '@/types';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface LivePeer {
  id: string;
  stream: MediaStream;
  state: StreamMediaState;
}

interface UseLiveStreamOptions {
  streamId: string;
  isTeacher: boolean;
  displayName: string;
}

export function useLiveStream({ streamId, isTeacher, displayName }: UseLiveStreamOptions) {
  const socket = useRef(getSocket()).current;
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerStreamsRef = useRef<Map<string, MediaStream>>(new Map());

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<LivePeer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mediaState, setMediaState] = useState<StreamMediaState>({ audio: true, video: true, screen: false });
  const [isRecording, setIsRecording] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [viewers, setViewers] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // ---------- Join / leave room ----------
  useEffect(() => {
    // Capture stable references for the cleanup below (refs may change).
    const peers = peersRef.current;
    const stream = streamRef.current;

    socket.emit('stream:join', { streamId, user: { displayName, role: isTeacher ? 'teacher' : 'student' } });
    const onViewers = (count: number) => setViewers(count);
    const onMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
    socket.on('stream:viewers', onViewers);
    socket.on('stream:chat', onMessage);

    // WebRTC signaling
    const onSignal = async (payload: { from: string; signal: any }) => {
      let pc = peers.get(payload.from);
      if (!pc) {
        pc = createPeer(payload.from, false);
        peers.set(payload.from, pc);
      }
      try {
        if (payload.signal?.type === 'offer') {
          await pc.setRemoteDescription(payload.signal);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('stream:signal', { to: payload.from, signal: pc.localDescription });
        } else if (payload.signal?.candidate) {
          await pc.addIceCandidate(payload.signal.candidate);
        } else if (payload.signal?.type === 'answer') {
          await pc.setRemoteDescription(payload.signal);
        }
      } catch {
        // Ignore transient signaling races.
      }
    };
    socket.on('stream:signal', onSignal);

    return () => {
      socket.emit('stream:leave', { streamId });
      socket.off('stream:viewers', onViewers);
      socket.off('stream:chat', onMessage);
      socket.off('stream:signal', onSignal);
      peers.forEach((pc) => pc.close());
      peers.clear();
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  const createPeer = (peerId: string, initiator: boolean): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    streamRef.current?.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('stream:signal', { to: peerId, signal: { candidate: e.candidate } });
      }
    };
    pc.ontrack = (e) => {
      const existing = peerStreamsRef.current.get(peerId);
      if (existing) {
        e.streams.forEach((s) => s.getTracks().forEach((t) => existing.addTrack(t)));
        return;
      }
      const stream = new MediaStream();
      e.streams.forEach((s) => s.getTracks().forEach((t) => stream.addTrack(t)));
      peerStreamsRef.current.set(peerId, stream);
      setRemoteStreams((prev) => [
        ...prev.filter((p) => p.id !== peerId),
        { id: peerId, stream, state: { audio: true, video: true, screen: false } },
      ]);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        peersRef.current.delete(peerId);
        peerStreamsRef.current.delete(peerId);
        setRemoteStreams((prev) => prev.filter((p) => p.id !== peerId));
      }
    };

    if (initiator) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socket.emit('stream:signal', { to: peerId, signal: offer });
      });
    }
    return pc;
  };

  // ---------- Media control ----------
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setLocalStream(stream);
      setMediaState({ audio: true, video: true, screen: false });
      // Offer to any peers that joined before us.
      socket.emit('stream:join', { streamId, user: { displayName, role: isTeacher ? 'teacher' : 'student' } });
      return stream;
    } catch {
      setError('Could not access camera or microphone. Check permissions.');
      return null;
    }
  }, [socket, streamId, displayName, isTeacher]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      setLocalStream(stream);
      setMediaState((s) => ({ ...s, screen: true, video: true }));
      return stream;
    } catch {
      setError('Screen share was cancelled or unavailable.');
      return null;
    }
  }, []);

  const stopSharing = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setMediaState((s) => ({ ...s, screen: false }));
    startCamera();
  }, [startCamera]);

  const toggleMic = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() || [];
    tracks.forEach((t) => (t.enabled = !t.enabled));
    setMediaState((s) => ({ ...s, audio: !s.audio }));
  }, []);

  const toggleCamera = useCallback(() => {
    const tracks = streamRef.current?.getVideoTracks() || [];
    tracks.forEach((t) => (t.enabled = !t.enabled));
    setMediaState((s) => ({ ...s, video: !s.video }));
  }, []);

  const muteUser = useCallback(
    (peerId: string) => {
      socket.emit('stream:mute', { streamId, peerId });
    },
    [socket, streamId]
  );

  const toggleRaiseHand = useCallback(() => {
    setRaisedHand((h) => {
      socket.emit('stream:raise-hand', { streamId, raised: !h });
      return !h;
    });
  }, [socket, streamId]);

  // ---------- Chat ----------
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        streamId,
        userId: 'local',
        user: { uid: 'local', email: '', displayName, photoURL: '', role: isTeacher ? 'teacher' : 'student', emailVerified: true, isBanned: false, subscription: 'free', createdAt: '', lastLoginAt: '', preferences: {} as any, stats: {} as any },
        message: text,
        type: 'text',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
      socket.emit('stream:chat', { streamId, message: text, user: msg.user });
    },
    [socket, streamId, displayName, isTeacher]
  );

  // ---------- Recording ----------
  const toggleRecording = useCallback(() => {
    if (!streamRef.current) return;
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const recorder = new MediaRecorder(streamRef.current);
    recordedChunks.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${streamId}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }, [isRecording, streamId]);

  return {
    localStream,
    remoteStreams,
    messages,
    mediaState,
    isRecording,
    raisedHand,
    viewers,
    error,
    startCamera,
    startScreenShare,
    stopSharing,
    toggleMic,
    toggleCamera,
    muteUser,
    toggleRaiseHand,
    sendMessage,
    toggleRecording,
  };
}
