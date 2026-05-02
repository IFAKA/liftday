'use client';

import { useState } from 'react';
import { ProgressDetailScreen } from '@/components/ProgressDetailScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData } from '@/lib/types';

export default function HistoryDetailPage() {
  const [data] = useState<WorkoutData>(() => loadWorkoutData());

  return <ProgressDetailScreen data={data} />;
}
