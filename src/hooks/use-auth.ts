// ============================
// useAuth Hook
// ============================
// Provides authentication methods and state.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export function useAuth() {
  const router = useRouter();
  const store = useAuthStore();

  useEffect(() => {
    const unsubscribe = store.initialize();
    return () => {
      unsubscribe?.();
    };
  }, []);

  const requireAuth = (redirectTo: string = '/login') => {
    if (!store.isLoading && !store.isAuthenticated) {
      router.push(redirectTo);
    }
  };

  const requireAdmin = (redirectTo: string = '/browse') => {
    if (!store.isLoading && (!store.isAuthenticated || store.user?.role !== 'admin')) {
      router.push(redirectTo);
    }
  };

  const hasRole = (roles: string | string[]) => {
    if (!store.user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(store.user.role);
  };

  const isPremium = () => {
    if (!store.user) return false;
    return ['premium', 'monthly', 'yearly'].includes(store.user.subscription);
  };

  return {
    ...store,
    requireAuth,
    requireAdmin,
    hasRole,
    isPremium,
  };
}
