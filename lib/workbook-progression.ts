import type { ExerciseKey, SMVExercisePrescription, WorkoutData } from './types';
import { getPreviousExerciseSessionDate } from './workout-utils';
import { setEntryReps, setEntryRir } from './types';

export type WorkbookProgressionStatus = 'add_weight' | 'build_reps' | 'too_easy' | 'repeat';

export interface WorkbookProgressionGuidance {
  status: WorkbookProgressionStatus;
  label: string;
  detail: string;
}

export function getWorkbookProgressionGuidance(
  exerciseKey: ExerciseKey,
  prescription: SMVExercisePrescription,
  data: WorkoutData,
  date = new Date(),
): WorkbookProgressionGuidance {
  const previousDate = getPreviousExerciseSessionDate(date, data, exerciseKey);
  const sets = previousDate ? data[previousDate]?.[exerciseKey] : undefined;
  if (!sets || sets.length === 0) {
    return { status: 'repeat', label: 'First session', detail: 'Start inside the rep range at the target RIR.' };
  }

  const topOfRange = sets.every((set) => setEntryReps(set) >= prescription.maxReps);
  const targetRir = sets.every((set) => {
    const rir = setEntryRir(set);
    return rir === null || (rir >= prescription.targetRirMin && rir <= prescription.targetRirMax);
  });
  const tooEasy = sets.some((set) => (setEntryRir(set) ?? prescription.targetRirMax) > prescription.targetRirMax);

  if (topOfRange && targetRir) {
    return { status: 'add_weight', label: 'Add smallest load', detail: 'Top reps reached at target RIR. Increase weight by the smallest available step.' };
  }
  if (tooEasy) {
    return { status: 'too_easy', label: 'Too easy', detail: 'Effort was easier than target. Keep the load and make the next set harder.' };
  }
  if (sets.some((set) => setEntryReps(set) >= prescription.minReps && setEntryReps(set) < prescription.maxReps)) {
    return { status: 'build_reps', label: 'Build reps', detail: 'Stay at this load and add reps until the top of the range.' };
  }
  return { status: 'repeat', label: 'Repeat load', detail: 'Repeat the load and keep every set inside the prescribed range.' };
}
