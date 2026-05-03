'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { ProgressDetailScreen } from '@/components/ProgressDetailScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData } from '@/lib/types';

export default function HistoryDetailPage() {
  const [data, setData] = useState<WorkoutData>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadWorkoutData());
  }, []);

  return <ProgressDetailScreen data={data} />;
}
