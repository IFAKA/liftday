import {
  FIRST_SESSION_KEY,
  MOBILITY_DONE_KEY,
  STORAGE_KEY,
  USER_PROFILE_KEY,
} from './constants';
import { UserProfile, WorkoutData, WorkoutSession } from './types';

const SYNC_SCHEMA_VERSION = 1;
const BACKUP_PREFIX = 'liftday_sync_backup_';
const LAST_IMPORT_KEY = 'liftday_sync_last_import';

export interface SyncSnapshot {
  app: 'liftday';
  schemaVersion: 1;
  exportedAt: string;
  source: 'phone' | 'laptop' | 'unknown';
  data: WorkoutData;
  profile: UserProfile | null;
  firstSessionDate: string | null;
  mobilityDoneDate: string | null;
}

export interface ImportResult {
  importedSessions: number;
  addedSessions: number;
  updatedSessions: number;
  keptSessions: number;
  backupKey: string;
  exportedAt: string;
}

type UnknownRecord = Record<string, unknown>;

export function createSyncSnapshot(source: SyncSnapshot['source'] = 'unknown'): SyncSnapshot {
  return {
    app: 'liftday',
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    source,
    data: readWorkoutData(),
    profile: readProfile(),
    firstSessionDate: readString(FIRST_SESSION_KEY),
    mobilityDoneDate: readString(MOBILITY_DONE_KEY),
  };
}

export function serializeSyncSnapshot(snapshot: SyncSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseSyncSnapshot(raw: string): SyncSnapshot {
  const parsed = JSON.parse(raw) as unknown;
  if (!isSyncSnapshot(parsed)) {
    throw new Error('This is not a valid LiftDay sync file.');
  }
  return parsed;
}

export function validateSyncSnapshot(value: unknown): SyncSnapshot | null {
  return isSyncSnapshot(value) ? value : null;
}

export function importPhoneSnapshot(snapshot: SyncSnapshot): ImportResult {
  if (typeof window === 'undefined') {
    throw new Error('Sync import only works in the browser.');
  }

  const current = createSyncSnapshot('laptop');
  const backupKey = `${BACKUP_PREFIX}${new Date().toISOString()}`;
  localStorage.setItem(backupKey, serializeSyncSnapshot(current));

  const currentData = current.data;
  const mergedData: WorkoutData = { ...currentData };
  let addedSessions = 0;
  let updatedSessions = 0;
  let keptSessions = 0;

  for (const [dateKey, incomingSession] of Object.entries(snapshot.data)) {
    const existingSession = currentData[dateKey];
    if (!existingSession) {
      addedSessions += 1;
      mergedData[dateKey] = incomingSession;
      continue;
    }

    if (JSON.stringify(existingSession) === JSON.stringify(incomingSession)) {
      keptSessions += 1;
      continue;
    }

    updatedSessions += 1;
    mergedData[dateKey] = newerSession(existingSession, incomingSession);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));

  if (snapshot.profile) {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(snapshot.profile));
  }

  const firstSessionDate = earliestDate(current.firstSessionDate, snapshot.firstSessionDate);
  if (firstSessionDate) {
    localStorage.setItem(FIRST_SESSION_KEY, firstSessionDate);
  }

  if (snapshot.mobilityDoneDate) {
    localStorage.setItem(MOBILITY_DONE_KEY, snapshot.mobilityDoneDate);
  }

  localStorage.setItem(LAST_IMPORT_KEY, JSON.stringify({
    importedAt: new Date().toISOString(),
    exportedAt: snapshot.exportedAt,
    source: snapshot.source,
    sessions: Object.keys(snapshot.data).length,
    backupKey,
  }));

  return {
    importedSessions: Object.keys(snapshot.data).length,
    addedSessions,
    updatedSessions,
    keptSessions,
    backupKey,
    exportedAt: snapshot.exportedAt,
  };
}

export function getLocalSyncSummary() {
  const data = readWorkoutData();
  const dates = Object.keys(data).sort();
  return {
    sessionCount: dates.length,
    firstSessionDate: readString(FIRST_SESSION_KEY) ?? dates[0] ?? null,
    latestSessionDate: dates.at(-1) ?? null,
    lastImport: readString(LAST_IMPORT_KEY),
  };
}

function readWorkoutData(): WorkoutData {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return isWorkoutData(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readProfile(): UserProfile | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isUserProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readString(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function newerSession(current: WorkoutSession, incoming: WorkoutSession): WorkoutSession {
  const currentTime = Date.parse(current.logged_at);
  const incomingTime = Date.parse(incoming.logged_at);
  if (Number.isNaN(currentTime)) return incoming;
  if (Number.isNaN(incomingTime)) return current;
  return incomingTime >= currentTime ? incoming : current;
}

function earliestDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function isSyncSnapshot(value: unknown): value is SyncSnapshot {
  if (!isRecord(value)) return false;
  return (
    value.app === 'liftday' &&
    value.schemaVersion === SYNC_SCHEMA_VERSION &&
    typeof value.exportedAt === 'string' &&
    (value.source === 'phone' || value.source === 'laptop' || value.source === 'unknown') &&
    isWorkoutData(value.data) &&
    (value.profile === null || isUserProfile(value.profile)) &&
    (value.firstSessionDate === null || typeof value.firstSessionDate === 'string') &&
    (value.mobilityDoneDate === null || typeof value.mobilityDoneDate === 'string')
  );
}

function isWorkoutData(value: unknown): value is WorkoutData {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isWorkoutSession);
}

function isWorkoutSession(value: unknown): value is WorkoutSession {
  if (!isRecord(value)) return false;
  return (
    typeof value.logged_at === 'string' &&
    typeof value.week_number === 'number' &&
    ['push', 'pull', 'legs', 'push_a', 'pull_a', 'legs_maintenance', 'push_b', 'pull_b', 'delts_arms'].includes(value.workout_type as string)
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.tiers) &&
    isRecord(value.tierProgress) &&
    typeof value.createdAt === 'string'
  );
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
