// Research basis:
// - Sell et al. 2017 (Royal Society B): perceived upper body strength = 61-73% of attractiveness variance
// - Durkee et al. 2019 (N=1742 women): ranked 14 muscle groups by preference
// - 2025 cross-cultural study (China/Lithuania/UK): body fat 13-14% = optimal; dominates shape ratios
import type { Exercise, MuscleGroup } from './types';
import type { ExerciseKey } from './types';

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

export const MUSCLE_TARGET_WEEKLY_SETS: Record<MuscleGroup, number> = {
  side_delt:  12,
  lats:       14,
  chest:      12,
  shoulders:   8,
  biceps:      8,
  glutes:      8,
  mid_back:    8,
  rear_delt:   6,
  triceps:     8,
  upper_back:  6,
  quads:      10,
  hamstrings:  8,
  calves:      6,
  neck:        4,
};

export type MuscleContribution = Partial<Record<MuscleGroup, number>>;

export const EXERCISE_MUSCLE_CONTRIBUTIONS: Partial<Record<ExerciseKey, MuscleContribution>> = {
  incline_pushup: { chest: 1, triceps: 0.35, shoulders: 0.2 },
  trx_pushup: { chest: 1, triceps: 0.35, shoulders: 0.2 },
  pushup: { chest: 1, triceps: 0.35, shoulders: 0.2 },
  pushup_feet_elevated: { chest: 1, shoulders: 0.35, triceps: 0.3 },
  pike_pushup: { shoulders: 1, triceps: 0.35, side_delt: 0.2 },
  decline_pike_pushup: { shoulders: 1, triceps: 0.35, side_delt: 0.2 },
  bench_dip: { triceps: 1, chest: 0.45, shoulders: 0.15 },
  dip: { triceps: 1, chest: 0.55, shoulders: 0.2 },
  trx_y_raise: { upper_back: 1, rear_delt: 0.5, shoulders: 0.2 },
  trx_upright_row: { side_delt: 1, upper_back: 0.35 },
  trx_shrug: { side_delt: 0.65, upper_back: 0.45, neck: 0.25 },

  negative_pullup: { lats: 1, biceps: 0.35, upper_back: 0.25 },
  trx_kneeling_lat_pulldown: { lats: 1, biceps: 0.2 },
  trx_straight_arm_pulldown: { lats: 1 },
  trx_row_steep: { mid_back: 1, lats: 0.4, biceps: 0.25, rear_delt: 0.2 },
  trx_row: { mid_back: 1, lats: 0.4, biceps: 0.25, rear_delt: 0.2 },
  face_pull: { rear_delt: 1, upper_back: 0.4 },
  trx_t_raise: { rear_delt: 1, upper_back: 0.35 },
  trx_curl_assisted: { biceps: 1 },
  trx_curl: { biceps: 1 },
  trx_reverse_curl_assisted: { biceps: 0.8 },
  trx_reverse_curl: { biceps: 0.8 },

  trx_assisted_squat: { quads: 1, glutes: 0.35, hamstrings: 0.15 },
  bulgarian_split_squat: { quads: 1, glutes: 0.55, hamstrings: 0.2 },
  pistol_squat_progression: { quads: 1, glutes: 0.45, hamstrings: 0.15 },
  glute_bridge: { glutes: 1, hamstrings: 0.25 },
  hip_thrust: { glutes: 1, hamstrings: 0.25 },
  trx_hamstring_curl: { hamstrings: 1, glutes: 0.25 },
  nordic_curl: { hamstrings: 1 },
  calf_raise: { calves: 1 },
  neck_iso_flex: { neck: 1 },
  neck_iso_ext: { neck: 1 },

  barbell_bench_press: { chest: 1, triceps: 0.35, shoulders: 0.25 },
  db_incline_press: { chest: 1, shoulders: 0.35, triceps: 0.25 },
  cable_fly: { chest: 1 },
  db_shoulder_press: { shoulders: 1, triceps: 0.35, side_delt: 0.2 },
  barbell_ohp: { shoulders: 1, triceps: 0.4, side_delt: 0.25 },
  db_lateral_raise: { side_delt: 1 },
  cable_lateral_raise: { side_delt: 1 },
  cable_tricep_pushdown: { triceps: 1 },
  overhead_tricep_ext: { triceps: 1 },

  lat_pulldown: { lats: 1, biceps: 0.3, upper_back: 0.2 },
  pullup: { lats: 1, biceps: 0.35, upper_back: 0.25 },
  cable_row: { mid_back: 1, lats: 0.4, biceps: 0.25, rear_delt: 0.2 },
  barbell_row: { mid_back: 1, lats: 0.45, biceps: 0.25, rear_delt: 0.25, hamstrings: 0.15 },
  cable_face_pull: { rear_delt: 1, upper_back: 0.4 },
  straight_arm_pulldown_cable: { lats: 1 },
  db_curl: { biceps: 1 },
  barbell_curl: { biceps: 1 },
  cable_curl: { biceps: 1 },
  hammer_curl: { biceps: 0.85 },

  goblet_squat: { quads: 1, glutes: 0.4, hamstrings: 0.15 },
  barbell_squat: { quads: 1, glutes: 0.5, hamstrings: 0.2 },
  front_squat: { quads: 1, glutes: 0.35, upper_back: 0.25 },
  leg_press: { quads: 1, glutes: 0.35 },
  romanian_deadlift: { hamstrings: 1, glutes: 0.6 },
  barbell_deadlift: { hamstrings: 0.85, glutes: 0.65, upper_back: 0.3 },
  sumo_deadlift: { hamstrings: 0.75, glutes: 0.75, quads: 0.25 },
  leg_curl_machine: { hamstrings: 1 },
  leg_extension_machine: { quads: 1 },
  standing_calf_raise_machine: { calves: 1 },
  cable_glute_kickback: { glutes: 1 },
  hip_abduction_machine: { glutes: 0.85 },
};

