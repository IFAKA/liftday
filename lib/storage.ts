import { StorageAdapter, WorkoutData, WorkoutSession, UserProfile } from './types';
import { STORAGE_KEY, FIRST_SESSION_KEY, MOBILITY_DONE_KEY, USER_PROFILE_KEY } from './constants';
import { formatDateKey } from './workout-utils';

export function loadWorkoutData(): WorkoutData {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as WorkoutData;
  } catch {
    return {};
  }
}

export function saveWorkoutData(data: WorkoutData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
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
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
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
    tiers: {},
    tierProgress: {},
    createdAt: new Date().toISOString(),
  };
}

/**
 * Migration profile for existing users who already have workout data.
 * They've been training at what were tier-1 exercises, so start them there.
 */
export function buildMigratedProfile(): UserProfile {
  return {
    tiers: {
      push_press: 1,            // was doing TRX Push-Up
      push_press_variation: 1,  // was doing Pike Push-Up
      pull_vertical: 1,         // was doing TRX Kneeling Lat Pulldown
      legs_squat: 1,            // was doing Bulgarian Split Squat
      legs_posterior: 1,        // was doing TRX Hamstring Curl
    },
    tierProgress: {},
    createdAt: new Date().toISOString(),
  };
}

export const pwaStorage: StorageAdapter = {
  loadWorkoutData: async () => loadWorkoutData(),
  saveSession: async (dateKey, session) => saveSession(dateKey, session),
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
