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

export function getExerciseSMVScore(exercise: Exercise): number {
  return MUSCLE_SMV_SCORE[exercise.primaryMuscle] ?? 1;
}
