import { EXERCISES } from './constants';
import { getChainSetCount } from './routine-plan';
import { getChainsForWorkout, resolveExerciseKey } from './tiers';
import { ExerciseKey, RoutineConfig, UserProfile } from './types';

export function formatRoutineForCopy(
  routine: RoutineConfig | null,
  profile: UserProfile | null,
  fallbackSets: number
): string {
  if (!routine) return 'No routine is currently selected.';
  const tiers = profile?.tiers ?? {};
  const lines = [
    '# Current training routine',
    '',
    `Routine: ${routine.name} (${routine.id})`,
    `Goal: ${profile?.goal ?? 'Not set'}`,
    `Profile: ${profile?.age ?? '?'} year old ${profile?.sex ?? 'unknown'}, ${profile?.heightCm ?? '?'} cm, ${profile?.weightKg ?? '?'} kg, ${profile?.bodyComposition ?? 'body composition not set'}`,
    `Training background: ${profile?.trainingBackground ?? 'Not set'}`,
    `Injuries/pain: ${profile?.injuryStatus ?? 'Not set'}`,
    `Gym access: ${profile?.gymAccess === false ? 'No' : 'Yes'}`,
    `Max workout time: ${profile?.maxWorkoutMinutes ?? '?'} minutes`,
    `Default sets per exercise this week: ${fallbackSets}`,
    `Weekly schedule: ${routine.schedule.map((wt, index) => `${dayName(index)} ${wt}`).join(', ')}, Sunday rest`,
    '',
    '## Exercise slots',
  ];

  for (const workoutType of ['push', 'pull', 'legs'] as const) {
    lines.push('', `### ${workoutType.toUpperCase()}`);
    const chains = getChainsForWorkout(workoutType, routine.id);
    for (const chain of chains) {
      const activeKey = resolveExerciseKey(chain, tiers);
      const active = getExerciseName(activeKey);
      const options = chain.exercises.map(getExerciseName).join(' -> ');
      const cadence = chain.cadence ? `; ${formatCadence(chain.cadence)}` : '';
      lines.push(`- ${chain.slotId}: ${active}; ${getChainSetCount(chain, fallbackSets)} sets; priority ${chain.priority}; ${chain.fixed ? 'fixed' : 'progression'}${cadence}; options ${options}`);
    }
  }

  return lines.join('\n');
}

export function formatCadence(cadence?: RoutineConfig['tierChains'][number]['cadence']): string {
  if (cadence === 'first') return 'first weekly';
  if (cadence === 'second') return 'second weekly';
  return '';
}

export function getExerciseName(key: ExerciseKey): string {
  return EXERCISES.find((exercise) => exercise.key === key)?.name ?? key;
}

function dayName(index: number): string {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index] ?? `Day ${index + 1}`;
}
