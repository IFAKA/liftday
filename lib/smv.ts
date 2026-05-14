// Research basis:
// - Sell et al. 2017 (Royal Society B): perceived upper body strength = 61-73% of attractiveness variance
// - Durkee et al. 2019 (N=1742 women): ranked 14 muscle groups by preference
// - 2025 cross-cultural study (China/Lithuania/UK): body fat 13-14% = optimal; dominates shape ratios
import type { Exercise, MuscleGroup, RoutineConfig, SMVExercisePrescription, SetEntry, TierChain, UserProfile } from './types';
import type { ExerciseKey } from './types';
import { getChainSetCount } from './routine-plan';
import { getSubstitutionPath, resolveExerciseKey } from './tiers';
import { getRequiredEquipment, type EquipmentKey, canPerformExercise } from './equipment';

export const MUSCLE_SMV_SCORE: Record<MuscleGroup, number> = {
  side_delt:  10, // V-taper width; primary shoulder width signal
  lats:        9, // V-taper depth; massive strength signal (Sell 2017)
  chest:       9, // Upper torso thickness, with upper chest weighted by exercise choice
  shoulders:   9, // composite delt; dominance framing
  biceps:      8, // #4 Durkee (30% of women ranked #1)
  glutes:      3, // maintained, not maximized, for the clothed-SMV objective
  mid_back:    7, // horizontal pulling strength signal
  rear_delt:   7, // posture + shoulder width
  triceps:     7, // sleeve fill, including indirect pressing volume
  upper_back:  6, // posture
  quads:       3, // maintenance only; high systemic fatigue cost
  hamstrings:  3,
  calves:      3, // #7 Durkee; less visible
  neck:        4, // traps/neck presentation with conservative loading
};

