import { TierChain, TierMap, WorkoutType, ExerciseKey } from './types';

export const TIER_CHAINS: TierChain[] = [
  // ── PUSH DAY ──────────────────────────────────────────────────────────────
  {
    slotId: 'push_press',
    workoutType: 'push',
    fixed: false,
    priority: 'support',
    exercises: ['incline_pushup', 'trx_pushup', 'pike_pushup'],
  },
  {
    slotId: 'push_press_variation',
    workoutType: 'push',
    fixed: false,
    priority: 'support',
    exercises: ['trx_pushup', 'pike_pushup', 'decline_pike_pushup'],
  },
  {
    slotId: 'push_side_delt',
    workoutType: 'push',
    fixed: true,
    priority: 'critical',
    exercises: ['trx_t_raise'],
  },
  {
    slotId: 'push_overhead',
    workoutType: 'push',
    fixed: true,
    priority: 'high',
    exercises: ['trx_y_raise'],
  },

  // ── PULL DAY ──────────────────────────────────────────────────────────────
  {
    slotId: 'pull_vertical',
    workoutType: 'pull',
    fixed: false,
    priority: 'critical',
    exercises: ['trx_row_steep', 'trx_kneeling_lat_pulldown', 'trx_straight_arm_pulldown'],
  },
  {
    slotId: 'pull_row',
    workoutType: 'pull',
    fixed: true,
    priority: 'high',
    exercises: ['trx_row'],
  },
  {
    slotId: 'pull_rear_delt',
    workoutType: 'pull',
    fixed: true,
    priority: 'critical',
    exercises: ['face_pull'],
  },
  {
    slotId: 'pull_lat_isolation',
    workoutType: 'pull',
    fixed: true,
    priority: 'critical',
    exercises: ['trx_straight_arm_pulldown'],
  },

  // ── LEGS DAY ──────────────────────────────────────────────────────────────
  {
    slotId: 'legs_squat',
    workoutType: 'legs',
    fixed: false,
    priority: 'indirect',
    exercises: ['trx_assisted_squat', 'bulgarian_split_squat', 'pistol_squat_progression'],
  },
  {
    slotId: 'legs_squat_variation',
    workoutType: 'legs',
    fixed: true,
    priority: 'indirect',
    exercises: ['bulgarian_split_squat'],
  },
  {
    slotId: 'legs_posterior',
    workoutType: 'legs',
    fixed: false,
    priority: 'indirect',
    exercises: ['glute_bridge', 'trx_hamstring_curl'],
  },
  {
    slotId: 'legs_calf',
    workoutType: 'legs',
    fixed: true,
    priority: 'aesthetic',
    exercises: ['calf_raise'],
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
