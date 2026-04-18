'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { RoutineScreen } from '@/components/RoutineScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData, WorkoutType, Exercise, SetEntry } from '@/lib/types';
import { PUSH_EXERCISES, PULL_EXERCISES, LEGS_EXERCISES } from '@/lib/constants';

const TYPE_COLOR: Record<Exclude<WorkoutType, 'rest'>, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

export default function HistoryDetailPage() {
  const params = useParams<{ date: string }>();
  const dateKey = params.date;
  const [data] = useState<WorkoutData>(() => loadWorkoutData());

  const session = data[dateKey];
  if (!session) return null;

  const wt = session.workout_type;
  const allExercises: Exercise[] = wt === 'push' ? PUSH_EXERCISES : wt === 'pull' ? PULL_EXERCISES : LEGS_EXERCISES;
  const exercisesWithReps = allExercises.filter((ex) => {
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
      title={wt?.toUpperCase() ?? ''}
      titleColor={wt ? TYPE_COLOR[wt] : 'text-white'}
      subtitle={format(displayDate, 'MMM d, EEE').toUpperCase()}
      loggedReps={loggedReps}
    />
  );
}
