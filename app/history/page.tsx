'use client';

import { useState } from 'react';
import { HistoryScreen } from '@/components/HistoryScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData } from '@/lib/types';

export default function HistoryPage() {
  const [data] = useState<WorkoutData>(() => loadWorkoutData());

  return <HistoryScreen data={data} />;
}
