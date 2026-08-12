// ============================
// Live Streams Page
// ============================
// Directory of live and upcoming streams, plus a form for teachers to
// create a new live class.

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Users, PlayCircle, Plus, Loader2 } from 'lucide-react';
import { repo } from '@/lib/repository';
import { useAuthStore } from '@/store/auth-store';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { LiveStream } from '@/types';
import toast from 'react-hot-toast';

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const user = useAuthStore(s => s.user);

  const canHost = user && ['admin', 'teacher'].includes(user.role);

  useEffect(() => {
    repo.getLiveStreams().then((list) => {
      setStreams(list);
      setLoading(false);
    });
  }, []);

  const createStream = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const stream = await repo.createLiveStream({ title, description });
      toast.success('Live stream created');
      window.location.href = `/live/${stream.id}`;
    } catch {
      toast.error('Failed to create live stream');
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-6xl mx-auto px-4 md:px-12 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Radio className="w-8 h-8 text-netflix-red animate-pulse" />
              <div>
                <h1 className="text-white text-3xl font-bold">Live Classes</h1>
                <p className="text-netflix-gray text-sm">Zoom-style interactive sessions</p>
              </div>
            </div>
            {canHost && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-netflix-red hover:bg-red-700 text-white font-medium rounded-lg px-5 py-2.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Start Live Class
              </button>
            )}
          </div>

          {/* Create Form */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-netflix-dark/50 border border-white/10 rounded-xl p-6 mb-8 space-y-4"
            >
              <h3 className="text-white font-semibold">New Live Class</h3>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Class title (e.g. Advanced Physics — Quantum Basics)"
                className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-white/40"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Class description..."
                rows={3}
                className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-white/40 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={createStream}
                  disabled={creating || !title.trim()}
                  className="flex items-center gap-2 bg-netflix-red hover:bg-red-700 text-white font-medium rounded-lg px-6 py-2.5 transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                  Go Live
                </button>
                <button onClick={() => setShowForm(false)} className="text-netflix-gray hover:text-white px-4 py-2.5 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Streams Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 bg-netflix-dark rounded-xl animate-pulse" />
              ))}
            </div>
          ) : streams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {streams.map((stream, i) => {
                const isLive = stream.status === 'live';
                return (
                  <motion.a
                    key={stream.id}
                    href={`/live/${stream.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative rounded-xl overflow-hidden bg-netflix-dark border border-white/5 hover:border-white/20 transition-all hover:scale-[1.01]"
                  >
                    <div className="aspect-video bg-netflix-light relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={stream.thumbnail || '/images/placeholder.jpg'} alt={stream.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-card" />
                      <span className={cn(
                        'absolute top-3 left-3 flex items-center gap-1.5 text-white text-xs font-bold px-2.5 py-1 rounded-full',
                        isLive ? 'bg-netflix-red' : 'bg-white/20 backdrop-blur'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', isLive ? 'bg-white animate-pulse' : 'bg-netflix-gray')} />
                        {isLive ? 'LIVE' : stream.status}
                      </span>
                      <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded-full">
                        <Users className="w-3 h-3" /> {stream.viewers}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-medium line-clamp-1 group-hover:text-netflix-red transition-colors">{stream.title}</h3>
                      <p className="text-netflix-gray text-sm line-clamp-1 mt-1">{stream.description || 'Interactive live session'}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-netflix-gray text-xs">{stream.teacher?.displayName || 'Teacher'}</span>
                        <span className="text-netflix-gray text-xs">{formatRelativeDate(stream.createdAt)}</span>
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <PlayCircle className="w-16 h-16 text-netflix-gray mx-auto mb-4" />
              <h2 className="text-white text-xl font-medium mb-2">No live classes right now</h2>
              <p className="text-netflix-gray">{canHost ? 'Start your own class with the button above' : 'Check back soon for upcoming sessions'}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
