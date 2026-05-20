'use client';

import { ProgressDetailScreen } from '@/components/ProgressDetailScreen';
import { useStoredWorkoutData } from '@/hooks/useStoredWorkoutData';

export default function HistoryDetailPage() {
  const data = useStoredWorkoutData();
  return <ProgressDetailScreen data={data} />;
}
