'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exercise, SetEntry, setEntryReps, setEntryWeight } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TopBar } from './TopBar';

interface RoutineScreenProps {
  exercises: Exercise[];
  title: string;
  titleColor?: string;
  subtitle?: string;
  /** If provided, show logged sets next to each exercise (history view) */
  loggedReps?: Record<string, SetEntry[]>;
  /** Hide the top bar — used when embedded inside another page that has its own header */
  hideTopBar?: boolean;
}

export function RoutineScreen({ exercises, title, titleColor, subtitle, loggedReps, hideTopBar }: RoutineScreenProps) {
  const router = useRouter();
  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      {!hideTopBar && (
        <TopBar
          leftAction={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back"
              onClick={() => router.back()}
              className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          }
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

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2">
        {hideTopBar && (
          <div className="flex flex-col items-start mb-4">
            <span className={cn('text-fluid-ui font-black uppercase tracking-tight leading-none', titleColor ?? 'text-white')}>
              {title}
            </span>
            {subtitle && (
              <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5">{subtitle}</span>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3">
          {exercises.map((ex, i) => {
            const reps = loggedReps?.[ex.key];
            return (
              <div
                key={ex.key}
                onClick={() => router.push(`/exercises/${ex.key}`)}
                className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer active:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-fluid-label font-mono text-white/30 tabular-nums w-5 shrink-0 text-right">
                    {i + 1}
                  </span>
                  <span className="text-fluid-ui font-black uppercase tracking-tight text-white truncate">
                    {ex.name}
                  </span>
                </div>
                {reps && reps.length > 0 && (
                  <span className="text-fluid-label font-mono text-white/50 tabular-nums shrink-0 ml-3">
                    {reps.map((e) => {
                      const w = setEntryWeight(e);
                      return w !== null ? `${w}×${setEntryReps(e)}` : setEntryReps(e);
                    }).join(' / ')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
