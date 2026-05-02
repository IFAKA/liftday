'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TopBar } from '@/components/TopBar';
import { EXERCISES } from '@/lib/constants';
import { WorkoutData, WorkoutType, setEntryReps } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_COLOR: Record<Exclude<WorkoutType, 'rest'>, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

export function RecentSessionsScreen({ data }: { data: WorkoutData }) {
  const router = useRouter();
  const recentSessions = useMemo(() => {
    return Object.entries(data)
      .filter(([, s]) => s.logged_at)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 15);
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push('/history')} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={
          <div className="flex flex-col items-center">
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">Sessions</span>
            <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5">{recentSessions.length} RECENT</span>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-2">
        {recentSessions.map(([dateKey, session]) => (
          <SessionRow key={dateKey} dateKey={dateKey} session={session} onOpen={() => router.push(`/history/${dateKey}`)} />
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  dateKey,
  session,
  onOpen,
}: {
  dateKey: string;
  session: WorkoutData[string];
  onOpen: () => void;
}) {
  const wt = session.workout_type;
  const exercises = EXERCISES.filter((exercise) => exercise.workoutType === wt);
  const totalReps = exercises.reduce((sum, ex) => {
    const sets = session[ex.key];
    return sum + (sets ? sets.reduce<number>((s, e) => s + setEntryReps(e), 0) : 0);
  }, 0);
  const displayDate = new Date(dateKey + 'T12:00:00');

  return (
    <Card
      className="flex-row items-center justify-between gap-0 rounded-2xl bg-white/5 border-white/5 shadow-none cursor-pointer active:bg-white/10 transition-colors px-5 py-5"
      onClick={onOpen}
    >
      <div className="flex flex-col">
        <span className="text-fluid-label text-white/40 uppercase tracking-widest font-mono font-black mb-1">{format(displayDate, 'MMM d, EEE')}</span>
        <span className={cn('text-fluid-ui font-black uppercase tracking-tight leading-none', TYPE_COLOR[wt])}>{wt}</span>
      </div>
      <div className="text-right">
        <span className="text-fluid-ui font-black tabular-nums text-white leading-none">{totalReps}</span>
        <p className="text-fluid-label font-black font-mono text-white/40 uppercase tracking-widest mt-1">Reps</p>
      </div>
    </Card>
  );
}
