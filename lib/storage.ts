import { ActiveWorkoutDraft, StorageAdapter, WorkoutData, WorkoutSession, UserProfile, RoutineId, DailyLog, PersistenceReadResult, PersistenceResult } from './types';
import { ACTIVE_WORKOUT_DRAFT_KEY, STORAGE_KEY, FIRST_SESSION_KEY, MOBILITY_DONE_KEY, USER_PROFILE_KEY, DAILY_LOGS_KEY } from './constants';
import { formatDateKey } from './workout-utils';
import { SMV_PROFILE_DEFAULTS } from './smv';
import { fail, ok, readJsonStorage, readJsonStorageResult, readStorageValue, removeStorageValue, writeJsonStorage, writeStorageValue } from './browser-storage';
import { DEFAULT_AVAILABLE_EQUIPMENT } from './equipment';

export function loadWorkoutData(): WorkoutData {
  return loadWorkoutDataResult().value;
}

export function loadWorkoutDataResult(): PersistenceReadResult<WorkoutData> {
  return readJsonStorageResult(STORAGE_KEY, {}, (value) => isWorkoutData(value) ? value : null);
}

export function loadDailyLogs(): Record<string, DailyLog> {
  return loadDailyLogsResult().value;
}

export function loadDailyLogsResult(): PersistenceReadResult<Record<string, DailyLog>> {
  return readJsonStorageResult(DAILY_LOGS_KEY, {}, (value) => isDailyLogs(value) ? value : null);
}

export function saveDailyLog(dateKey: string, log: DailyLog): PersistenceResult {
  const loaded = loadDailyLogsResult();
  if (!loaded.success) return fail(`Daily logs were not saved because existing data could not be read: ${loaded.reason}`, loaded.error);
  const logs = loaded.value;
  logs[dateKey] = { ...logs[dateKey], ...log, dateKey };
  return writeJsonStorage(DAILY_LOGS_KEY, logs);
}

export function saveWorkoutData(data: WorkoutData): PersistenceResult {
  return writeJsonStorage(STORAGE_KEY, data);
}

export function loadActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  return readJsonStorage(ACTIVE_WORKOUT_DRAFT_KEY, null, (value) => value === null || isActiveWorkoutDraft(value) ? value as ActiveWorkoutDraft | null : null);
}

export function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): PersistenceResult {
  return writeJsonStorage(ACTIVE_WORKOUT_DRAFT_KEY, draft);
}

export function clearActiveWorkoutDraft(): PersistenceResult {
  return removeStorageValue(ACTIVE_WORKOUT_DRAFT_KEY);
}

export function saveSession(dateKey: string, session: WorkoutSession): PersistenceResult {
  const loaded = loadWorkoutDataResult();
  if (!loaded.success) return fail(`Workout was not saved because existing workout data could not be read: ${loaded.reason}`, loaded.error);
  const data = loaded.value;
  data[dateKey] = session;
  return saveWorkoutData(data);
}

export function getFirstSessionDate(): string | null {
  return readStorageValue(FIRST_SESSION_KEY);
}

export function setFirstSessionDate(dateKey: string): PersistenceResult {
  if (!readStorageValue(FIRST_SESSION_KEY)) {
    return writeStorageValue(FIRST_SESSION_KEY, dateKey);
  }
  return ok();
}

// ── User Profile ──────────────────────────────────────────────────────────────

export function loadUserProfile(): UserProfile | null {
  return readJsonStorage(USER_PROFILE_KEY, getDefaultProfile(), (value) => isUserProfile(value) ? value : null);
}

export function setActiveRoutine(id: RoutineId): PersistenceResult {
  const profile = loadUserProfile() ?? getDefaultProfile();
  profile.activeRoutine = id;
  return saveUserProfile(profile);
}

