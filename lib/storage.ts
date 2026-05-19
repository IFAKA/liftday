import { ActiveWorkoutDraft, StorageAdapter, WorkoutData, WorkoutSession, UserProfile, RoutineId, DailyLog, setEntryReps, setEntryWeight } from './types';
import { ACTIVE_WORKOUT_DRAFT_KEY, STORAGE_KEY, FIRST_SESSION_KEY, MOBILITY_DONE_KEY, USER_PROFILE_KEY, DAILY_LOGS_KEY } from './constants';
import { formatDateKey } from './workout-utils';
import { SMV_PROFILE_DEFAULTS } from './smv';

export const TEMP_ROUTINE_CLEANUP_START_DATE = '2026-05-11';
const TEMP_ROUTINE_CLEANUP_BACKUP_PREFIX = 'liftday_temp_routine_cleanup_backup';

export interface TempRoutineCleanupResult {
  keptSessions: number;
  removedSessions: number;
  backupKey: string;
  startDate: string;
}

export function loadWorkoutData(): WorkoutData {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return migrateWorkoutData(JSON.parse(raw) as WorkoutData);
  } catch {
    return {};
  }
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
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(DAILY_LOGS_KEY);
    if (!raw) return {};
    return migrateDailyLogs(JSON.parse(raw) as Record<string, DailyLog>);
  } catch {
    return {};
  }
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
  try {
    if (typeof window === 'undefined') return;
    const logs = loadDailyLogs();
    logs[dateKey] = { ...logs[dateKey], ...log, dateKey };
    localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
  } catch {
    // localStorage full or unavailable
  }
}

export function saveWorkoutData(data: WorkoutData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ACTIVE_WORKOUT_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ActiveWorkoutDraft;
    return draft.version === 1 ? draft : null;
  } catch {
    return null;
  }
}

export function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_WORKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearActiveWorkoutDraft(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function saveSession(dateKey: string, session: WorkoutSession): void {
  const data = loadWorkoutData();
  data[dateKey] = session;
  saveWorkoutData(data);
}

export function getFirstSessionDate(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(FIRST_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setFirstSessionDate(dateKey: string): void {
  try {
    if (!localStorage.getItem(FIRST_SESSION_KEY)) {
      localStorage.setItem(FIRST_SESSION_KEY, dateKey);
    }
  } catch {
    // ignore
  }
}

// ── User Profile ──────────────────────────────────────────────────────────────

export function loadUserProfile(): UserProfile | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    return migrateUserProfile(JSON.parse(raw) as UserProfile);
  } catch {
    return null;
  }
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
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage full or unavailable
  }
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

export function cleanRoutineDataSinceLatestRoutine(startDate = TEMP_ROUTINE_CLEANUP_START_DATE): TempRoutineCleanupResult | null {
  try {
    if (typeof window === 'undefined') return null;

    const before = {
      cleanedAt: new Date().toISOString(),
      startDate,
      sessions: localStorage.getItem(STORAGE_KEY),
      firstSessionDate: localStorage.getItem(FIRST_SESSION_KEY),
      activeWorkoutDraft: localStorage.getItem(ACTIVE_WORKOUT_DRAFT_KEY),
      userProfile: localStorage.getItem(USER_PROFILE_KEY),
      dailyLogs: localStorage.getItem(DAILY_LOGS_KEY),
    };
    const backupKey = `${TEMP_ROUTINE_CLEANUP_BACKUP_PREFIX}_${before.cleanedAt}`;
    localStorage.setItem(backupKey, JSON.stringify(before));

    const currentData = loadWorkoutData();
    const nextData: WorkoutData = {};
    let keptSessions = 0;
    let removedSessions = 0;

    for (const [dateKey, session] of Object.entries(currentData)) {
      if (dateKey >= startDate) {
        nextData[dateKey] = session;
        keptSessions += 1;
      } else {
        removedSessions += 1;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    localStorage.setItem(FIRST_SESSION_KEY, startDate);
    localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);

    const profile = loadUserProfile();
    if (profile) {
      saveUserProfile({
        ...profile,
        tiers: {},
        tierProgress: {},
      });
    }

    return {
      keptSessions,
      removedSessions,
      backupKey,
      startDate,
    };
  } catch {
    return null;
  }
}


export const pwaStorage: StorageAdapter = {
  loadWorkoutData: async () => loadWorkoutData(),
  saveSession: async (dateKey, session) => saveSession(dateKey, session),
  loadDailyLogs: async () => loadDailyLogs(),
  saveDailyLog: async (dateKey, log) => saveDailyLog(dateKey, log),
  getFirstSessionDate: async () => getFirstSessionDate(),
  setFirstSessionDate: async (dateKey) => setFirstSessionDate(dateKey),
  getMobilityDone: async (dateKey) => {
    try {
      return localStorage.getItem(MOBILITY_DONE_KEY) === dateKey;
    } catch {
      return false;
    }
  },
  setMobilityDone: async () => {
    try {
      localStorage.setItem(MOBILITY_DONE_KEY, formatDateKey(new Date()));
    } catch {
      // ignore
    }
  },
};