export interface MuscleScoreEntry {
  sets: number;
  gross: number;
  penalty: number;
  target: number;
  overTarget: number;
  net: number;
}

export interface RoutineScoreCost {
  totalSets: number;
  setsPerExercise: number;
  equipmentChanges: number;
  longSessionSets: number;
  setCost: number;
  equipmentCost: number;
  longSessionCost: number;
  total: number;
}

export interface RoutineScoreResult {
  total: number;
  gross: number;
  penalty: number;
  cost: RoutineScoreCost;
  efficiency: number;
  breakdown: Partial<Record<MuscleGroup, MuscleScoreEntry>>;
}

export interface ScoreWeeklyVolumeOptions {
  totalSets?: number;
  setsPerExercise?: number;
  equipmentChanges?: number;
  sessionSetCounts?: number[];
}

const OVER_TARGET_VALUE_MULTIPLIER = 0.25;
const SET_COST = 0.7;
const EQUIPMENT_CHANGE_COST = 1.5;
const LONG_SESSION_SET_LIMIT = 27;
const LONG_SESSION_SET_COST = 1.25;

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function scoreMuscleSets(sets: number, smv: number, target: number): number {
  const efficientSets = Math.min(sets, target);
  const overTargetSets = Math.max(0, sets - target);
  return efficientSets * smv + overTargetSets * smv * OVER_TARGET_VALUE_MULTIPLIER;
}

function getRoutineCost(options: ScoreWeeklyVolumeOptions = {}): RoutineScoreCost {
  const totalSets = options.totalSets ?? 0;
  const setsPerExercise = options.setsPerExercise ?? 3;
  const equipmentChanges = options.equipmentChanges ?? 0;
  const longSessionSets = (options.sessionSetCounts ?? []).reduce(
    (sum, sets) => sum + Math.max(0, sets - LONG_SESSION_SET_LIMIT),
    0
  );

  const setCost = totalSets * SET_COST;
  const equipmentCost = equipmentChanges * EQUIPMENT_CHANGE_COST;
  const longSessionCost = longSessionSets * LONG_SESSION_SET_COST;
  const total = setCost + equipmentCost + longSessionCost;

  return { totalSets, setsPerExercise, equipmentChanges, longSessionSets, setCost, equipmentCost, longSessionCost, total };
}

export function scoreWeeklyVolume(
  setsPerMuscle: Partial<Record<MuscleGroup, number>>,
  options: ScoreWeeklyVolumeOptions = {}
): RoutineScoreResult {
  let gross = 0;
  let penalty = 0;
  const breakdown: Partial<Record<MuscleGroup, MuscleScoreEntry>> = {};

  for (const [muscle, smv] of Object.entries(MUSCLE_SMV_SCORE) as [MuscleGroup, number][]) {
    const sets = setsPerMuscle[muscle] ?? 0;
    const penaltyRate = MUSCLE_PROPORTION_PENALTY[muscle] ?? 0;
    const floor = MUSCLE_MIN_WEEKLY_SETS[muscle] ?? 0;
    const target = MUSCLE_TARGET_WEEKLY_SETS[muscle];

    const muscleGross = scoreMuscleSets(sets, smv, target);
    const deficit = Math.max(0, floor - sets);
    const musclePenalty = deficit * penaltyRate;
    const overTarget = Math.max(0, sets - target);

    gross += muscleGross;
    penalty += musclePenalty;
    breakdown[muscle] = {
      sets: roundOneDecimal(sets),
      gross: roundOneDecimal(muscleGross),
      penalty: roundOneDecimal(musclePenalty),
      target,
      overTarget: roundOneDecimal(overTarget),
      net: roundOneDecimal(muscleGross - musclePenalty),
    };
  }

  const cost = getRoutineCost(options);
  const total = gross - penalty - cost.total;
  const efficiency = cost.totalSets > 0 ? total / cost.totalSets : 0;

  return {
    total: roundOneDecimal(total),
    gross: roundOneDecimal(gross),
    penalty: roundOneDecimal(penalty),
    cost: {
      ...cost,
      totalSets: roundOneDecimal(cost.totalSets),
      setsPerExercise: roundOneDecimal(cost.setsPerExercise),
      setCost: roundOneDecimal(cost.setCost),
      equipmentCost: roundOneDecimal(cost.equipmentCost),
      longSessionCost: roundOneDecimal(cost.longSessionCost),
      total: roundOneDecimal(cost.total),
    },
    efficiency: roundOneDecimal(efficiency),
    breakdown,
  };
}

export function getExerciseSMVScore(exercise: Exercise): number {
  return MUSCLE_SMV_SCORE[exercise.primaryMuscle] ?? 1;
}

export function getExerciseMuscleContribution(exercise: Exercise): MuscleContribution {
  return EXERCISE_MUSCLE_CONTRIBUTIONS[exercise.key] ?? { [exercise.primaryMuscle]: 1 };
}
