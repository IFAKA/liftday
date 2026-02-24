'use client';

import { useEffect } from 'react';

export function WakeLockProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;

    const acquire = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock not available or permission denied
      }
    };

    const reacquire = () => {
      if (!document.hidden && !sentinel) acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', reacquire);

    return () => {
      document.removeEventListener('visibilitychange', reacquire);
      sentinel?.release();
    };
  }, []);

  return <>{children}</>;
}
