// ============================
// Users Management (Admin)
// ============================
// List users, ban/unban, change roles.

'use client';

import { useEffect, useState } from 'react';
import { Search, Shield, ShieldBan, UserCog, Ban, CheckCircle2 } from 'lucide-react';
import { repo } from '@/lib/repository';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { User, UserRole } from '@/types';
import toast from 'react-hot-toast';

const ROLES: UserRole[] = ['admin', 'teacher', 'student', 'user'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list = await repo.getUsers();
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter(
    u => u.displayName?.toLowerCase().includes(query.toLowerCase()) || u.email?.toLowerCase().includes(query.toLowerCase())
  );

  const toggleBan = async (user: User) => {
    await repo.setUserBanStatus(user.uid, !user.isBanned);
    setUsers(prev => prev.map(u => (u.uid === user.uid ? { ...u, isBanned: !u.isBanned } : u)));
    toast.success(user.isBanned ? 'User unbanned' : 'User banned');
  };

  const changeRole = async (user: User, role: UserRole) => {
    await repo.setUserRole(user.uid, role);
    setUsers(prev => prev.map(u => (u.uid === user.uid ? { ...u, role } : u)));
    toast.success(`Role set to ${role}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-netflix-dark rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Users</h1>
          <p className="text-netflix-gray text-sm">{users.length} total · {users.filter(u => u.isBanned).length} banned</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-netflix-gray" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="bg-netflix-light text-white text-sm border border-white/10 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-white/30"
          />
        </div>
      </div>

      <div className="bg-netflix-dark/50 border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-netflix-gray">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.uid} className={cn('border-b border-white/5 hover:bg-white/[0.02] transition-colors', user.isBanned && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-netflix-red flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          user.displayName?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.displayName}</p>
                        <p className="text-netflix-gray text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user, e.target.value as UserRole)}
                        className="appearance-none bg-netflix-light text-white text-xs border border-white/10 rounded-lg px-3 py-1.5 pr-8 outline-none focus:border-white/30 cursor-pointer"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <UserCog className="w-3.5 h-3.5 text-netflix-gray pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-netflix-gray">{user.subscription}</td>
                  <td className="px-4 py-3 text-netflix-gray">{formatRelativeDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs border',
                      user.isBanned
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/20'
                    )}>
                      {user.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleBan(user)}
                        className={cn(
                          'flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors',
                          user.isBanned
                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        )}
                      >
                        {user.isBanned ? <><CheckCircle2 className="w-3.5 h-3.5" /> Unban</> : <><Ban className="w-3.5 h-3.5" /> Ban</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-netflix-gray">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-netflix-gray">
        <Shield className="w-4 h-4" />
        Role changes and bans are enforced by Firebase rules and the auth middleware.
        {users.some(u => u.uid === 'demo-admin') && <ShieldBan className="w-4 h-4 ml-2" />}
      </div>
    </div>
  );
}
