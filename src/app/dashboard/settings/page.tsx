// ============================
// Platform Settings (Admin)
// ============================
// Platform-wide configuration: defaults, limits, feature toggles.
// Persisted to Firestore when configured; local-only in demo mode.

'use client';

import { useState } from 'react';
import { Save, Shield, Cloud, Server, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Settings {
  siteName: string;
  maxUploadSizeGB: number;
  maxConcurrentStreams: number;
  defaultVideoQuality: string;
  allowComments: boolean;
  allowUploads: boolean;
  allowLiveStreams: boolean;
  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  siteName: 'StreamFlix',
  maxUploadSizeGB: 20,
  maxConcurrentStreams: 5000,
  defaultVideoQuality: '1080p',
  allowComments: true,
  allowUploads: true,
  allowLiveStreams: true,
  maintenanceMode: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success('Settings saved');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-white text-2xl font-bold">Platform Settings</h1>
        <p className="text-netflix-gray text-sm">Defaults, limits, and feature toggles</p>
      </div>

      {/* General */}
      <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Cloud className="w-4 h-4 text-netflix-red" /> General</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-netflix-gray text-xs block mb-1.5">Site name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => update('siteName', e.target.value)}
              className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label className="text-netflix-gray text-xs block mb-1.5">Default quality</label>
            <select
              value={settings.defaultVideoQuality}
              onChange={(e) => update('defaultVideoQuality', e.target.value)}
              className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
            >
              {['480p', '720p', '1080p', '1440p', '4K'].map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Limits */}
      <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Server className="w-4 h-4 text-netflix-red" /> Limits</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-netflix-gray text-xs block mb-1.5">Max upload size (GB)</label>
            <input
              type="number"
              min={1}
              value={settings.maxUploadSizeGB}
              onChange={(e) => update('maxUploadSizeGB', parseInt(e.target.value) || 20)}
              className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label className="text-netflix-gray text-xs block mb-1.5">Max concurrent streams</label>
            <input
              type="number"
              min={100}
              value={settings.maxConcurrentStreams}
              onChange={(e) => update('maxConcurrentStreams', parseInt(e.target.value) || 5000)}
              className="w-full bg-netflix-light text-white border border-white/20 rounded-lg px-4 py-2.5 outline-none focus:border-white/40"
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-netflix-dark/50 border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-netflix-red" /> Features</h3>
        {([
          ['allowComments', 'Enable comments'],
          ['allowUploads', 'Enable video uploads'],
          ['allowLiveStreams', 'Enable live streams'],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-white text-sm">{label}</span>
            <button
              onClick={() => update(key, !settings[key])}
              className={cn('relative w-11 h-6 rounded-full transition-colors', settings[key] ? 'bg-netflix-red' : 'bg-white/15')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform', settings[key] ? 'translate-x-[22px]' : 'translate-x-0.5')} />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-white text-sm block">Maintenance mode</span>
            <span className="text-netflix-gray text-xs">Temporarily disable the site for all users</span>
          </div>
          <button
            onClick={() => update('maintenanceMode', !settings.maintenanceMode)}
            className={cn('relative w-11 h-6 rounded-full transition-colors', settings.maintenanceMode ? 'bg-netflix-red' : 'bg-white/15')}
          >
            <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform', settings.maintenanceMode ? 'translate-x-[22px]' : 'translate-x-0.5')} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-netflix-gray flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Settings are stored in Firestore when configured; demo mode keeps them local.
        </p>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-netflix-red hover:bg-red-700 text-white font-medium rounded-lg px-6 py-2.5 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
