import type { DailyLog, ExerciseKey, MuscleGroup, MuscleRecoveryProfile, RecoveryState, SetEntry, WorkoutData } from '../types';
import { setEntryRir } from '../types';
import { MUSCLE_PRIORITY_PROFILES, MUSCLE_PRIORITY_BY_MUSCLE, getExerciseAdaptationMetadata } from './exercise-metadata';

const HOUR_MS = 60 * 60 * 1000;

export function getRecoveryState(input: {
  data: WorkoutData;
  dailyLogs?: Record<string, DailyLog>;
  today?: Date;
}): RecoveryState {
  const today = input.today ?? new Date();
  const fatigueLoads = getDecayedMuscleLoads(input.data, today);
  const latestLog = getLatestLog(input.dailyLogs ?? {}, today);
  const muscles: RecoveryState['muscles'] = {};

  for (const profile of MUSCLE_PRIORITY_PROFILES) {
    const soreness = clamp01((latestLog?.muscleSoreness?.[profile.muscle] ?? 0) / 5);
    const fatigueLoad = fatigueLoads[profile.muscle] ?? 0;
    const recoveryState = clamp01(1 - fatigueLoad / 10 - soreness * 0.35);
    muscles[profile.muscle] = {
      muscle: profile.muscle,
      recoveryState: roundTwo(recoveryState),
      fatigueLoad: roundTwo(fatigueLoad),
      soreness: roundTwo(soreness),
      halfLifeHours: profile.recoveryHalfLifeHours,
    };
  }

  const systemic = getSystemicRecovery(latestLog);
  const bottleneck = Object.values(muscles)
    .filter((entry): entry is MuscleRecoveryProfile => Boolean(entry))
    .sort((a, b) => a.recoveryState - b.recoveryState)[0] ?? null;

  return {
    systemic,
    muscles,
    bottleneck,
    generatedAt: today.toISOString(),
  };
}

function getDecayedMuscleLoads(data: WorkoutData, today: Date): Partial<Record<MuscleGroup, number>> {
  const loads: Partial<Record<MuscleGroup, number>> = {};
  const now = today.getTime();

  for (const [dateKey, session] of Object.entries(data)) {
    const sessionDate = new Date(`${dateKey}T12:00:00`);
    const hoursAgo = Math.max(0, (now - sessionDate.getTime()) / HOUR_MS);
    if (hoursAgo > 168) continue;

    for (const [key, value] of Object.entries(session)) {
      if (!Array.isArray(value)) continue;
      const metadata = getExerciseAdaptationMetadata(key as ExerciseKey);
      if (!metadata) continue;

      const sets = value as SetEntry[];
      for (const [muscle, contribution] of Object.entries(metadata.indirectVolume) as [MuscleGroup, number][]) {
        const halfLife = MUSCLE_PRIORITY_BY_MUSCLE[muscle]?.recoveryHalfLifeHours ?? 24;
        const decay = Math.pow(0.5, hoursAgo / halfLife);
        const setLoad = sets.reduce<number>((sum, set) => sum + getSetLoad(set, metadata.localDamage), 0);
        loads[muscle] = (loads[muscle] ?? 0) + setLoad * contribution * decay;
      }
    }
  }

  return loads;
}

function getSetLoad(set: SetEntry, localDamage: number): number {
  const rir = setEntryRir(set) ?? 2;
  const proximity = rir <= 0 ? 1.25 : rir <= 2 ? 1 : rir <= 4 ? 0.75 : 0.5;
  return proximity * (0.75 + localDamage * 0.5);
}

function getLatestLog(logs: Record<string, DailyLog>, today: Date): DailyLog | null {
  const todayKey = today.toISOString().slice(0, 10);
  return Object.values(logs)
    .filter((log) => log.dateKey <= todayKey)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0] ?? null;
}

function getSystemicRecovery(log: DailyLog | null): number {
  if (!log) return 0.82;
  const fatiguePenalty = ((log.fatigue ?? 2) - 1) * 0.12;
  const sleepPenalty = log.sleepHours === undefined ? 0 : Math.max(0, 7 - log.sleepHours) * 0.08;
  return roundTwo(clamp01(0.95 - fatiguePenalty - sleepPenalty));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
