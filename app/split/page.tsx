'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WeeklySplit } from '@/components/WeeklySplit';
import { loadWorkoutData } from '@/lib/storage';
import { WorkoutData } from '@/lib/types';

export default function SplitPage() {
  const router = useRouter();
  const [data, setData] = useState<WorkoutData>({});

  useEffect(() => {
    setData(loadWorkoutData());
  }, []);

  return <WeeklySplit currentDate={new Date()} data={data} onBack={() => router.push('/')} />;
}
