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
  | 'smith_incline_press'
  | 'barbell_bench_press'
  | 'db_incline_press'
  | 'high_incline_machine_press'
  | 'machine_shoulder_press'
  | 'db_shoulder_press'
  | 'barbell_ohp'
  | 'db_lateral_raise'
  | 'machine_lateral_raise'
  | 'cable_lateral_raise'
  | 'db_shrug'
  | 'cable_tricep_pushdown'
  | 'overhead_tricep_ext'
  | 'cable_fly'
  | 'pec_deck';

// Gym pull exercises
export type GymPullExerciseKey =
  | 'lat_pulldown'
  | 'neutral_grip_pulldown'
  | 'pullup'
  | 'cable_row'
  | 'one_arm_cable_lat_row'
  | 'chest_supported_row'
  | 'machine_row'
  | 'braced_cable_row'
  | 'barbell_row'
  | 'cable_face_pull'
  | 'cable_rear_delt_fly'
  | 'reverse_pec_deck'
  | 'db_curl'
  | 'db_incline_curl'
  | 'preacher_curl'
  | 'barbell_curl'
  | 'straight_arm_pulldown_cable'
  | 'cable_curl'
  | 'hammer_curl';

// Gym legs exercises
export type GymLegsExerciseKey =
  | 'goblet_squat'
  | 'barbell_squat'
  | 'smith_squat'
  | 'hack_squat'
  | 'leg_press'
  | 'front_squat'
  | 'romanian_deadlift'
  | 'barbell_deadlift'
  | 'sumo_deadlift'
  | 'leg_curl_machine'
  | 'leg_extension_machine'
  | 'standing_calf_raise_machine'
  | 'cable_glute_kickback'
  | 'hip_abduction_machine';

export type RoutineId = string;

