'use client';

import { useEffect, useState } from 'react';
import { loadWorkoutData } from '@/lib/storage';
import type { WorkoutData } from '@/lib/types';

export function useStoredWorkoutData(): WorkoutData {
  const [data, setData] = useState<WorkoutData>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadWorkoutData());
  }, []);

  return data;
}
