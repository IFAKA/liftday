'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { HistoryScreen } from '@/components/HistoryScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData } from '@/lib/types';

export default function HistoryPage() {
  const [data, setData] = useState<WorkoutData>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadWorkoutData());
  }, []);

  return <HistoryScreen data={data} />;
}
