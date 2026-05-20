import { ActiveWorkoutDraft, StorageAdapter, WorkoutData, WorkoutSession, UserProfile, RoutineId, DailyLog, setEntryReps, setEntryWeight } from './types';
import { ACTIVE_WORKOUT_DRAFT_KEY, STORAGE_KEY, FIRST_SESSION_KEY, MOBILITY_DONE_KEY, USER_PROFILE_KEY, DAILY_LOGS_KEY } from './constants';
import { formatDateKey } from './workout-utils';
import { SMV_PROFILE_DEFAULTS } from './smv';
import { readJsonStorage, readStorageValue, removeStorageValue, writeJsonStorage, writeStorageValue } from './browser-storage';

export function loadWorkoutData(): WorkoutData {
  return readJsonStorage(STORAGE_KEY, {}, (value) => migrateWorkoutData(value as WorkoutData));
}

export function migrateWorkoutData(data: WorkoutData): WorkoutData {
  const migrated: WorkoutData = {};

  for (const [dateKey, session] of Object.entries(data)) {
    const nextSession: WorkoutSession = { ...session };
    for (const [key, value] of Object.entries(session)) {
      if (!Array.isArray(value)) continue;
      (nextSession as Record<string, unknown>)[key] = value.map((entry) => {
        if (typeof entry === 'number') return { reps: entry, weight: 0, rir: 2 };
        return { reps: setEntryReps(entry), weight: setEntryWeight(entry) ?? 0, rir: entry.rir ?? 2 };
      });
    }
    migrated[dateKey] = nextSession;
  }

  return migrated;
}

export function loadDailyLogs(): Record<string, DailyLog> {
  return readJsonStorage(DAILY_LOGS_KEY, {}, (value) => migrateDailyLogs(value as Record<string, DailyLog>));
}

export function migrateDailyLogs(logs: Record<string, DailyLog>): Record<string, DailyLog> {
  const migrated: Record<string, DailyLog> = {};

  for (const [dateKey, log] of Object.entries(logs)) {
    migrated[dateKey] = {
      ...log,
      dateKey: log.dateKey ?? dateKey,
      jointPainScores: log.jointPain && !log.jointPainScores
        ? { shoulder: 3, elbow: 3 }
        : log.jointPainScores,
    };
  }

  return migrated;
}

export function saveDailyLog(dateKey: string, log: DailyLog): void {
  const logs = loadDailyLogs();
  logs[dateKey] = { ...logs[dateKey], ...log, dateKey };
  writeJsonStorage(DAILY_LOGS_KEY, logs);
}

export function saveWorkoutData(data: WorkoutData): void {
  writeJsonStorage(STORAGE_KEY, data);
}

export function loadActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  return readJsonStorage(ACTIVE_WORKOUT_DRAFT_KEY, null, (value) => {
    const draft = value as ActiveWorkoutDraft;
    return draft.version === 1 ? draft : null;
  });
}

export function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): void {
  writeJsonStorage(ACTIVE_WORKOUT_DRAFT_KEY, draft);
}

export function clearActiveWorkoutDraft(): void {
  removeStorageValue(ACTIVE_WORKOUT_DRAFT_KEY);
}

export function saveSession(dateKey: string, session: WorkoutSession): void {
  const data = loadWorkoutData();
  data[dateKey] = session;
  saveWorkoutData(data);
}

export function getFirstSessionDate(): string | null {
  return readStorageValue(FIRST_SESSION_KEY);
}

export function setFirstSessionDate(dateKey: string): void {
  if (!readStorageValue(FIRST_SESSION_KEY)) {
    writeStorageValue(FIRST_SESSION_KEY, dateKey);
  }
}

// ── User Profile ──────────────────────────────────────────────────────────────

export function loadUserProfile(): UserProfile | null {
  return readJsonStorage(USER_PROFILE_KEY, null, (value) => migrateUserProfile(value as UserProfile));
}

