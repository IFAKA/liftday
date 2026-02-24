'use client';

import { useMemo } from 'react';
import { isTrainingDay, getTrainingDaysCompletedThisWeek, getNextTrainingMessage } from '@/lib/schedule';
import { formatDateKey } from '@/lib/workout-utils';
import { WorkoutData } from '@/lib/types';

export function useSchedule(date: Date, data: WorkoutData) {
  return useMemo(() => {
    const dateKey = formatDateKey(date);
    const training = isTrainingDay(date);
    const todayDone = !!data[dateKey]?.logged_at;
    const weekProgress = getTrainingDaysCompletedThisWeek(date, data);
    const nextTraining = !training ? getNextTrainingMessage(date) : null;

    return {
      isTraining: training,
      isDone: todayDone,
      weekProgress,
      nextTraining,
      dateKey,
    };
  }, [date, data]);
}