export interface RoutineConfig {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name shown in the profile picker */
  icon: 'dumbbell' | 'person-standing';
  /** Mon-Sat workout types (index 0 = Monday). Sunday is always rest. */
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

export type SMVWorkoutType =
  | 'push_a'
  | 'pull_a'
  | 'legs_maintenance'
  | 'push_b'
  | 'pull_b'
  | 'delts_arms';

export type WorkoutType = SMVWorkoutType | 'push' | 'pull' | 'legs' | 'rest';

export type SetEntry = number | { reps: number; weight: number; rir?: number };

export function setEntryReps(e: SetEntry): number {
  return typeof e === 'number' ? e : e.reps;
}

export function setEntryWeight(e: SetEntry): number | null {
  return typeof e === 'number' ? null : e.weight;
}

export function setEntryRir(e: SetEntry): number | null {
  return typeof e === 'number' ? null : e.rir ?? null;
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

export interface SMVExercisePrescription {
  exerciseKey: ExerciseKey;
  sets: number;
  minReps: number;
  maxReps: number;
  targetRir: string;
  targetRirMin: number;
  targetRirMax: number;
  finalSetRir?: string;
  restSeconds: number;
  restLabel: string;
  cue: string;
}

export interface SMVSetLog {
  exerciseKey: ExerciseKey;
  setIndex: number;
  reps: number;
  weight: number;
  rir: number;
  loggedAt: string;
}

export interface BodyTrendLog {
  dateKey: string;
  morningWeightKg?: number;
  waistCm?: number;
  calories?: number;
  proteinGrams?: number;
}

export interface RecoverySignal {
  dateKey: string;
  sleepHours?: number;
  fatigue?: 1 | 2 | 3 | 4 | 5;
  jointPain?: boolean;
  muscleSoreness?: Partial<Record<MuscleGroup, number>>;
  jointPainScores?: Partial<Record<JointArea, number>>;
  note?: string;
}

export interface DailyLog extends BodyTrendLog, RecoverySignal {}

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

export interface ActiveWorkoutDraft {
  version: 1;
  dateKey: string;
  state: Exclude<WorkoutState, 'idle' | 'complete'>;
  exerciseIndex: number;
  currentSet: number;
  sessionReps: Record<string, SetEntry[]>;
  startedAt: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  savedAt: string;
  timer: number;
  timerEndAt: number | null;
  timerPaused: boolean;
  nextExerciseName: string;
  unavailableEquipment: string[];
  selectedSubstitutions?: Record<number, ExerciseKey>;
  skippedChainIndices: number[];
  requeuedExercises: { exerciseKey: ExerciseKey; setCount: number; chainIndex?: number }[];
}

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
  loadDailyLogs(): Promise<Record<string, DailyLog>>;
  saveDailyLog(dateKey: string, log: DailyLog): Promise<void>;
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

export type JointArea = 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle' | 'spine';

export type AdaptationPriority =
  | 'lateral_delts'
  | 'upper_chest_chest'
  | 'lats'
  | 'rear_delts_posture'
  | 'biceps'
  | 'triceps'
  | 'neck_traps_forearms'
  | 'waist_reduction'
  | 'legs_maintenance';

export interface MusclePriorityProfile {
  muscle: MuscleGroup;
  priority: AdaptationPriority;
  rank: number;
  label: string;
  targetWeeklySets: number;
  minimumWeeklySets: number;
  smvContribution: number;
  recoveryHalfLifeHours: number;
  maintenanceOnly?: boolean;
}

export interface ExerciseAdaptationMetadata {
  exerciseKey: ExerciseKey;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: Partial<Record<MuscleGroup, number>>;
  indirectVolume: Partial<Record<MuscleGroup, number>>;
  axialFatigue: number;
  systemicFatigue: number;
  localDamage: number;
  stabilityDemand: number;
  progressionReliability: number;
  stretchBias: number;
  shortenedBias: number;
  clothedSmvContribution: number;
  jointStress: Partial<Record<JointArea, number>>;
}

export interface MuscleRecoveryProfile {
  muscle: MuscleGroup;
  recoveryState: number;
  fatigueLoad: number;
  soreness: number;
  halfLifeHours: number;
}

export interface RecoveryState {
  systemic: number;
  muscles: Partial<Record<MuscleGroup, MuscleRecoveryProfile>>;
  bottleneck: MuscleRecoveryProfile | null;
  generatedAt: string;
}

export interface FatigueState {
  localMuscleFatigue: Partial<Record<MuscleGroup, number>>;
  connectiveTissueFatigue: Partial<Record<JointArea, number>>;
  axialFatigue: number;
  systemicFatigue: number;
  jointRisk: number;
  bottlenecks: string[];
}

export type ProgressionTrend =
  | 'productive_progress'
  | 'build_reps'
  | 'improving'
  | 'flat'
  | 'fatigue_masked'
  | 'junk_volume'
  | 'undertraining'
  | 'recovery_bottleneck'
  | 'insufficient_data';

export interface ProgressionQuality {
  trend: ProgressionTrend;
  velocity: number;
  confidence: number;
  exerciseKey?: ExerciseKey;
  muscle?: MuscleGroup;
  reasons: string[];
}

export type AdaptiveRecommendationAction =
  | 'add_volume'
  | 'reduce_volume'
  | 'swap_exercise'
  | 'hold_progression'
  | 'change_frequency'
  | 'deload';

export interface AdaptiveRecommendation {
  action: AdaptiveRecommendationAction;
  muscle?: MuscleGroup;
  exerciseKey?: ExerciseKey;
  title: string;
  summary: string;
  reason: string;
  stimulusGain: number;
  fatigueCost: number;
  recoveryState: number;
  blockedConstraints: string[];
  confidence: number;
}

export interface EffectiveVolumeEntry {
  muscle: MuscleGroup;
  sets: number;
  target: number;
  minimum: number;
  priorityRank: number;
  status: 'low' | 'productive' | 'high' | 'maintenance';
}

export interface OptimizationContext {
  mode: 'recommend-first';
  objective: 'smv_velocity_per_recoverable_fatigue';
  recovery: RecoveryState;
  fatigue: FatigueState;
  progression: ProgressionQuality[];
  effectiveVolume: EffectiveVolumeEntry[];
  recommendations: AdaptiveRecommendation[];
  objectiveScore: number;
  targetDateGuardrail: {
    targetDate: string | null;
    daysRemaining: number | null;
    warning: string | null;
  };
}

// A tier chain defines a progression of exercises for one workout slot
export type WorkoutCadence = 'first' | 'second';

export interface TierChain {
  slotId: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  fixed: boolean; // fixed = reps-only, no tier to advance
  priority: TrainingPriority;
  /** Overrides the profile default for frontier-biased routine slots. */
  sets?: number;
  /** Limits a slot to the first or second occurrence of that workout type in the weekly split. */
  cadence?: WorkoutCadence;
  /** Active exercise selected by the deterministic optimizer for this slot. */
  selectedExercise?: ExerciseKey;
  /** Ordered progression path; tiers advance through this list when the optimizer allows it. */
  progression?: ExerciseKey[];
  /** Same-slot substitutes used for equipment/workflow fallbacks, not hidden routine choices. */
  alternatives?: ExerciseKey[];
  prescription?: Omit<SMVExercisePrescription, 'exerciseKey'>;
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
  setsPerExercise?: number;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  sex?: 'male' | 'female';
  bodyComposition?: 'skinny_fat' | 'lean' | 'overweight' | 'muscular';
  trainingBackground?: string;
  gymAccess?: boolean;
  injuryStatus?: string;
  maxWorkoutMinutes?: number;
  goal?: string;
  targetDate?: string;
  proteinTargetGrams?: [number, number];
  calorieSurplusTarget?: [number, number];
  availableEquipment?: string[];
}
