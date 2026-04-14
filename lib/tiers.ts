import { TierChain, TierMap, WorkoutType, ExerciseKey } from './types';

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

/** Returns the ordered list of chains for a given workout type. */
export function getChainsForWorkout(wt: Exclude<WorkoutType, 'rest'>): TierChain[] {
  return TIER_CHAINS.filter((c) => c.workoutType === wt);
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
