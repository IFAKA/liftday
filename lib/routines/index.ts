import { RoutineConfig } from '../types';
import { calisthenicsRoutine } from './calisthenics';
import { gymRoutine } from './gym';

// Add new routines here — one import + one entry in this array.
export const ROUTINES: RoutineConfig[] = [calisthenicsRoutine, gymRoutine];

export function getRoutine(id: string): RoutineConfig {
  return ROUTINES.find((r) => r.id === id) ?? ROUTINES[0];
}
