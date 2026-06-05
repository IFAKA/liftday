import { EXERCISES } from './constants';
import { getChainSetCount } from './routine-plan';
import { getChainsForRoutine, getProgressionPath, resolveExerciseKey } from './tiers';
import { ExerciseKey, RoutineConfig, UserProfile } from './types';
import { formatWorkoutType } from './schedule';

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
    `Profile: ${profile?.age ?? '?'} year old ${profile?.sex ?? 'unknown'}, ${profile?.heightCm ?? '?'} cm, ${profile?.weightKg ?? '?'} kg`,
    `Training background: ${profile?.trainingBackground ?? 'Not set'}`,
    `Injuries/pain: ${profile?.injuryStatus ?? 'Not set'}`,
    `Gym access: ${profile?.gymAccess === false ? 'No' : 'Yes'}`,
    `Max workout time: ${profile?.maxWorkoutMinutes ?? '?'} minutes`,
    `Default sets per exercise this week: ${fallbackSets}`,
    `Weekly schedule: ${routine.schedule.map((wt, index) => `${dayName(index)} ${wt}`).join(', ')}, Sunday rest`,
    '',
    '## Exercise slots',
  ];

  for (const workoutType of routine.schedule) {
    lines.push('', `### ${formatWorkoutType(workoutType)}`);
    const chains = getChainsForRoutine(routine, workoutType);
    for (const chain of chains) {
      const activeKey = resolveExerciseKey(chain, tiers);
      const active = getExerciseName(activeKey);
      const progression = getProgressionPath(chain).map(getExerciseName).join(' -> ');
      const alternatives = chain.alternatives?.length
        ? `; alternatives ${chain.alternatives.map(getExerciseName).join(', ')}`
        : '';
      const cadence = chain.cadence ? `; ${formatCadence(chain.cadence)}` : '';
      const setCount = getChainSetCount(chain, fallbackSets);
      const setText = chain.optional && setCount === 0
        ? `optional 0-${chain.prescription?.sets ?? fallbackSets} sets`
        : `${setCount} sets`;
      lines.push(`- ${chain.slotId}: ${active}; ${setText}; priority ${chain.priority}; ${chain.fixed ? 'fixed' : 'progression'}${cadence}; progression ${progression}${alternatives}`);
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
