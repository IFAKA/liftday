// Push exercises
export type PushExerciseKey =
  | 'trx_t_raise'
  | 'pike_pushup'
  | 'trx_y_raise'
  | 'trx_pushup'
  | 'incline_pushup'
  | 'decline_pike_pushup';

// Pull exercises
export type PullExerciseKey =
  | 'trx_kneeling_lat_pulldown'
  | 'trx_straight_arm_pulldown'
  | 'trx_row'
  | 'trx_row_steep'
  | 'face_pull';

// Legs exercises
export type LegsExerciseKey =
  | 'bulgarian_split_squat'
  | 'pistol_squat_progression'
  | 'trx_hamstring_curl'
  | 'calf_raise'
  | 'trx_assisted_squat'
  | 'glute_bridge';

export type ExerciseKey = PushExerciseKey | PullExerciseKey | LegsExerciseKey;

export type WorkoutType = 'push' | 'pull' | 'legs' | 'rest';

export interface Exercise {
  key: ExerciseKey;
  name: string;
  unit: 'reps' | 'seconds';
  instruction: string;
  youtubeId?: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
}

export type WorkoutSession = {
  [K in ExerciseKey]?: number[];
} & {
  logged_at: string;
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

export interface MicroBreakExercise {
  name: string;
  duration: number;
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

// V-Taper priority levels — determines how fast a slot advances tiers
export type VTaperPriority = 'critical' | 'high' | 'support' | 'indirect' | 'aesthetic';

// A tier chain defines a progression of exercises for one workout slot
export interface TierChain {
  slotId: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  fixed: boolean; // fixed = reps-only, no tier to advance
  priority: VTaperPriority;
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
  tiers: TierMap;
  tierProgress: { [slotId: string]: TierProgress };
  createdAt: string;
}
