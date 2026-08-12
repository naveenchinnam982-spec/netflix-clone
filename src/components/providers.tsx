// ============================
// Global Providers
// ============================
// Wraps the app with necessary context providers.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    setMounted(true);
    return () => {
      unsubscribe?.();
    };
  }, [initialize]);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
