'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HistoryScreen } from '@/components/HistoryScreen';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData } from '@/lib/types';

export default function HistoryPage() {
  const router = useRouter();
  const [data] = useState<WorkoutData>(() => loadWorkoutData());

  return <HistoryScreen data={data} onBack={() => router.push('/')} />;
}
