import { resolveExerciseKey } from '../tiers';
import type { EffectiveVolumeEntry, ExerciseKey, MuscleGroup, RoutineConfig, SetEntry, UserProfile, WorkoutData, WorkoutType } from '../types';
import { getChainSetCount } from '../routine-plan';
import { setEntryRir } from '../types';
import { formatDateKey } from '../workout-utils';
import { MUSCLE_PRIORITY_PROFILES, MUSCLE_PRIORITY_BY_MUSCLE, getExerciseAdaptationMetadata } from './exercise-metadata';

export function getEffectiveWeeklyVolume(input: {
  data: WorkoutData;
  routine: RoutineConfig;
  profile: UserProfile | null;
  fallbackSets: number;
  today?: Date;
}): EffectiveVolumeEntry[] {
  const totals = getLoggedEffectiveVolume(input.data, input.today ?? new Date());
  const hasLoggedWeek = Object.values(totals).some((value) => value > 0);
  const source = hasLoggedWeek ? totals : getPlannedEffectiveVolume(input.routine, input.profile, input.fallbackSets);

  return MUSCLE_PRIORITY_PROFILES.map((profile) => {
    const sets = roundOne(source[profile.muscle] ?? 0);
    const highThreshold = profile.targetWeeklySets * 1.18;
    const status: EffectiveVolumeEntry['status'] = profile.maintenanceOnly
      ? sets >= profile.minimumWeeklySets ? 'maintenance' : 'low'
      : sets < profile.minimumWeeklySets ? 'low' : sets > highThreshold ? 'high' : 'productive';

    return {
      muscle: profile.muscle,
      sets,
      target: profile.targetWeeklySets,
      minimum: profile.minimumWeeklySets,
      priorityRank: profile.rank,
      status,
    };
  }).sort((a, b) => a.priorityRank - b.priorityRank);
}

export function getLoggedEffectiveVolume(data: WorkoutData, today: Date = new Date()): Partial<Record<MuscleGroup, number>> {
  const todayTime = startOfDay(today).getTime();
  const weekStart = todayTime - 6 * 24 * 60 * 60 * 1000;
  const totals: Partial<Record<MuscleGroup, number>> = {};

  for (const [dateKey, session] of Object.entries(data)) {
    const sessionTime = parseDateKey(dateKey).getTime();
    if (sessionTime < weekStart || sessionTime > todayTime) continue;

    for (const [key, value] of Object.entries(session)) {
      if (!Array.isArray(value)) continue;
      addExerciseSets(totals, key as ExerciseKey, value);
    }
  }

  return totals;
}

export function getLoggedWorkoutEffectiveVolume(data: WorkoutData, date: Date = new Date()): Partial<Record<MuscleGroup, number>> {
  const session = data[formatDateKey(date)];
  const totals: Partial<Record<MuscleGroup, number>> = {};
  if (!session?.logged_at) return totals;

  for (const [key, value] of Object.entries(session)) {
    if (!Array.isArray(value)) continue;
    addExerciseSets(totals, key as ExerciseKey, value);
  }

  return totals;
}

export function getPlannedEffectiveVolume(
  routine: RoutineConfig,
  profile: UserProfile | null,
  fallbackSets: number
): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {};
  const tiers = profile?.tiers ?? {};

  for (const chain of routine.tierChains) {
    const key = resolveExerciseKey(chain, tiers);
    const sets = getChainSetCount(chain, fallbackSets);
    addExerciseSets(totals, key, Array.from({ length: sets }, () => ({ reps: 10, weight: 0, rir: 2 })));
  }

  return totals;
}

export function getPlannedWorkoutEffectiveVolume(
  routine: RoutineConfig,
  profile: UserProfile | null,
  fallbackSets: number,
  workoutType: Exclude<WorkoutType, 'rest'>
): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {};
  const tiers = profile?.tiers ?? {};

  for (const chain of routine.tierChains) {
    if (chain.workoutType !== workoutType) continue;

    const key = resolveExerciseKey(chain, tiers);
    const sets = getChainSetCount(chain, fallbackSets);
    addExerciseSets(totals, key, Array.from({ length: sets }, () => ({ reps: 10, weight: 0, rir: 2 })));
  }

  return totals;
}

export function getVolumeForMuscle(volume: EffectiveVolumeEntry[], muscle: MuscleGroup): EffectiveVolumeEntry {
  return volume.find((entry) => entry.muscle === muscle) ?? {
    muscle,
    sets: 0,
    target: MUSCLE_PRIORITY_BY_MUSCLE[muscle].targetWeeklySets,
    minimum: MUSCLE_PRIORITY_BY_MUSCLE[muscle].minimumWeeklySets,
    priorityRank: MUSCLE_PRIORITY_BY_MUSCLE[muscle].rank,
    status: 'low',
  };
}

function addExerciseSets(
  totals: Partial<Record<MuscleGroup, number>>,
  exerciseKey: ExerciseKey,
  sets: SetEntry[]
): void {
  const metadata = getExerciseAdaptationMetadata(exerciseKey);
  if (!metadata) return;

  for (const set of sets) {
    const rir = setEntryRir(set) ?? 2;
    const effort = getEffortMultiplier(rir);
    const fatigueClassDiscount = 1 - Math.min(0.25, metadata.localDamage * 0.08 + metadata.systemicFatigue * 0.08);

    for (const [muscle, contribution] of Object.entries(metadata.indirectVolume) as [MuscleGroup, number][]) {
      totals[muscle] = (totals[muscle] ?? 0) + contribution * effort * fatigueClassDiscount;
    }
  }
}

function getEffortMultiplier(rir: number): number {
  if (rir <= 0) return 1.08;
  if (rir <= 2) return 1;
  if (rir <= 4) return 0.82;
  return 0.6;
}

function parseDateKey(dateKey: string): Date {
  return startOfDay(new Date(`${dateKey}T00:00:00`));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
