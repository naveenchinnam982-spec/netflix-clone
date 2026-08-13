// ============================
// Dashboard Overview Page
// ============================
// Admin dashboard overview with key metrics, charts, and recent activity.

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Video, Eye, DollarSign, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const stats: StatCard[] = [
  {
    title: 'Total Users',
    value: '125,430',
    change: '+12.5%',
    changeType: 'positive',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: 'Total Videos',
    value: '3,847',
    change: '+8.2%',
    changeType: 'positive',
    icon: Video,
    color: 'from-purple-500 to-purple-600',
  },
  {
    title: 'Total Views',
    value: '2.4M',
    change: '+24.3%',
    changeType: 'positive',
    icon: Eye,
    color: 'from-green-500 to-green-600',
  },
  {
    title: 'Revenue',
    value: '$48,250',
    change: '+18.7%',
    changeType: 'positive',
    icon: DollarSign,
    color: 'from-yellow-500 to-yellow-600',
  },
];

const recentActivities = [
  { action: 'New user registration', detail: 'John Doe created an account', time: '2 min ago' },
  { action: 'Video uploaded', detail: 'New tutorial video processed', time: '15 min ago' },
  { action: 'Live stream ended', detail: 'Coding session lasted 2h 30m', time: '1 hour ago' },
  { action: 'Payment received', detail: 'Premium subscription renewed', time: '3 hours ago' },
  { action: 'Content reported', detail: 'Video flagged for review', time: '5 hours ago' },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-netflix-dark rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-netflix-dark rounded-xl animate-pulse" />
        <div className="h-40 bg-netflix-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-netflix-dark/50 backdrop-blur-sm border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-netflix-gray text-sm">{stat.title}</p>
                <h3 className="text-white text-2xl font-bold mt-1">{stat.value}</h3>
                <span className={cn(
                  'text-xs font-medium',
                  stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                )}>
                  {stat.change}
                </span>
                <span className="text-netflix-gray text-xs ml-1">vs last month</span>
              </div>
              <div className={cn(
                'p-3 rounded-lg bg-gradient-to-br',
                stat.color
              )}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-netflix-dark/50 backdrop-blur-sm border border-white/5 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold">Views Over Time</h3>
            <BarChart3 className="w-5 h-5 text-netflix-gray" />
          </div>
          <div className="h-48 flex items-end justify-between gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-netflix-red to-red-500 rounded-t transition-all duration-500 hover:opacity-80"
                  style={{ height: `${40 + Math.random() * 60}%` }}
                />
                <span className="text-netflix-gray text-[10px]">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Storage Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-netflix-dark/50 backdrop-blur-sm border border-white/5 rounded-xl p-6"
        >
          <h3 className="text-white font-semibold mb-4">Storage & Bandwidth</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-netflix-gray">Storage Used</span>
                <span className="text-white">245 GB / 500 GB</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[49%] bg-gradient-to-r from-netflix-red to-red-500 rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-netflix-gray">Bandwidth Used</span>
                <span className="text-white">1.2 TB / 2 TB</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[60%] bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-netflix-gray">Monthly Transfer</span>
                <span className="text-white">3.5 TB</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[35%] bg-gradient-to-r from-green-500 to-green-600 rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-netflix-dark/50 backdrop-blur-sm border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-netflix-red flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{activity.action}</p>
                <p className="text-netflix-gray text-xs">{activity.detail}</p>
              </div>
              <span className="text-netflix-gray text-xs flex-shrink-0">{activity.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
