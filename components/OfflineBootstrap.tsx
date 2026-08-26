'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EXERCISES } from '@/lib/constants';
import { ROUTINES } from '@/lib/routines';
import { getRoutineDays } from '@/lib/routine-days';

const STATIC_ROUTES = [
  '/',
  '/workout',
  '/mobility',
  '/program',
  '/program/detail',
  '/progress',
  '/history',
  '/history/detail',
  '/history/body',
  '/muscles',
  '/settings',
  '/settings/body',
  '/settings/routine',
  '/settings/sync',
  '/sync',
] as const;

const ROUTES_TO_WARM = Array.from(new Set([
  ...STATIC_ROUTES,
  ...ROUTINES.flatMap((routine) => getRoutineDays(routine).map((day) => `/program/${day.slug}`)),
  ...EXERCISES.map((exercise) => `/exercises/${exercise.key}`),
]));

/**
 * After the first online visit, populate the service-worker runtime caches
 * for every route that can be reached without user-specific IDs.
 */
export function OfflineBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!navigator.onLine || !('serviceWorker' in navigator)) return;

    let cancelled = false;

    void navigator.serviceWorker.ready.then(async () => {
      if (cancelled) return;

      await Promise.allSettled(
        ROUTES_TO_WARM.map(async (route) => {
          void router.prefetch(route);
          const response = await fetch(route, { credentials: 'same-origin', cache: 'reload' });
          if (!response.ok) throw new Error(`Offline warm-up failed for ${route}: ${response.status}`);
        }),
      );

      if (!cancelled) document.documentElement.dataset.offlineReady = 'true';
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