export function migrateUserProfile(profile: UserProfile): UserProfile {
  const migrated = { ...profile };
  if (!migrated.activeRoutine) migrated.activeRoutine = 'gym';
  if (!migrated.setsPerExercise || migrated.setsPerExercise < 3) migrated.setsPerExercise = 3;
  if (!migrated.heightCm) migrated.heightCm = 172;
  if (!migrated.weightKg) migrated.weightKg = SMV_PROFILE_DEFAULTS.weightKg;
  if (!migrated.age) migrated.age = 26;
  if (!migrated.sex) migrated.sex = 'male';
  if (!migrated.bodyComposition) migrated.bodyComposition = 'skinny_fat';
  if (!migrated.shoulderCircumferenceCm) migrated.shoulderCircumferenceCm = 111.76;
  if (!migrated.chestCircumferenceCm) migrated.chestCircumferenceCm = 89.5;
  if (!migrated.waistCircumferenceCm) migrated.waistCircumferenceCm = 76.5;
  if (!migrated.hipCircumferenceCm) migrated.hipCircumferenceCm = 85;
  if (!migrated.neckCircumferenceCm) migrated.neckCircumferenceCm = 37;
  if (!migrated.quadCircumferenceCm) migrated.quadCircumferenceCm = 50;
  if (!migrated.calfCircumferenceCm) migrated.calfCircumferenceCm = 35;
  if (!migrated.forearmCircumferenceCm) migrated.forearmCircumferenceCm = 25.5;
  if (!migrated.bicepsCircumferenceCm) migrated.bicepsCircumferenceCm = 28;
  if (!migrated.targetWeightKg) migrated.targetWeightKg = 72;
  if (!migrated.trainingBackground) migrated.trainingBackground = 'Rugby 15 years; intermittent gym blocks';
  if (migrated.gymAccess === undefined) migrated.gymAccess = true;
  if (!migrated.injuryStatus) migrated.injuryStatus = 'No injuries or pain';
  if (!migrated.maxWorkoutMinutes) migrated.maxWorkoutMinutes = 105;
  if (!migrated.goal) migrated.goal = 'Maximize SMV efficient frontier as fast as recoverable';
  if (!migrated.targetDate) migrated.targetDate = SMV_PROFILE_DEFAULTS.targetDate;
  if (!migrated.proteinTargetGrams) migrated.proteinTargetGrams = SMV_PROFILE_DEFAULTS.proteinTargetGrams;
  if (!migrated.calorieSurplusTarget) migrated.calorieSurplusTarget = SMV_PROFILE_DEFAULTS.calorieSurplusTarget;
  return migrated;
}

export function setActiveRoutine(id: RoutineId): void {
  const profile = loadUserProfile() ?? getDefaultProfile();
  profile.activeRoutine = id;
  saveUserProfile(profile);
}

export function setBodyMetrics(heightCm: number, weightKg: number): void {
  const profile = loadUserProfile() ?? getDefaultProfile();
  profile.heightCm = heightCm;
  profile.weightKg = weightKg;
  saveUserProfile(profile);
}

