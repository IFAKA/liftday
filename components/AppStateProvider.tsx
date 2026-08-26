'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useMobility } from '@/hooks/useMobility';
import { useWorkout, type UseWorkoutReturn } from '@/hooks/useWorkout';
import { installNativeWorkoutBridge, publishWorkoutSnapshot } from '@/lib/native-bridge';

interface AppStateValue {
  workout: UseWorkoutReturn;
  mobility: ReturnType<typeof useMobility>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const workout = useWorkout(new Date());
  const mobility = useMobility();

  useEffect(() => {
    const cleanup = installNativeWorkoutBridge(workout.surfaceSnapshot, {
      startPlank: workout.startWarmupTimer,
      busy: workout.handleMachineOccupied,
      log: (reps, weight) => workout.logSet(reps, weight),
      skipRest: workout.skipTimer,
      repeatCooldown: workout.repeatCooldown,
      end: workout.finishWorkout,
    });
    publishWorkoutSnapshot(workout.surfaceSnapshot);
    return cleanup;
  // The callbacks are stable hook-owned commands; the snapshot is the only changing bridge payload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.surfaceSnapshot]);

  return (
    <AppStateContext.Provider value={{ workout, mobility }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
