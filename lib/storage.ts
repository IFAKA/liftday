import { StorageAdapter, WorkoutData, WorkoutSession } from './types';
import { STORAGE_KEY, FIRST_SESSION_KEY, MOBILITY_DONE_KEY } from './constants';
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
