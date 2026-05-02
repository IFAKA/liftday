'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { loadWorkoutData } from '@/lib/storage';
import { EXERCISES } from '@/lib/constants';
import { WorkoutData, setEntryReps, setEntryWeight } from '@/lib/types';
import { WatchListItem } from '@/components/WatchSurface';

export default function PersonalBestsPage() {
  const router = useRouter();
  const [data] = useState<WorkoutData>(() => typeof window !== 'undefined' ? loadWorkoutData() : {});

  const prs = useMemo(() => {
    const result: Record<string, { reps: number; weight?: number }> = {};
    for (const session of Object.values(data)) {
      if (!session.logged_at) continue;
      for (const ex of EXERCISES) {
        const sets = session[ex.key];
        if (!sets || sets.length === 0) continue;
        if (ex.unit === 'weighted') {
          // Best set by estimated 1RM (weight × reps as proxy)
          for (const entry of sets) {
            const w = setEntryWeight(entry);
            const r = setEntryReps(entry);
            if (w === null) continue;
            const prev = result[ex.key];
            const prevScore = prev?.weight !== undefined ? prev.weight * prev.reps : 0;
            if (!prev || w * r > prevScore) result[ex.key] = { reps: r, weight: w };
          }
        } else {
          const best = Math.max(...sets.map(setEntryReps));
          if (!result[ex.key] || best > (result[ex.key].reps ?? 0)) result[ex.key] = { reps: best };
        }
      }
    }
    return result;
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.back()} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={
          <div className="flex flex-col items-center">
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">Personal Bests</span>
            <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5">{Object.keys(prs).length} EXERCISES</span>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2">
        <div className="flex flex-col gap-3">
          {EXERCISES.filter((ex) => prs[ex.key]).map((ex) => (
            <WatchListItem
              key={ex.key}
              onClick={() => router.push(`/exercises/${ex.key}`)}
              title={ex.name}
              metric={
                prs[ex.key].weight !== undefined
                  ? `${prs[ex.key].weight}kg × ${prs[ex.key].reps}`
                  : `${prs[ex.key].reps} ${ex.unit === 'seconds' ? 'secs' : 'reps'}`
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
