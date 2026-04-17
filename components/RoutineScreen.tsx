'use client';

import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exercise } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TopBar } from './TopBar';

interface RoutineScreenProps {
  exercises: Exercise[];
  title: string;
  titleColor?: string;
  subtitle?: string;
  /** If provided, show logged reps next to each exercise (history view) */
  loggedReps?: Record<string, number[]>;
  onBack: () => void;
}

export function RoutineScreen({ exercises, title, titleColor, subtitle, loggedReps, onBack }: RoutineScreenProps) {
  useEffect(() => {
    const handlePopState = () => {
      onBack();
      window.history.pushState({ routine: true }, '');
    };
    window.history.pushState({ routine: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBack]);

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
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

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2">
        <div className="flex flex-col gap-3">
          {exercises.map((ex, i) => {
            const reps = loggedReps?.[ex.key];
            return (
              <div
                key={ex.key}
                className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 border border-white/5"
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
                    {reps.join(' / ')}
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
