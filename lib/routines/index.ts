import { RoutineConfig } from '../types';
import { calisthenicsRoutine } from './calisthenics';
import { gymRoutine } from './gym';

export const ROUTINES: RoutineConfig[] = [gymRoutine, calisthenicsRoutine];

export function getRoutine(id: string): RoutineConfig {
  const routine = ROUTINES.find((r) => r.id === id);
  if (!routine) throw new Error(`Unknown routine "${id}".`);
  return routine;
}
