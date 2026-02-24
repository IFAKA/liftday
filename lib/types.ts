// Push exercises
export type PushExerciseKey =
  | 'trx_pushup'
  | 'pike_pushup'
  | 'tricep_extension'
  | 'regular_pushup';

// Pull exercises
export type PullExerciseKey =
  | 'trx_row'
  | 'face_pull'
  | 'bicep_curl'
  | 'inverted_row';

// Legs exercises
export type LegsExerciseKey =
  | 'bulgarian_split_squat'
  | 'pistol_squat_progression'
  | 'trx_hamstring_curl'
  | 'calf_raise';

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
