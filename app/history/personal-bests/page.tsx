'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { loadWorkoutData } from '@/lib/storage';
import { EXERCISES } from '@/lib/constants';
import { WorkoutData, setEntryReps, setEntryWeight } from '@/lib/types';

export default function PersonalBestsPage() {
  const router = useRouter();
  const [data, setData] = useState<WorkoutData>({});

  useEffect(() => {
    setData(loadWorkoutData());
  }, []);

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
            <div key={ex.key} onClick={() => router.push(`/exercises/${ex.key}`)} className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer active:bg-white/10 transition-colors">
              <span className="text-fluid-ui font-black uppercase tracking-tight text-white truncate">{ex.name}</span>
              <div className="flex items-baseline gap-2 shrink-0 ml-3">
                {prs[ex.key].weight !== undefined ? (
                  <>
                    <span className="text-fluid-ui font-black tabular-nums tracking-tighter text-white leading-none">{prs[ex.key].weight}kg</span>
                    <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">× {prs[ex.key].reps}</span>
                  </>
                ) : (
                  <>
                    <span className="text-fluid-ui font-black tabular-nums tracking-tighter text-white leading-none">{prs[ex.key].reps}</span>
                    <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">{ex.unit === 'seconds' ? 'Secs' : 'Reps'}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
