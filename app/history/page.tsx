'use client';

import { HistoryScreen } from '@/components/HistoryScreen';
import { useStoredWorkoutData } from '@/hooks/useStoredWorkoutData';

export default function HistoryPage() {
  const data = useStoredWorkoutData();
  return <HistoryScreen data={data} />;
}
