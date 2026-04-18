// Research basis:
// - Sell et al. 2017 (Royal Society B): perceived upper body strength = 61-73% of attractiveness variance
// - Durkee et al. 2019 (N=1742 women): ranked 14 muscle groups by preference
// - 2025 cross-cultural study (China/Lithuania/UK): body fat 13-14% = optimal; dominates shape ratios
import type { Exercise, MuscleGroup } from './types';

export const MUSCLE_SMV_SCORE: Record<MuscleGroup, number> = {
  side_delt:  10, // V-taper width; primary shoulder width signal
  lats:        9, // V-taper depth; massive strength signal (Sell 2017)
  chest:       9, // #1 strength signal; largest upper-body muscle
  shoulders:   9, // composite delt; dominance framing
  biceps:      8, // #4 Durkee (30% of women ranked #1)
  glutes:      8, // #2 Durkee
  mid_back:    7, // horizontal pulling strength signal
  rear_delt:   7, // posture + shoulder width
  triceps:     6, // #6 Durkee; visible arm mass
  upper_back:  6, // posture
  quads:       4, // #9 Durkee
  hamstrings:  3,
  calves:      3, // #7 Durkee; less visible
  neck:        2, // traps = #14 (last) in Durkee
};

// Sets/week floor — below this, proportion penalty applies (chicken legs problem)
export const MUSCLE_MIN_WEEKLY_SETS: Partial<Record<MuscleGroup, number>> = {
  quads:      6,
  hamstrings: 4,
  glutes:     4,
  calves:     2,
};

// SMV points lost per set below the floor (penalty rate)
export const MUSCLE_PROPORTION_PENALTY: Partial<Record<MuscleGroup, number>> = {
  quads:      4,
  hamstrings: 3,
  glutes:     3,
  calves:     2,
};

export interface MuscleScoreEntry {
  sets: number;
  gross: number;
  penalty: number;
  net: number;
}

export interface RoutineScoreResult {
  total: number;
  gross: number;
  penalty: number;
  breakdown: Partial<Record<MuscleGroup, MuscleScoreEntry>>;
}

export function scoreWeeklyVolume(
  setsPerMuscle: Partial<Record<MuscleGroup, number>>
): RoutineScoreResult {
  let gross = 0;
  let penalty = 0;
  const breakdown: Partial<Record<MuscleGroup, MuscleScoreEntry>> = {};

  for (const [muscle, smv] of Object.entries(MUSCLE_SMV_SCORE) as [MuscleGroup, number][]) {
    const sets = setsPerMuscle[muscle] ?? 0;
    const penaltyRate = MUSCLE_PROPORTION_PENALTY[muscle] ?? 0;
    const floor = MUSCLE_MIN_WEEKLY_SETS[muscle] ?? 0;

    const muscleGross = smv * sets;
    const deficit = Math.max(0, floor - sets);
    const musclePenalty = deficit * penaltyRate;

    gross += muscleGross;
    penalty += musclePenalty;
    breakdown[muscle] = { sets, gross: muscleGross, penalty: musclePenalty, net: muscleGross - musclePenalty };
  }

  return { total: gross - penalty, gross, penalty, breakdown };
}

export function getExerciseSMVScore(exercise: Exercise): number {
  return MUSCLE_SMV_SCORE[exercise.primaryMuscle] ?? 1;
}
