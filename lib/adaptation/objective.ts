import type { EffectiveVolumeEntry, FatigueState, MuscleGroup, RecoveryState } from '../types';
import { MUSCLE_PRIORITY_BY_MUSCLE } from './exercise-metadata';

export function smvVelocityPerRecoverableFatigue(input: {
  effectiveVolume: EffectiveVolumeEntry[];
  recovery: RecoveryState;
  fatigue: FatigueState;
  targetDate?: string | null;
  today?: Date;
}): number {
  const stimulus = input.effectiveVolume.reduce((sum, entry) => {
    const profile = MUSCLE_PRIORITY_BY_MUSCLE[entry.muscle];
    const productiveSets = Math.min(entry.sets, entry.target);
    const priorityMultiplier = profile.maintenanceOnly ? 0.35 : 1 + Math.max(0, 8 - profile.rank) * 0.06;
    return sum + productiveSets * profile.smvContribution * priorityMultiplier;
  }, 0);
  const localFatigue = mean(Object.values(input.fatigue.localMuscleFatigue));
  const recoverability = Math.max(0.15, meanRecovery(input.recovery));
  const fatigueCost = 1 + input.fatigue.systemicFatigue + input.fatigue.axialFatigue * 0.75 + localFatigue + input.fatigue.jointRisk;

  return roundOne((stimulus * recoverability) / fatigueCost);
}

export function getTargetDateGuardrail(input: {
  targetDate?: string | null;
  objectiveScore: number;
  progressionVelocity: number;
  today?: Date;
}): { targetDate: string | null; daysRemaining: number | null; warning: string | null } {
  if (!input.targetDate) return { targetDate: null, daysRemaining: null, warning: null };

  const today = input.today ?? new Date();
  const target = new Date(`${input.targetDate}T00:00:00`);
  const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const warning = daysRemaining > 0 && daysRemaining < 120 && input.progressionVelocity <= 0
    ? 'Trend is behind the date guardrail; improve recovery or adherence before adding fatigue.'
    : null;

  return {
    targetDate: input.targetDate,
    daysRemaining,
    warning,
  };
}

export function estimateMarginalStimulus(muscle: MuscleGroup, sets: number): number {
  const profile = MUSCLE_PRIORITY_BY_MUSCLE[muscle];
  return roundOne(sets * profile.smvContribution * (profile.maintenanceOnly ? 0.35 : 1));
}

function meanRecovery(recovery: RecoveryState): number {
  const muscleRecovery = Object.values(recovery.muscles).map((entry) => entry?.recoveryState ?? 0.8);
  return mean([recovery.systemic, ...muscleRecovery]);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
