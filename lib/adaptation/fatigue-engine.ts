import type { DailyLog, ExerciseKey, FatigueState, JointArea, MuscleGroup, RecoveryState, WorkoutData } from '../types';
import { getExerciseAdaptationMetadata } from './exercise-metadata';

export function getFatigueState(input: {
  data: WorkoutData;
  dailyLogs?: Record<string, DailyLog>;
  recovery: RecoveryState;
  today?: Date;
}): FatigueState {
  const localMuscleFatigue: Partial<Record<MuscleGroup, number>> = {};
  const connectiveTissueFatigue: Partial<Record<JointArea, number>> = {};
  let axialFatigue = 0;
  let systemicFatigue = 0;
  const today = input.today ?? new Date();
  const todayTime = today.getTime();

  for (const [dateKey, session] of Object.entries(input.data)) {
    const sessionTime = new Date(`${dateKey}T12:00:00`).getTime();
    const daysAgo = Math.max(0, (todayTime - sessionTime) / (24 * 60 * 60 * 1000));
    if (daysAgo > 14) continue;
    const decay = Math.pow(0.5, daysAgo / 3);

    for (const [key, value] of Object.entries(session)) {
      if (!Array.isArray(value)) continue;
      const metadata = getExerciseAdaptationMetadata(key as ExerciseKey);
      if (!metadata) continue;
      const setCount = value.length;
      axialFatigue += metadata.axialFatigue * setCount * decay;
      systemicFatigue += metadata.systemicFatigue * setCount * decay;

      for (const [muscle, contribution] of Object.entries(metadata.indirectVolume) as [MuscleGroup, number][]) {
        localMuscleFatigue[muscle] = (localMuscleFatigue[muscle] ?? 0) + contribution * metadata.localDamage * setCount * decay;
      }

      for (const [joint, stress] of Object.entries(metadata.jointStress) as [JointArea, number][]) {
        connectiveTissueFatigue[joint] = (connectiveTissueFatigue[joint] ?? 0) + stress * setCount * decay;
      }
    }
  }

  const latestLog = getLatestLog(input.dailyLogs ?? {}, today);
  for (const [joint, score] of Object.entries(latestLog?.jointPainScores ?? {}) as [JointArea, number][]) {
    connectiveTissueFatigue[joint] = (connectiveTissueFatigue[joint] ?? 0) + score;
  }
  if (latestLog?.jointPain) {
    connectiveTissueFatigue.shoulder = Math.max(connectiveTissueFatigue.shoulder ?? 0, 3);
    connectiveTissueFatigue.elbow = Math.max(connectiveTissueFatigue.elbow ?? 0, 3);
  }

  const normalizedLocal = normalizeRecord(localMuscleFatigue, 8);
  const normalizedConnective = normalizeRecord(connectiveTissueFatigue, 8);
  const normalizedAxial = roundTwo(clamp01(axialFatigue / 16));
  const logFatigue = latestLog?.fatigue ? (latestLog.fatigue - 1) / 4 : 0;
  const normalizedSystemic = roundTwo(clamp01(systemicFatigue / 22 + logFatigue * 0.35 + (1 - input.recovery.systemic) * 0.35));
  const jointRisk = roundTwo(Math.max(0, ...Object.values(normalizedConnective)));

  return {
    localMuscleFatigue: normalizedLocal,
    connectiveTissueFatigue: normalizedConnective,
    axialFatigue: normalizedAxial,
    systemicFatigue: normalizedSystemic,
    jointRisk,
    bottlenecks: getBottlenecks(normalizedLocal, normalizedConnective, normalizedAxial, normalizedSystemic),
  };
}

function getLatestLog(logs: Record<string, DailyLog>, today: Date): DailyLog | null {
  const todayKey = today.toISOString().slice(0, 10);
  return Object.values(logs)
    .filter((log) => log.dateKey <= todayKey)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0] ?? null;
}

function normalizeRecord<T extends string>(record: Partial<Record<T, number>>, divisor: number): Partial<Record<T, number>> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, roundTwo(clamp01((value as number) / divisor))])
  ) as Partial<Record<T, number>>;
}

function getBottlenecks(
  local: Partial<Record<MuscleGroup, number>>,
  connective: Partial<Record<JointArea, number>>,
  axial: number,
  systemic: number
): string[] {
  const entries = [
    ...Object.entries(local).map(([key, value]) => [`${key.replace('_', ' ')} fatigue`, value] as const),
    ...Object.entries(connective).map(([key, value]) => [`${key} joint risk`, value] as const),
    ['axial fatigue', axial] as const,
    ['systemic fatigue', systemic] as const,
  ];

  return entries
    .filter(([, value]) => value >= 0.62)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
