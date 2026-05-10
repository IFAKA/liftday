import { ActiveWorkoutDraft, StorageAdapter, WorkoutData, WorkoutSession, UserProfile, RoutineId, DailyLog, setEntryReps, setEntryWeight } from './types';
import { ACTIVE_WORKOUT_DRAFT_KEY, STORAGE_KEY, FIRST_SESSION_KEY, MOBILITY_DONE_KEY, USER_PROFILE_KEY, DAILY_LOGS_KEY } from './constants';
import { formatDateKey } from './workout-utils';
import { SMV_PROFILE_DEFAULTS } from './smv';

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
    const profile = JSON.parse(raw) as UserProfile;
    if (!profile.activeRoutine) profile.activeRoutine = 'gym';
    if (!profile.setsPerExercise || profile.setsPerExercise < 3) profile.setsPerExercise = 3;
    if (!profile.heightCm) profile.heightCm = 172;
    if (!profile.weightKg) profile.weightKg = SMV_PROFILE_DEFAULTS.weightKg;
    if (!profile.age) profile.age = 26;
    if (!profile.sex) profile.sex = 'male';
    if (!profile.bodyComposition) profile.bodyComposition = 'skinny_fat';
    if (!profile.trainingBackground) profile.trainingBackground = 'Rugby 15 years; intermittent gym blocks';
    if (profile.gymAccess === undefined) profile.gymAccess = true;
    if (!profile.injuryStatus) profile.injuryStatus = 'No injuries or pain';
    if (!profile.maxWorkoutMinutes) profile.maxWorkoutMinutes = 105;
    if (!profile.goal) profile.goal = 'Maximize SMV efficient frontier as fast as recoverable';
    if (!profile.targetDate) profile.targetDate = SMV_PROFILE_DEFAULTS.targetDate;
    if (!profile.proteinTargetGrams) profile.proteinTargetGrams = SMV_PROFILE_DEFAULTS.proteinTargetGrams;
    if (!profile.calorieSurplusTarget) profile.calorieSurplusTarget = SMV_PROFILE_DEFAULTS.calorieSurplusTarget;
    return profile;
  } catch {
    return null;
  }
}

export function setActiveRoutine(id: RoutineId): void {
  const profile = loadUserProfile() ?? getDefaultProfile();
  profile.activeRoutine = id;
  saveUserProfile(profile);
}

export function setRestDuration(seconds: number): void {
  const profile = loadUserProfile() ?? getDefaultProfile();
  profile.restDuration = seconds;
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
