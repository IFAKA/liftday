'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { RoutineScreen } from '@/components/RoutineScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData, Exercise, SetEntry } from '@/lib/types';
import { EXERCISES } from '@/lib/constants';
import { formatWorkoutType, getWorkoutTypeTone } from '@/lib/schedule';

export default function HistoryDetailPage() {
  const params = useParams<{ date: string }>();
  const dateKey = params.date;
  const [data] = useState<WorkoutData>(() => loadWorkoutData());

  const session = data[dateKey];
  if (!session) {
    return (
      <RoutineScreen
        exercises={[]}
        title="Not Found"
        subtitle="SESSION"
        emptyMessage="No logged session for this date."
      />
    );
  }

  const wt = session.workout_type;
  const exercisesWithReps: Exercise[] = EXERCISES.filter((ex) => {
    const reps = session[ex.key];
    return reps && reps.length > 0;
  });
  const loggedReps: Record<string, SetEntry[]> = {};
  for (const ex of exercisesWithReps) {
    const reps = session[ex.key];
    if (reps) loggedReps[ex.key] = reps;
  }
  const displayDate = new Date(dateKey + 'T12:00:00');

  return (
    <RoutineScreen
      exercises={exercisesWithReps}
      title={wt ? formatWorkoutType(wt) : ''}
      titleColor={wt ? getWorkoutTypeTone(wt) : 'text-white'}
      subtitle={format(displayDate, 'MMM d, EEE').toUpperCase()}
      loggedReps={loggedReps}
    />
  );
}
