// ============================
// Live Streams Management (Admin)
// ============================
// Monitor active/ended live streams with viewer counts and moderation entry.

'use client';

import { useEffect, useState } from 'react';
import { Radio, Users, MonitorPlay, Ban } from 'lucide-react';
import { repo } from '@/lib/repository';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { LiveStream } from '@/types';

export default function LiveAdminPage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getLiveStreams().then((list) => {
      setStreams(list);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-netflix-dark rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Live Streams</h1>
        <p className="text-netflix-gray text-sm">{streams.filter(s => s.status === 'live').length} currently live</p>
      </div>

      <div className="space-y-3">
        {streams.map((stream) => (
          <div key={stream.id} className="bg-netflix-dark/50 border border-white/5 rounded-xl p-4 flex items-center gap-4">
            <div className={cn(
              'flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0',
              stream.status === 'live' ? 'bg-netflix-red text-white' : 'bg-white/10 text-netflix-gray'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', stream.status === 'live' ? 'bg-white animate-pulse' : 'bg-netflix-gray')} />
              {stream.status.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{stream.title}</p>
              <p className="text-netflix-gray text-xs">
                {stream.teacher?.displayName || 'Teacher'} · {formatRelativeDate(stream.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-4 text-netflix-gray text-sm">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {stream.viewers}</span>
              <span className="flex items-center gap-1"><MonitorPlay className="w-4 h-4" /> {stream.participants?.length || 0}</span>
            </div>
            <a
              href={`/live/${stream.id}`}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg px-4 py-2 transition-colors"
            >
              <Radio className="w-4 h-4" /> Join
            </a>
            {stream.status === 'live' && (
              <button className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg px-4 py-2 transition-colors">
                <Ban className="w-4 h-4" /> End
              </button>
            )}
          </div>
        ))}
        {streams.length === 0 && (
          <div className="text-center py-16 text-netflix-gray">No live streams found</div>
        )}
      </div>
    </div>
  );
}
