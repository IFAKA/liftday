'use client';

import { useMemo } from 'react';
import { isTrainingDay, getTrainingDaysCompletedThisWeek, getNextTrainingMessage } from '@/lib/schedule';
import { formatDateKey } from '@/lib/workout-utils';
import { WorkoutData } from '@/lib/types';
import { ROUTINES } from '@/lib/routines';
import { loadUserProfile } from '@/lib/storage';

export function useSchedule(date: Date, data: WorkoutData) {
  return useMemo(() => {
    const dateKey = formatDateKey(date);
    const profile = loadUserProfile();
    if (!profile?.activeRoutine) {
      return { isTraining: false, isDone: false, weekProgress: { completed: 0, total: 0 }, nextTraining: null, dateKey, routineError: null };
    }
    const routine = ROUTINES.find((candidate) => candidate.id === profile.activeRoutine);
    if (!routine) {
      return { isTraining: false, isDone: false, weekProgress: { completed: 0, total: 0 }, nextTraining: null, dateKey, routineError: `Unknown routine "${profile.activeRoutine}".` };
    }
    const training = isTrainingDay(date, routine.schedule, routine.trainingWeekdays);
    const todayDone = !!data[dateKey]?.logged_at;
    const weekProgress = getTrainingDaysCompletedThisWeek(date, data, routine.schedule, routine.trainingWeekdays);
    const nextTraining = !training ? getNextTrainingMessage(date, routine.schedule, routine.trainingWeekdays) : null;

    return {
      isTraining: training,
      isDone: todayDone,
      weekProgress,
      nextTraining,
      dateKey,
      routineError: null,
    };
  }, [date, data]);
}
