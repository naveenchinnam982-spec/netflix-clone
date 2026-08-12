// ============================
// Navbar Component
// ============================
// Netflix-inspired navigation bar with scroll effects, search, and user menu.

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, ChevronDown, Menu, X, User, LogOut, Settings, Heart, Clock, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import type { NavbarProps, Notification } from '@/types';

export function Navbar({ transparent = false, onSearchToggle }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Background change
      setIsScrolled(currentScrollY > 50);
      
      // Hide/show navbar on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Search effect
  useEffect(() => {
    if (debouncedSearch) {
      router.push(`/search?q=${encodeURIComponent(debouncedSearch)}`);
    }
  }, [debouncedSearch, router]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  const navLinks = [
    { href: '/browse', label: 'Home' },
    { href: '/trending', label: 'Trending' },
    { href: '/latest', label: 'Latest' },
    { href: '/my-list', label: 'My List' },
    { href: '/categories', label: 'Categories' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out-expo',
        isScrolled || !transparent
          ? 'bg-netflix-black/95 backdrop-blur-md shadow-netflix'
          : 'bg-gradient-to-b from-black/80 to-transparent',
        isVisible ? 'translate-y-0' : '-translate-y-full'
      )}
    >
      <div className="flex items-center justify-between px-4 md:px-12 h-16 md:h-20">
        {/* Left Section */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/browse" className="flex-shrink-0">
            <h1 className="text-netflix-red text-3xl md:text-4xl font-bold tracking-tighter">
              NETFLIX
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors duration-200 hover:text-white',
                  pathname === link.href
                    ? 'text-white font-semibold'
                    : 'text-netflix-gray-light'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-white hover:text-netflix-gray-light transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 300, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute right-0 top-1/2 -translate-y-1/2"
                >
                  <input
                    type="text"
                    placeholder="Search titles, people, genres"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-netflix-dark border border-white/20 rounded px-4 py-2 text-white text-sm outline-none focus:border-white/50 transition-colors"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-white hover:text-netflix-gray-light transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-netflix-red rounded-full text-xs flex items-center justify-center text-white">
                  {notifications.length}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-netflix-dark border border-white/10 rounded-lg shadow-netflix-xl overflow-hidden"
                >
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-white font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-netflix-gray text-sm">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
                        >
                          <p className="text-white text-sm">{notification.title}</p>
                          <p className="text-netflix-gray text-xs mt-1">{notification.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 group"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-md overflow-hidden bg-netflix-red">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                      {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-200" />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-netflix-dark border border-white/10 rounded-lg shadow-netflix-xl overflow-hidden z-20"
                    >
                      <div className="p-4 border-b border-white/10">
                        <p className="text-white text-sm font-medium truncate">{user.displayName}</p>
                        <p className="text-netflix-gray text-xs truncate">{user.email}</p>
                      </div>
                      <div className="py-2">
                        <MenuItem href="/profile" icon={User} label="Profile" onClick={() => setShowUserMenu(false)} />
                        <MenuItem href="/my-list" icon={Heart} label="My List" onClick={() => setShowUserMenu(false)} />
                        <MenuItem href="/history" icon={Clock} label="History" onClick={() => setShowUserMenu(false)} />
                        {user.role === 'admin' && (
                          <MenuItem href="/dashboard" icon={Settings} label="Admin Dashboard" onClick={() => setShowUserMenu(false)} />
                        )}
                        <MenuItem href="/dashboard/upload" icon={Upload} label="Upload Video" onClick={() => setShowUserMenu(false)} />
                      </div>
                      <div className="border-t border-white/10 py-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-white text-sm font-medium hover:text-netflix-gray-light transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-netflix-red text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-netflix-black border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'block text-sm py-2 transition-colors',
                    pathname === link.href
                      ? 'text-white font-semibold'
                      : 'text-netflix-gray-light'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// Menu Item Component
function MenuItem({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
