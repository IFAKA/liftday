import { RoutineConfig } from '../types';
import { calisthenicsRoutine } from './calisthenics';
import { gymRoutine } from './gym';

// Gym is the app's primary routine; calisthenics remains available as a backup routine.
export const ROUTINES: RoutineConfig[] = [gymRoutine, calisthenicsRoutine];

export function getRoutine(id: string): RoutineConfig {
  return ROUTINES.find((r) => r.id === id) ?? gymRoutine;
}
