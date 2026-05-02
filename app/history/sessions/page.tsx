'use client';

import { useState } from 'react';
import { RecentSessionsScreen } from '@/components/RecentSessionsScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData } from '@/lib/types';

export default function HistorySessionsPage() {
  const [data] = useState<WorkoutData>(() => loadWorkoutData());

  return <RecentSessionsScreen data={data} />;
}
