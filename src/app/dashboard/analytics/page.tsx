// ============================
// Analytics Page (Admin)
// ============================
// Platform metrics: users, watch time, revenue, top videos, categories,
// storage and bandwidth. Charts rendered with Recharts.

'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, Video, Eye, DollarSign, HardDrive, Radio } from 'lucide-react';
import { repo } from '@/lib/repository';
import { formatFileSize, formatViews, formatDuration } from '@/lib/utils';
import type { Analytics } from '@/types';

const PIE_COLORS = ['#E50914', '#2196F3', '#4CAF50', '#FF5722', '#9C27B0', '#FFC107'];

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    repo.getAnalytics().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 bg-netflix-dark rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const userSeries = data.userGrowth.map((v, i) => ({ month: `M${i + 1}`, users: v }));
  const uploadSeries = data.videoUploads.map((v, i) => ({ month: `M${i + 1}`, uploads: v }));
  const categoryPie = data.topCategories.map((c) => ({ name: c.name, value: c.videoCount || 5 }));

  const stats = [
    { label: 'Total Users', value: data.totalUsers.toLocaleString(), icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Videos', value: data.totalVideos.toLocaleString(), icon: Video, color: 'from-purple-500 to-purple-600' },
    { label: 'Watch Time', value: formatDuration(data.watchTime), icon: Eye, color: 'from-green-500 to-green-600' },
    { label: 'Revenue', value: `$${data.revenue.toLocaleString()}`, icon: DollarSign, color: 'from-yellow-500 to-yellow-600' },
    { label: 'Storage Used', value: formatFileSize(data.storageUsage), icon: HardDrive, color: 'from-red-500 to-red-600' },
    { label: 'Active Streams', value: data.activeStreams.toString(), icon: Radio, color: 'from-pink-500 to-pink-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Analytics</h1>
        <p className="text-netflix-gray text-sm">Platform performance at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-netflix-dark/50 border border-white/5 rounded-xl p-4">
            <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${stat.color} mb-3`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-white text-lg font-bold">{stat.value}</p>
            <p className="text-netflix-gray text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={userSeries}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E50914" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#E50914" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#808080" fontSize={12} />
              <YAxis stroke="#808080" fontSize={12} />
              <Tooltip contentStyle={{ background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Area type="monotone" dataKey="users" stroke="#E50914" fill="url(#userGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Video Uploads</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={uploadSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#808080" fontSize={12} />
              <YAxis stroke="#808080" fontSize={12} />
              <Tooltip contentStyle={{ background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="uploads" fill="#E50914" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Top Categories</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {categoryPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Legend wrapperStyle={{ color: '#808080', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Most Watched</h3>
          <div className="space-y-3">
            {data.mostWatched.map((video, i) => (
              <a key={video.id} href={`/watch/${video.id}`} className="flex items-center gap-3 hover:bg-white/[0.03] rounded-lg p-2 transition-colors">
                <span className="text-netflix-gray text-sm font-bold w-5">{i + 1}</span>
                <div className="w-24 aspect-video rounded overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={video.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{video.title}</p>
                  <p className="text-netflix-gray text-xs">{formatViews(video.views)} views</p>
                </div>
                <span className="text-netflix-gray text-xs">{video.category?.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Storage & Bandwidth */}
      <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Storage & Bandwidth</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-netflix-gray">Storage Used</span>
              <span className="text-white">{formatFileSize(data.storageUsage)}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-[49%] bg-gradient-to-r from-netflix-red to-red-500 rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-netflix-gray">Bandwidth Used</span>
              <span className="text-white">{formatFileSize(data.bandwidthUsage)}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-[60%] bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
