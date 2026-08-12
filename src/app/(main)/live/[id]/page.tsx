// ============================
// Live Classroom Page
// ============================
// Zoom-style live class room: local video, remote peers, live chat,
// raise hand, mute controls, screen share, whiteboard, and recording.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Hand, MessageCircle,
  Users, Radio, Download, Presentation
} from 'lucide-react';
import { useLiveStream } from '@/hooks/use-live-stream';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

export default function LiveRoomPage() {
  const params = useParams();
  const streamId = params.id as string;
  const user = useAuthStore(s => s.user);
  const isTeacher = user?.role === 'admin' || user?.role === 'teacher';
  const displayName = user?.displayName || 'Guest';

  const {
    localStream, remoteStreams, messages, mediaState, isRecording, raisedHand,
    viewers, error, startCamera, startScreenShare, stopSharing, toggleMic,
    toggleCamera, muteUser, toggleRaiseHand, sendMessage, toggleRecording,
  } = useLiveStream({ streamId, isTeacher, displayName });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatText, setChatText] = useState('');
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-netflix-red text-white text-xs font-bold px-3 py-1.5 rounded-full">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE
            </div>
            <h1 className="text-white font-semibold">Live Class · {streamId}</h1>
            <span className="flex items-center gap-1 text-netflix-gray text-sm">
              <Users className="w-4 h-4" /> {viewers}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWhiteboardOpen(!whiteboardOpen)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg px-4 py-2 transition-colors"
            >
              <Presentation className="w-4 h-4" /> Whiteboard
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg px-4 py-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Chat
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className={cn('grid gap-4', chatOpen ? 'lg:grid-cols-[1fr_320px]' : 'grid-cols-1')}>
          {/* Video Area */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Local video */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-netflix-dark border border-white/10">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!mediaState.video && (
                  <div className="absolute inset-0 flex items-center justify-center bg-netflix-darker">
                    <div className="w-16 h-16 rounded-full bg-netflix-red flex items-center justify-center text-white text-2xl font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                <span className="absolute bottom-2 left-2 text-xs bg-black/60 backdrop-blur text-white px-2 py-1 rounded flex items-center gap-1.5">
                  {mediaState.screen ? <MonitorUp className="w-3 h-3" /> : null}
                  You {isTeacher ? '(Teacher)' : ''}
                  {!mediaState.audio && <MicOff className="w-3 h-3 text-red-400" />}
                </span>
              </div>

              {/* Remote peers */}
              {remoteStreams.map((peer) => (
                <RemoteVideo key={peer.id} stream={peer.stream} name={`Peer ${peer.id.slice(-4)}`} onMute={isTeacher ? () => muteUser(peer.id) : undefined} />
              ))}

              {remoteStreams.length === 0 && !mediaState.screen && (
                <div className="col-span-full aspect-video rounded-xl bg-netflix-darker border border-dashed border-white/10 flex flex-col items-center justify-center text-netflix-gray">
                  <Radio className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">Waiting for participants to join...</p>
                  <p className="text-xs mt-1">Share the room URL to invite students</p>
                </div>
              )}
            </div>

            {/* Whiteboard */}
            {whiteboardOpen && <Whiteboard />}

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 flex-wrap bg-netflix-darker/60 border border-white/5 rounded-2xl p-4">
              <ControlButton active={mediaState.audio} onClick={toggleMic} icon={mediaState.audio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />} label={mediaState.audio ? 'Mute' : 'Unmute'} danger={!mediaState.audio} />
              <ControlButton active={mediaState.video} onClick={toggleCamera} icon={mediaState.video ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />} label={mediaState.video ? 'Camera On' : 'Camera Off'} danger={!mediaState.video} />
              <ControlButton active={false} onClick={() => (mediaState.screen ? stopSharing() : startScreenShare())} icon={<MonitorUp className="w-5 h-5" />} label={mediaState.screen ? 'Stop Share' : 'Share Screen'} highlight={mediaState.screen} />
              <ControlButton active={raisedHand} onClick={toggleRaiseHand} icon={<Hand className="w-5 h-5" />} label={raisedHand ? 'Lower Hand' : 'Raise Hand'} highlight={raisedHand} />
              {isTeacher && (
                <ControlButton active={isRecording} onClick={toggleRecording} icon={<Download className="w-5 h-5" />} label={isRecording ? 'Stop Recording' : 'Record'} highlight={isRecording} pulse={isRecording} />
              )}
              <a
                href="/live"
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-3 font-medium transition-colors"
              >
                <PhoneOff className="w-5 h-5" /> Leave
              </a>
            </div>
          </div>

          {/* Chat Panel */}
          {chatOpen && (
            <div className="flex flex-col bg-netflix-darker/60 border border-white/5 rounded-2xl h-[520px]">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-white text-sm font-semibold">Live Chat</span>
                <span className="text-netflix-gray text-xs">{messages.length} messages</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn('text-sm', msg.type === 'text' ? '' : 'text-center')}>
                    {msg.type === 'text' ? (
                      <>
                        <span className="text-netflix-gray text-xs">{msg.user.displayName}:</span>
                        <p className="text-white text-sm">{msg.message}</p>
                      </>
                    ) : (
                      <span className="text-netflix-gray text-xs italic">{msg.message}</span>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage(chatText);
                      setChatText('');
                    }
                  }}
                  placeholder="Send a message..."
                  className="flex-1 bg-netflix-light text-white text-sm border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-white/30"
                />
                <button
                  onClick={() => {
                    sendMessage(chatText);
                    setChatText('');
                  }}
                  className="bg-netflix-red hover:bg-red-700 text-white text-sm rounded-lg px-4 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({ stream, name, onMute }: { stream: MediaStream; name: string; onMute?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-netflix-dark border border-white/10">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <span className="absolute bottom-2 left-2 text-xs bg-black/60 backdrop-blur text-white px-2 py-1 rounded">{name}</span>
      {onMute && (
        <button
          onClick={onMute}
          className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur rounded-full text-white hover:bg-netflix-red transition-colors"
          title="Mute participant"
        >
          <MicOff className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function ControlButton({ active, onClick, icon, label, danger, highlight, pulse }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
  danger?: boolean; highlight?: boolean; pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all',
        danger ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
        highlight ? 'bg-netflix-red text-white hover:bg-red-700' :
        active ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/10 text-white hover:bg-white/20',
        pulse && 'animate-pulse'
      )}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const pos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const down = (e: PointerEvent) => {
      drawing.current = true;
      ctx.beginPath();
      const p = pos(e);
      ctx.moveTo(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!drawing.current) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const up = () => (drawing.current = false);

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', up);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl overflow-hidden border border-white/10 bg-netflix-dark">
      <div className="flex items-center justify-between px-4 py-2 bg-netflix-darker">
        <span className="text-white text-sm font-medium">Whiteboard</span>
        <button onClick={clear} className="text-xs text-netflix-gray hover:text-white px-3 py-1 rounded hover:bg-white/10 transition-colors">
          Clear
        </button>
      </div>
      <canvas ref={canvasRef} className="w-full touch-none" style={{ aspectRatio: '16/5' }} />
    </motion.div>
  );
}