export function setBodyMetrics(heightCm: number, weightKg: number): PersistenceResult {
  const profile = loadUserProfile() ?? getDefaultProfile();
  profile.heightCm = heightCm;
  profile.weightKg = weightKg;
  return saveUserProfile(profile);
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
  wristCircumferenceCm?: number;
  ankleCircumferenceCm?: number;
  bicepsCircumferenceCm?: number;
  targetWeightKg?: number;
}): PersistenceResult {
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
  if (input.wristCircumferenceCm !== undefined) {
    profile.wristCircumferenceCm = input.wristCircumferenceCm;
  }
  if (input.ankleCircumferenceCm !== undefined) {
    profile.ankleCircumferenceCm = input.ankleCircumferenceCm;
  }
  if (input.bicepsCircumferenceCm !== undefined) {
    profile.bicepsCircumferenceCm = input.bicepsCircumferenceCm;
  }
  if (input.targetWeightKg !== undefined) {
    profile.targetWeightKg = input.targetWeightKg;
  }
  return saveUserProfile(profile);
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
}): PersistenceResult {
  const profile = loadUserProfile() ?? getDefaultProfile();
  Object.assign(profile, input);
  return saveUserProfile(profile);
}

export function saveUserProfile(profile: UserProfile): PersistenceResult {
  return writeJsonStorage(USER_PROFILE_KEY, profile);
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
    shoulderCircumferenceCm: 113,
    chestCircumferenceCm: 91.5,
    waistCircumferenceCm: 74.5,
    hipCircumferenceCm: 86,
    neckCircumferenceCm: 37,
    quadCircumferenceCm: 50,
    calfCircumferenceCm: 35,
    forearmCircumferenceCm: 26,
    wristCircumferenceCm: 16.5,
    ankleCircumferenceCm: 22.5,
    bicepsCircumferenceCm: 28,
    targetWeightKg: 72,
    trainingBackground: 'Rugby 15 years; intermittent gym blocks',
    gymAccess: true,
    injuryStatus: 'No injuries or pain',
    maxWorkoutMinutes: 105,
    goal: 'Build a balanced, recoverable hypertrophy routine',
    targetDate: SMV_PROFILE_DEFAULTS.targetDate,
    proteinTargetGrams: SMV_PROFILE_DEFAULTS.proteinTargetGrams,
    calorieSurplusTarget: SMV_PROFILE_DEFAULTS.calorieSurplusTarget,
    availableEquipment: DEFAULT_AVAILABLE_EQUIPMENT,
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
    return writeStorageValue(MOBILITY_DONE_KEY, formatDateKey(new Date()));
  },
};

export function clearLiftDayStorage(): PersistenceResult {
  try {
    if (typeof window === 'undefined') return { success: true };
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith('liftday_')) window.localStorage.removeItem(key);
    }
    return { success: true };
  } catch (error) {
    return fail('Could not reset LiftDay local data.', error);
  }
}

function isWorkoutData(value: unknown): value is WorkoutData {
  return isRecord(value) && Object.values(value).every((session) => isRecord(session) && typeof session.logged_at === 'string' && typeof session.week_number === 'number' && typeof session.workout_type === 'string');
}

function isDailyLogs(value: unknown): value is Record<string, DailyLog> {
  return isRecord(value) && Object.entries(value).every(([dateKey, log]) => isRecord(log) && log.dateKey === dateKey);
}

function isUserProfile(value: unknown): value is UserProfile {
  return isRecord(value) && typeof value.activeRoutine === 'string' && isRecord(value.tiers) && isRecord(value.tierProgress) && typeof value.createdAt === 'string';
}

function isActiveWorkoutDraft(value: unknown): value is ActiveWorkoutDraft {
  return isRecord(value) && typeof value.dateKey === 'string' && typeof value.phase === 'string' && typeof value.state === 'string' && typeof value.exerciseIndex === 'number' && typeof value.currentSet === 'number' && isRecord(value.sessionReps) && typeof value.startedAt === 'string' && typeof value.workoutType === 'string' && typeof value.savedAt === 'string' && typeof value.timer === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