export function setBodyProfileFallbacks(input: {
  heightCm: number;
  weightKg: number;
  waistCircumferenceCm: number;
  shoulderCircumferenceCm?: number;
  chestCircumferenceCm?: number;
  hipCircumferenceCm?: number;
  neckCircumferenceCm?: number;
  quadCircumferenceCm?: number;
  calfCircumferenceCm?: number;
  forearmCircumferenceCm?: number;
  bicepsCircumferenceCm?: number;
  targetWeightKg?: number;
}): void {
  const profile = loadUserProfile() ?? getDefaultProfile();
  profile.heightCm = input.heightCm;
  profile.weightKg = input.weightKg;
  profile.waistCircumferenceCm = input.waistCircumferenceCm;
  if (input.shoulderCircumferenceCm !== undefined) {
    profile.shoulderCircumferenceCm = input.shoulderCircumferenceCm;
  }
  if (input.chestCircumferenceCm !== undefined) {
    profile.chestCircumferenceCm = input.chestCircumferenceCm;
  }
  if (input.hipCircumferenceCm !== undefined) {
    profile.hipCircumferenceCm = input.hipCircumferenceCm;
  }
  if (input.neckCircumferenceCm !== undefined) {
    profile.neckCircumferenceCm = input.neckCircumferenceCm;
  }
  if (input.quadCircumferenceCm !== undefined) {
    profile.quadCircumferenceCm = input.quadCircumferenceCm;
  }
  if (input.calfCircumferenceCm !== undefined) {
    profile.calfCircumferenceCm = input.calfCircumferenceCm;
  }
  if (input.forearmCircumferenceCm !== undefined) {
    profile.forearmCircumferenceCm = input.forearmCircumferenceCm;
  }
  if (input.bicepsCircumferenceCm !== undefined) {
    profile.bicepsCircumferenceCm = input.bicepsCircumferenceCm;
  }
  if (input.targetWeightKg !== undefined) {
    profile.targetWeightKg = input.targetWeightKg;
  }
  saveUserProfile(profile);
}

export function setTrainingProfile(input: {
  age: number;
  sex: 'male' | 'female';
  bodyComposition: 'skinny_fat' | 'lean' | 'overweight' | 'muscular';
  trainingBackground: string;
  gymAccess: boolean;
  injuryStatus: string;
  maxWorkoutMinutes: number;
  goal: string;
}): void {
  const profile = loadUserProfile() ?? getDefaultProfile();
  Object.assign(profile, input);
  saveUserProfile(profile);
}

export function saveUserProfile(profile: UserProfile): void {
  writeJsonStorage(USER_PROFILE_KEY, profile);
}

/** Default profile for brand-new users — all tiers start at 0. */
export function getDefaultProfile(): UserProfile {
  return {
    activeRoutine: 'gym',
    tiers: {},
    tierProgress: {},
    createdAt: new Date().toISOString(),
    setsPerExercise: 3,
    heightCm: 172,
    weightKg: SMV_PROFILE_DEFAULTS.weightKg,
    age: 26,
    sex: 'male',
    bodyComposition: 'skinny_fat',
    shoulderCircumferenceCm: 111.76,
    chestCircumferenceCm: 89.5,
    waistCircumferenceCm: 76.5,
    hipCircumferenceCm: 85,
    neckCircumferenceCm: 37,
    quadCircumferenceCm: 50,
    calfCircumferenceCm: 35,
    forearmCircumferenceCm: 25.5,
    bicepsCircumferenceCm: 28,
    targetWeightKg: 72,
    trainingBackground: 'Rugby 15 years; intermittent gym blocks',
    gymAccess: true,
    injuryStatus: 'No injuries or pain',
    maxWorkoutMinutes: 105,
    goal: 'Maximize SMV efficient frontier as fast as recoverable',
    targetDate: SMV_PROFILE_DEFAULTS.targetDate,
    proteinTargetGrams: SMV_PROFILE_DEFAULTS.proteinTargetGrams,
    calorieSurplusTarget: SMV_PROFILE_DEFAULTS.calorieSurplusTarget,
  };
}

export const pwaStorage: StorageAdapter = {
  loadWorkoutData: async () => loadWorkoutData(),
  saveSession: async (dateKey, session) => saveSession(dateKey, session),
  loadDailyLogs: async () => loadDailyLogs(),
  saveDailyLog: async (dateKey, log) => saveDailyLog(dateKey, log),
  getFirstSessionDate: async () => getFirstSessionDate(),
  setFirstSessionDate: async (dateKey) => setFirstSessionDate(dateKey),
  getMobilityDone: async (dateKey) => readStorageValue(MOBILITY_DONE_KEY) === dateKey,
  setMobilityDone: async () => {
    writeStorageValue(MOBILITY_DONE_KEY, formatDateKey(new Date()));
  },
};
