'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Exercise, SetEntry, setEntryReps, setEntryWeight } from '@/lib/types';
import { TopBar } from './TopBar';
import { WatchBackButton, WatchListItem, WatchScreen } from './WatchSurface';

interface RoutineScreenProps {
  exercises: Exercise[];
  title: string;
  titleColor?: string;
  subtitle?: string;
  /** If provided, show logged sets next to each exercise (history view) */
  loggedReps?: Record<string, SetEntry[]>;
  /** Hide the top bar — used when embedded inside another page that has its own header */
  hideTopBar?: boolean;
  emptyMessage?: string;
}

export function RoutineScreen({ exercises, title, titleColor, subtitle, loggedReps, hideTopBar, emptyMessage }: RoutineScreenProps) {
  const router = useRouter();
  return (
    <WatchScreen
      top={!hideTopBar && (
        <TopBar
          leftAction={<WatchBackButton />}
          center={
            <div className="flex flex-col items-center">
              <span className={cn('text-fluid-ui font-black uppercase tracking-tight leading-none', titleColor ?? 'text-white')}>
                {title}
              </span>
              {subtitle && (
                <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5">{subtitle}</span>
              )}
            </div>
          }
        />
      )}
      bodyClassName="pt-2"
    >
      {hideTopBar && (
        <header className="flex flex-col items-start mb-4">
          <span className={cn('text-fluid-ui font-black uppercase tracking-tight leading-none', titleColor ?? 'text-white')}>
            {title}
          </span>
          {subtitle && (
            <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5">{subtitle}</span>
          )}
        </header>
      )}
      {exercises.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center px-4 text-center">
          <p className="text-fluid-label font-mono uppercase text-white/35">
            {emptyMessage ?? 'No exercises logged.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((ex, i) => {
            const reps = loggedReps?.[ex.key];
            const setSummary = reps && reps.length > 0
              ? reps.map((e) => {
                const w = setEntryWeight(e);
                return w !== null ? `${w}×${setEntryReps(e)}` : setEntryReps(e);
              }).join(' / ')
              : undefined;

            return (
              <WatchListItem
                key={ex.key}
                onClick={() => router.push(`/exercises/${ex.key}`)}
                label={`${i + 1}`}
                title={ex.name}
                subtitle={setSummary}
              />
            );
          })}
        </div>
      )}
    </WatchScreen>
  );
}