// Sets/week floor — below this, proportion penalty applies (chicken legs problem)
export const MUSCLE_MIN_WEEKLY_SETS: Partial<Record<MuscleGroup, number>> = {
  quads:      3,
  hamstrings: 2,
  glutes:     2,
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
  side_delt:  16,
  lats:       16,
  chest:      15,
  shoulders:   6,
  biceps:     11,
  glutes:      4,
  mid_back:    6,
  rear_delt:  14,
  triceps:    13,
  upper_back:  6,
  quads:       7,
  hamstrings:  5,
  calves:      4,
  neck:        6,
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
  smith_incline_press: { chest: 1, triceps: 0.3, shoulders: 0.35 },
  db_incline_press: { chest: 1, shoulders: 0.35, triceps: 0.25 },
  high_incline_machine_press: { chest: 1, shoulders: 0.35, triceps: 0.25 },
  cable_fly: { chest: 1 },
  machine_shoulder_press: { shoulders: 1, triceps: 0.35, side_delt: 0.25 },
  db_shoulder_press: { shoulders: 1, triceps: 0.35, side_delt: 0.2 },
  barbell_ohp: { shoulders: 1, triceps: 0.4, side_delt: 0.25 },
  db_lateral_raise: { side_delt: 1 },
  machine_lateral_raise: { side_delt: 1 },
  cable_lateral_raise: { side_delt: 1 },
  db_shrug: { neck: 1, upper_back: 0.25 },
  cable_tricep_pushdown: { triceps: 1 },
  overhead_tricep_ext: { triceps: 1 },
  pec_deck: { chest: 1 },

  lat_pulldown: { lats: 1, biceps: 0.3, upper_back: 0.2 },
  neutral_grip_pulldown: { lats: 1, biceps: 0.3, upper_back: 0.2 },
  pullup: { lats: 1, biceps: 0.35, upper_back: 0.25 },
  cable_row: { mid_back: 1, lats: 0.4, biceps: 0.25, rear_delt: 0.2 },
  one_arm_cable_lat_row: { lats: 1, mid_back: 0.35, biceps: 0.2 },
  chest_supported_row: { mid_back: 1, lats: 0.4, biceps: 0.25, rear_delt: 0.3 },
  machine_row: { mid_back: 1, lats: 0.4, biceps: 0.25, rear_delt: 0.25 },
  braced_cable_row: { mid_back: 1, lats: 0.4, biceps: 0.25, rear_delt: 0.25 },
  barbell_row: { mid_back: 1, lats: 0.45, biceps: 0.25, rear_delt: 0.25, hamstrings: 0.15 },
  cable_face_pull: { rear_delt: 1, upper_back: 0.4 },
  cable_rear_delt_fly: { rear_delt: 1 },
  reverse_pec_deck: { rear_delt: 1 },
  straight_arm_pulldown_cable: { lats: 1 },
  db_curl: { biceps: 1 },
  db_incline_curl: { biceps: 1 },
  preacher_curl: { biceps: 1 },
  barbell_curl: { biceps: 1 },
  cable_curl: { biceps: 1 },
  hammer_curl: { biceps: 0.85 },

  goblet_squat: { quads: 1, glutes: 0.4, hamstrings: 0.15 },
  barbell_squat: { quads: 1, glutes: 0.5, hamstrings: 0.2 },
  hack_squat: { quads: 1, glutes: 0.35 },
  smith_squat: { quads: 1, glutes: 0.35 },
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

export const SMV_DIRECT_TARGETS: Partial<Record<MuscleGroup, { min: number; max: number }>> = {
  side_delt: { min: 16, max: 20 },
  rear_delt: { min: 12, max: 15 },
  chest: { min: 12, max: 15 },
  lats: { min: 12, max: 16 },
  biceps: { min: 8, max: 12 },
  triceps: { min: 8, max: 13 },
  quads: { min: 6, max: 8 },
  hamstrings: { min: 4, max: 6 },
  calves: { min: 4, max: 5 },
  neck: { min: 2, max: 7 },
};

export const SMV_PROFILE_DEFAULTS = {
  age: 26,
  sex: 'male' as const,
  heightCm: 172,
  weightKg: 66.7,
  bodyComposition: 'skinny_fat' as const,
  maxWorkoutMinutes: 105,
  targetDate: '2026-10-31',
  proteinTargetGrams: [140, 160] as [number, number],
  calorieSurplusTarget: [200, 300] as [number, number],
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

export function getExerciseContributionByKey(exerciseKey: ExerciseKey): MuscleContribution {
  return EXERCISE_MUSCLE_CONTRIBUTIONS[exerciseKey] ?? {};
}

export function getPrescriptionForChain(
  chain: { exercises: ExerciseKey[]; selectedExercise?: ExerciseKey; prescription?: Omit<SMVExercisePrescription, 'exerciseKey'> },
  exerciseKey: ExerciseKey,
  fallbackSets: number
): SMVExercisePrescription {
  const base = chain.prescription;
  return {
    exerciseKey,
    sets: base?.sets ?? fallbackSets,
    minReps: base?.minReps ?? 8,
    maxReps: base?.maxReps ?? 12,
    targetRir: base?.targetRir ?? '1-2 RIR',
    targetRirMin: base?.targetRirMin ?? 1,
    targetRirMax: base?.targetRirMax ?? 2,
    finalSetRir: base?.finalSetRir,
    restSeconds: base?.restSeconds ?? 90,
    restLabel: base?.restLabel ?? '90 sec',
    cue: base?.cue ?? 'Clean reps. Stop at target RIR.',
  };
}

export function calculateRoutineVolume(
  routine: RoutineConfig,
  profile: UserProfile | null,
  fallbackSets: number
): Partial<Record<MuscleGroup, number>> {
  const tiers = profile?.tiers ?? {};
  const totals: Partial<Record<MuscleGroup, number>> = {};

  for (const chain of routine.tierChains) {
    const key = resolveExerciseKey(chain, tiers);
    const sets = getChainSetCount(chain, fallbackSets);
    const contributions = EXERCISE_MUSCLE_CONTRIBUTIONS[key] ?? {};
    for (const [muscle, multiplier] of Object.entries(contributions) as [MuscleGroup, number][]) {
      totals[muscle] = (totals[muscle] ?? 0) + sets * multiplier;
    }
  }

  return totals;
}

export interface DoubleProgressionDecision {
  increaseLoad: boolean;
  reason: string;
}

export function evaluateDoubleProgression(
  sets: SetEntry[],
  prescription: Pick<SMVExercisePrescription, 'maxReps' | 'targetRirMin' | 'targetRirMax'>
): DoubleProgressionDecision {
  if (sets.length === 0) {
    return { increaseLoad: false, reason: 'No sets logged.' };
  }

  const allAtTop = sets.every((set) => {
    if (typeof set === 'number') return set >= prescription.maxReps;
    const rir = set.rir ?? prescription.targetRirMax;
    return set.reps >= prescription.maxReps && rir >= prescription.targetRirMin && rir <= prescription.targetRirMax;
  });

  return allAtTop
    ? { increaseLoad: true, reason: 'All sets hit top reps at target RIR.' }
    : { increaseLoad: false, reason: 'Repeat load until every set reaches the top of the range at target RIR.' };
}

export function shouldDeload(input: {
  recentScores: { score: number; rir: number }[];
  fatigueDays?: number;
  poorSleepDays?: number;
  jointPain?: boolean;
}): boolean {
  const [latest, previous, beforePrevious] = input.recentScores;
  const consecutivePerformanceDrop = Boolean(
    latest && previous && beforePrevious &&
    latest.score <= previous.score * 0.95 &&
    previous.score <= beforePrevious.score * 0.95 &&
    Math.abs(latest.rir - previous.rir) <= 1 &&
    Math.abs(previous.rir - beforePrevious.rir) <= 1
  );
  return consecutivePerformanceDrop || (input.fatigueDays ?? 0) >= 3 || (input.poorSleepDays ?? 0) >= 3 || input.jointPain === true;
}

export function getDeloadPrescription(prescription: SMVExercisePrescription): SMVExercisePrescription {
  return {
    ...prescription,
    sets: Math.max(1, Math.ceil(prescription.sets * 0.6)),
    targetRir: '3-4 RIR',
    targetRirMin: 3,
    targetRirMax: 4,
    finalSetRir: undefined,
    cue: 'Deload: keep movement, cut sets, no failure.',
  };
}

export function getNutritionAdjustment(waistTrendCmPerWeek: number, weeksAboveLimit: number): {
  calorieDelta: number;
  reason: string;
} {
  if (waistTrendCmPerWeek > 0.5 && weeksAboveLimit >= 2) {
    return { calorieDelta: -150, reason: 'Waist trend is rising faster than 0.5 cm/week for two weeks.' };
  }
  return { calorieDelta: 0, reason: 'Keep +200 to +300 kcal/day and 140-160 g protein.' };
}

export function getRankedSubstitutions(
  chain: Pick<TierChain, 'exercises' | 'alternatives' | 'progression' | 'selectedExercise'>,
  unavailableEquipment: EquipmentKey[] = [],
  limit = 3
): ExerciseKey[] {
  return getSubstitutionPath(chain)
    .filter((key) => canPerformExercise(key, unavailableEquipment))
    .sort((a, b) => getSubstitutionRank(a, chain.alternatives) - getSubstitutionRank(b, chain.alternatives))
    .slice(0, limit);
}

function getSubstitutionRank(key: ExerciseKey, alternatives: ExerciseKey[] | undefined): number {
  const index = alternatives?.indexOf(key) ?? -1;
  if (index >= 0) return index;
  const equipment = getRequiredEquipment(key);
  return equipment.includes('cable_machine') ? 10 : 20;
}
