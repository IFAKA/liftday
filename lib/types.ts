// Push exercises
export type PushExerciseKey =
  | 'incline_pushup'
  | 'trx_pushup'
  | 'pushup'
  | 'pushup_feet_elevated'
  | 'pike_pushup'
  | 'decline_pike_pushup'
  | 'bench_dip'
  | 'dip'
  | 'trx_y_raise'
  | 'trx_upright_row'
  | 'trx_shrug';

// Pull exercises
export type PullExerciseKey =
  | 'negative_pullup'
  | 'trx_kneeling_lat_pulldown'
  | 'trx_straight_arm_pulldown'
  | 'trx_row'
  | 'trx_row_steep'
  | 'face_pull'
  | 'trx_t_raise'
  | 'trx_curl_assisted'
  | 'trx_curl'
  | 'trx_reverse_curl'
  | 'trx_reverse_curl_assisted';

// Legs exercises
export type LegsExerciseKey =
  | 'bulgarian_split_squat'
  | 'pistol_squat_progression'
  | 'trx_hamstring_curl'
  | 'hip_thrust'
  | 'nordic_curl'
  | 'calf_raise'
  | 'trx_assisted_squat'
  | 'glute_bridge'
  | 'neck_iso_flex'
  | 'neck_iso_ext';

// Gym push exercises
export type GymPushExerciseKey =
  | 'barbell_bench_press'
  | 'db_incline_press'
  | 'db_shoulder_press'
  | 'barbell_ohp'
  | 'db_lateral_raise'
  | 'cable_tricep_pushdown'
  | 'overhead_tricep_ext'
  | 'cable_fly';

// Gym pull exercises
export type GymPullExerciseKey =
  | 'lat_pulldown'
  | 'pullup'
  | 'cable_row'
  | 'barbell_row'
  | 'cable_face_pull'
  | 'db_curl'
  | 'barbell_curl'
  | 'straight_arm_pulldown_cable'
  | 'cable_curl'
  | 'hammer_curl';

// Gym legs exercises
export type GymLegsExerciseKey =
  | 'goblet_squat'
  | 'barbell_squat'
  | 'leg_press'
  | 'front_squat'
  | 'romanian_deadlift'
  | 'barbell_deadlift'
  | 'sumo_deadlift'
  | 'leg_curl_machine'
  | 'leg_extension_machine'
  | 'standing_calf_raise_machine';

export type RoutineId = string;

export interface RoutineConfig {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name shown in the profile picker */
  icon: 'dumbbell' | 'person-standing';
  /** Mon–Sat workout types (index 0 = Monday). Sunday is always rest. */
  schedule: Exclude<WorkoutType, 'rest'>[];
  tierChains: TierChain[];
}

export type ExerciseKey =
  | PushExerciseKey
  | PullExerciseKey
  | LegsExerciseKey
  | GymPushExerciseKey
  | GymPullExerciseKey
  | GymLegsExerciseKey;

export type WorkoutType = 'push' | 'pull' | 'legs' | 'rest';

export type SetEntry = number | { reps: number; weight: number };

export function setEntryReps(e: SetEntry): number {
  return typeof e === 'number' ? e : e.reps;
}

export function setEntryWeight(e: SetEntry): number | null {
  return typeof e === 'number' ? null : e.weight;
}

export interface Exercise {
  key: ExerciseKey;
  name: string;
  unit: 'reps' | 'seconds' | 'weighted';
  instruction: string;
  youtubeId?: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  primaryMuscle: MuscleGroup;
}

export type WorkoutSession = {
  [K in ExerciseKey]?: SetEntry[];
} & {
  logged_at: string;
  started_at?: string;
  week_number: number;
  workout_type: Exclude<WorkoutType, 'rest'>;
};

export interface WorkoutData {
  [dateKey: string]: WorkoutSession;
}

export interface ComparisonResult {
  status: 'improved' | 'decreased' | 'same' | 'none';
  previousValue: number | null;
}

export interface WeeklyStats {
  sessionsCompleted: number;
  totalSets: number;
  vsLastWeek: number | null;
}

export type WorkoutState = 'idle' | 'exercising' | 'resting' | 'transitioning' | 'complete';

export interface MobilityExercise {
  name: string;
  duration: number;
  sides?: boolean;
  instruction: string;
  youtubeId?: string;
}

export interface StorageAdapter {
  loadWorkoutData(): Promise<WorkoutData>;
  saveSession(dateKey: string, session: WorkoutSession): Promise<void>;
  getFirstSessionDate(): Promise<string | null>;
  setFirstSessionDate(dateKey: string): Promise<void>;
  getMobilityDone(dateKey: string): Promise<boolean>;
  setMobilityDone(dateKey: string): Promise<void>;
  clearAll?(): Promise<void>;
}

// Training priority levels — determines how fast a slot advances tiers
export type TrainingPriority = 'critical' | 'high' | 'support' | 'indirect' | 'aesthetic';

export type MuscleGroup =
  | 'chest' | 'shoulders' | 'side_delt' | 'triceps'
  | 'lats' | 'mid_back' | 'rear_delt' | 'biceps' | 'upper_back'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'neck';

// A tier chain defines a progression of exercises for one workout slot
export interface TierChain {
  slotId: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  fixed: boolean; // fixed = reps-only, no tier to advance
  priority: TrainingPriority;
  exercises: ExerciseKey[]; // tier 0 → 1 → 2
}

// Map of slotId → current tier index
export type TierMap = { [slotId: string]: number };

// Tracks per-slot consecutive-session progress toward advancement/regression
export interface TierProgress {
  slotId: string;
  consecutiveMaxSessions: number;
  consecutiveMinSessions: number;
}

// Full user profile persisted in localStorage
export interface UserProfile {
  activeRoutine?: RoutineId;
  tiers: TierMap;
  tierProgress: { [slotId: string]: TierProgress };
  createdAt: string;
}
