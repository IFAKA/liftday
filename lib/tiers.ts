import { TierChain, TierMap, WorkoutType, ExerciseKey, RoutineId } from './types';

export const TIER_CHAINS: TierChain[] = [
  // ── PUSH DAY ──────────────────────────────────────────────────────────────
  {
    slotId: 'push_horizontal',
    workoutType: 'push',
    fixed: false,
    priority: 'critical',
    exercises: ['incline_pushup', 'pushup', 'pushup_feet_elevated'],
  },
  {
    slotId: 'push_dip',
    workoutType: 'push',
    fixed: false,
    priority: 'high',
    exercises: ['bench_dip', 'dip'],
  },
  {
    slotId: 'push_overhead',
    workoutType: 'push',
    fixed: false,
    priority: 'high',
    exercises: ['pike_pushup', 'decline_pike_pushup'],
  },
  {
    slotId: 'push_trap_delt',
    workoutType: 'push',
    fixed: false,
    priority: 'critical',
    exercises: ['trx_shrug', 'trx_upright_row'],
  },
  {
    slotId: 'push_upper_back',
    workoutType: 'push',
    fixed: true,
    priority: 'high',
    exercises: ['trx_y_raise'],
  },

  // ── PULL DAY ──────────────────────────────────────────────────────────────
  {
    slotId: 'pull_vertical',
    workoutType: 'pull',
    fixed: true,
    priority: 'critical',
    exercises: ['negative_pullup'],
  },
  {
    slotId: 'pull_row',
    workoutType: 'pull',
    fixed: false,
    priority: 'critical',
    exercises: ['trx_row_steep', 'trx_row'],
  },
  {
    slotId: 'pull_lat',
    workoutType: 'pull',
    fixed: true,
    priority: 'high',
    exercises: ['trx_kneeling_lat_pulldown'],
  },
  {
    slotId: 'pull_rear_delt',
    workoutType: 'pull',
    fixed: true,
    priority: 'critical',
    exercises: ['face_pull'],
  },
  {
    slotId: 'pull_bicep',
    workoutType: 'pull',
    fixed: false,
    priority: 'high',
    exercises: ['trx_curl_assisted', 'trx_curl'],
  },

  // ── LEGS DAY ──────────────────────────────────────────────────────────────
  {
    slotId: 'legs_squat',
    workoutType: 'legs',
    fixed: false,
    priority: 'critical',
    exercises: ['trx_assisted_squat', 'bulgarian_split_squat', 'pistol_squat_progression'],
  },
  {
    slotId: 'legs_posterior',
    workoutType: 'legs',
    fixed: false,
    priority: 'critical',
    exercises: ['glute_bridge', 'hip_thrust', 'trx_hamstring_curl'],
  },
  {
    slotId: 'legs_hamstring',
    workoutType: 'legs',
    fixed: true,
    priority: 'high',
    exercises: ['nordic_curl'],
  },
  {
    slotId: 'legs_calf',
    workoutType: 'legs',
    fixed: true,
    priority: 'aesthetic',
    exercises: ['calf_raise'],
  },
  {
    slotId: 'legs_neck_flex',
    workoutType: 'legs',
    fixed: true,
    priority: 'high',
    exercises: ['neck_iso_flex'],
  },
  {
    slotId: 'legs_neck_ext',
    workoutType: 'legs',
    fixed: true,
    priority: 'high',
    exercises: ['neck_iso_ext'],
  },
];

export const GYM_TIER_CHAINS: TierChain[] = [
  // ── GYM PUSH ──────────────────────────────────────────────────────────────
  {
    slotId: 'gym_push_chest',
    workoutType: 'push',
    fixed: true,
    priority: 'critical',
    exercises: ['barbell_bench_press'],
  },
  {
    slotId: 'gym_push_incline',
    workoutType: 'push',
    fixed: true,
    priority: 'high',
    exercises: ['db_incline_press'],
  },
  {
    slotId: 'gym_push_overhead',
    workoutType: 'push',
    fixed: false,
    priority: 'high',
    exercises: ['db_shoulder_press', 'barbell_ohp'],
  },
  {
    slotId: 'gym_push_lateral',
    workoutType: 'push',
    fixed: true,
    priority: 'aesthetic',
    exercises: ['db_lateral_raise'],
  },
  {
    slotId: 'gym_push_tricep',
    workoutType: 'push',
    fixed: false,
    priority: 'high',
    exercises: ['cable_tricep_pushdown', 'overhead_tricep_ext'],
  },

  // ── GYM PULL ──────────────────────────────────────────────────────────────
  {
    slotId: 'gym_pull_vertical',
    workoutType: 'pull',
    fixed: false,
    priority: 'critical',
    exercises: ['lat_pulldown', 'pullup'],
  },
  {
    slotId: 'gym_pull_horizontal',
    workoutType: 'pull',
    fixed: false,
    priority: 'critical',
    exercises: ['cable_row', 'barbell_row'],
  },
  {
    slotId: 'gym_pull_rear_delt',
    workoutType: 'pull',
    fixed: true,
    priority: 'critical',
    exercises: ['cable_face_pull'],
  },
  {
    slotId: 'gym_pull_bicep',
    workoutType: 'pull',
    fixed: false,
    priority: 'high',
    exercises: ['db_curl', 'barbell_curl'],
  },
  {
    slotId: 'gym_pull_lat',
    workoutType: 'pull',
    fixed: true,
    priority: 'high',
    exercises: ['straight_arm_pulldown_cable'],
  },

  // ── GYM LEGS ──────────────────────────────────────────────────────────────
  {
    slotId: 'gym_legs_squat',
    workoutType: 'legs',
    fixed: false,
    priority: 'critical',
    exercises: ['goblet_squat', 'barbell_squat'],
  },
  {
    slotId: 'gym_legs_hinge',
    workoutType: 'legs',
    fixed: false,
    priority: 'critical',
    exercises: ['romanian_deadlift', 'barbell_deadlift'],
  },
  {
    slotId: 'gym_legs_hamstring',
    workoutType: 'legs',
    fixed: true,
    priority: 'high',
    exercises: ['leg_curl_machine'],
  },
  {
    slotId: 'gym_legs_quad',
    workoutType: 'legs',
    fixed: true,
    priority: 'high',
    exercises: ['leg_extension_machine'],
  },
  {
    slotId: 'gym_legs_calf',
    workoutType: 'legs',
    fixed: true,
    priority: 'aesthetic',
    exercises: ['standing_calf_raise_machine'],
  },
  {
    slotId: 'gym_legs_neck_flex',
    workoutType: 'legs',
    fixed: true,
    priority: 'high',
    exercises: ['neck_iso_flex'],
  },
  {
    slotId: 'gym_legs_neck_ext',
    workoutType: 'legs',
    fixed: true,
    priority: 'high',
    exercises: ['neck_iso_ext'],
  },
];

/** Returns the ordered list of chains for a given workout type and routine. */
export function getChainsForWorkout(
  wt: Exclude<WorkoutType, 'rest'>,
  routineId: RoutineId = 'calisthenics'
): TierChain[] {
  const chains = routineId === 'gym' ? GYM_TIER_CHAINS : TIER_CHAINS;
  return chains.filter((c) => c.workoutType === wt);
}

/**
 * Resolves the current exercise key for a chain given the user's tier map.
 * Clamps to valid range so the index is always safe.
 */
export function resolveExerciseKey(chain: TierChain, tiers: TierMap): ExerciseKey {
  const tier = tiers[chain.slotId] ?? 0;
  const clamped = Math.max(0, Math.min(tier, chain.exercises.length - 1));
  return chain.exercises[clamped];
}
