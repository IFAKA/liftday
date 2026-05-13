'use client';

import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { EXERCISES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatWorkoutType } from '@/lib/schedule';

const TYPE_COLOR: Record<string, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

export default function ExerciseDetailPage() {
  const router = useRouter();
  const { key } = useParams<{ key: string }>();
  const ex = EXERCISES.find((e) => e.key === key);

  if (!ex) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <span className="text-white/30 font-black uppercase tracking-widest text-fluid-label">Exercise not found</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
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
            <span className={cn('text-fluid-ui font-black uppercase tracking-tight leading-none', TYPE_COLOR[ex.workoutType] ?? 'text-white')}>
              {ex.name}
            </span>
            <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5 uppercase">{formatWorkoutType(ex.workoutType)}</span>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">How to</span>
          <p className="text-fluid-ui text-white/80 leading-relaxed">{ex.instruction}</p>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 flex-1">
            <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">Unit</span>
            <span className="text-fluid-ui font-black uppercase text-white">{ex.unit === 'seconds' ? 'Seconds' : 'Reps'}</span>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 flex-1">
            <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">Type</span>
            <span className={cn('text-fluid-ui font-black uppercase', TYPE_COLOR[ex.workoutType] ?? 'text-white')}>{formatWorkoutType(ex.workoutType)}</span>
          </div>
        </div>

        {ex.youtubeId && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.open(`https://www.youtube.com/watch?v=${ex.youtubeId}`, '_blank', 'noopener,noreferrer')}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 text-fluid-label font-black uppercase text-white/65 active:bg-white/10"
          >
            Open Tutorial
          </Button>
        )}
      </div>
    </div>
  );
}
