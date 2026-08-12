// ============================
// Profile Page
// ============================
// View and edit profile: display name, avatar, playback preferences,
// notification preferences, and subscription status.

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Camera, Save, Shield, Crown, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import type { VideoQuality } from '@/types';
import toast from 'react-hot-toast';

const QUALITIES: VideoQuality[] = ['240p', '360p', '480p', '720p', '1080p', '1440p', '4K'];

export default function ProfilePage() {
  const { user, updateUserProfile, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <p className="text-white">Please sign in</p>
      </div>
    );
  }

  const prefs = user.preferences;

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateUserProfile({ displayName: displayName.trim() || user.displayName });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const setPref = async (key: string, value: unknown) => {
    try {
      await updateUserProfile({ preferences: { ...prefs, [key]: value } });
      toast.success('Preference saved');
    } catch {
      toast.error('Failed to save preference');
    }
  };

  const setNotifPref = async (key: string, value: boolean) => {
    try {
      await updateUserProfile({
        preferences: { ...prefs, notifications: { ...prefs.notifications, [key]: value } },
      });
    } catch {
      toast.error('Failed to save notification preference');
    }
  };

  const isPremium = ['premium', 'monthly', 'yearly'].includes(user.subscription);

  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="max-w-4xl mx-auto px-4 md:px-12 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <h1 className="text-white text-3xl font-bold">Profile</h1>

          {/* Identity Card */}
          <div className="bg-netflix-dark/50 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-netflix-red flex items-center justify-center text-white text-4xl font-bold">
                {user.photoURL ? (
                  <Image src={user.photoURL} alt={user.displayName} width={96} height={96} className="object-cover" />
                ) : (
                  user.displayName?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <button
                className="absolute bottom-0 right-0 p-2 bg-netflix-red rounded-full hover:bg-red-700 transition-colors"
                aria-label="Change avatar"
                onClick={() => toast('Avatar upload requires Firebase Storage setup')}
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-white text-2xl font-bold">{user.displayName}</h2>
                {isPremium && <Crown className="w-5 h-5 text-yellow-400" />}
              </div>
              <p className="text-netflix-gray">{user.email}</p>
              <p className="text-netflix-gray text-sm mt-1">
                {user.emailVerified ? '✓ Email verified' : '✗ Email not verified'} · {user.role} account
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                <span className={cn('text-xs px-3 py-1 rounded-full font-medium', isPremium ? 'bg-yellow-500/10 text-yellow-400' : 'bg-white/10 text-netflix-gray')}>
                  {isPremium ? 'PREMIUM' : 'FREE PLAN'}
                </span>
                {!isPremium && (
                  <a href="/pricing" className="text-xs text-netflix-red hover:underline">Upgrade</a>
                )}
              </div>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="bg-netflix-dark/50 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Edit Profile</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-white/40 transition-colors"
                placeholder="Display name"
              />
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-netflix-red hover:bg-red-700 text-white font-medium rounded-lg px-6 py-3 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Playback Preferences */}
          <div className="bg-netflix-dark/50 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Playback</h3>
            <div className="space-y-4">
              <ToggleRow
                label="Autoplay previews on browse"
                checked={prefs.autoplay}
                onChange={(v) => setPref('autoplay', v)}
              />
              <ToggleRow
                label="Autoplay next video"
                checked={prefs.autoplayNext}
                onChange={(v) => setPref('autoplayNext', v)}
              />
              <ToggleRow
                label="Subtitles enabled"
                checked={prefs.subtitlesEnabled}
                onChange={(v) => setPref('subtitlesEnabled', v)}
              />
              <div>
                <label className="text-netflix-gray text-sm block mb-2">Preferred quality</label>
                <div className="flex flex-wrap gap-2">
                  {QUALITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => setPref('videoQuality', q)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                        prefs.videoQuality === q
                          ? 'bg-netflix-red border-netflix-red text-white'
                          : 'bg-netflix-light border-white/10 text-netflix-gray hover:text-white'
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-netflix-dark/50 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Notifications</h3>
            <div className="space-y-4">
              {([
                ['uploads', 'Upload completed'],
                ['liveStreams', 'Live streams started'],
                ['comments', 'Comments and replies'],
                ['recommendations', 'Recommendations'],
                ['marketing', 'Marketing emails'],
              ] as const).map(([key, label]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  checked={prefs.notifications[key]}
                  onChange={(v) => setNotifPref(key, v)}
                />
              ))}
            </div>
          </div>

          {/* Account Actions */}
          <div className="flex flex-wrap gap-3">
            <a href="/pricing" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg px-6 py-3 transition-colors">
              <Crown className="w-4 h-4 text-yellow-400" /> Manage Subscription
            </a>
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-white/5 hover:bg-red-500/10 text-red-500 font-medium rounded-lg px-6 py-3 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
            <a href="/dashboard" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-netflix-gray hover:text-white font-medium rounded-lg px-6 py-3 transition-colors">
              <Shield className="w-4 h-4" /> Admin Dashboard
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white text-sm">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          checked ? 'bg-netflix-red' : 'bg-white/15'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}
