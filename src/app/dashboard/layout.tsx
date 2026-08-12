// ============================
// Dashboard Layout
// ============================
// Admin dashboard layout with sidebar navigation, stats overview, and auth protection.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Upload, Video, BarChart3, Users, FolderTree,
  Settings, Radio, LogOut, ChevronLeft, Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

const sidebarLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/upload', label: 'Upload Video', icon: Upload },
  { href: '/dashboard/videos', label: 'Videos', icon: Video },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/categories', label: 'Categories', icon: FolderTree },
  { href: '/dashboard/live', label: 'Live Streams', icon: Radio },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/browse');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-40 h-screen bg-netflix-darker border-r border-white/5 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          {sidebarOpen && (
            <Link href="/dashboard" className="text-netflix-red text-xl font-bold">
              ADMIN
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-netflix-gray hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-netflix-red/10 text-netflix-red'
                    : 'text-netflix-gray hover:text-white hover:bg-white/5'
                )}
                title={!sidebarOpen ? link.label : undefined}
              >
                <link.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-netflix-gray hover:text-red-500 hover:bg-red-500/5 transition-all w-full"
            title={!sidebarOpen ? 'Sign Out' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        'transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-16'
      )}>
        {/* Top Bar */}
        <header className="bg-netflix-darker border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-lg font-semibold">
                {sidebarLinks.find(l => pathname.startsWith(l.href))?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/browse"
                className="text-sm text-netflix-gray hover:text-white transition-colors"
              >
                Back to Site
              </Link>
              <div className="w-8 h-8 rounded-full bg-netflix-red flex items-center justify-center text-white text-sm font-bold">
                {user.displayName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
