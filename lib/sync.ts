import {
  ACTIVE_WORKOUT_DRAFT_KEY,
  DAILY_LOGS_KEY,
  FIRST_SESSION_KEY,
  MOBILITY_DONE_KEY,
  STORAGE_KEY,
  USER_PROFILE_KEY,
} from './constants';
import { readBooleanFlag, readJsonStorageResult, readStorageValue, readStorageValueResult, removeStorageValue, writeStorageValue } from './browser-storage';
import { migrateDailyLogs, migrateUserProfile, migrateWorkoutData } from './storage';
import { ActiveWorkoutDraft, DailyLog, UserProfile, WorkoutData, WorkoutSession } from './types';

const SYNC_SCHEMA_VERSION = 2;
const BACKUP_PREFIX = 'liftday_sync_backup_';
const LAST_IMPORT_KEY = 'liftday_sync_last_import';
const ONBOARDING_KEY = 'liftday_onboarding_completed';

type SyncSource = 'phone' | 'laptop' | 'unknown';
type UnknownRecord = Record<string, unknown>;

export interface SyncSnapshotV1 {
  app: 'liftday';
  schemaVersion: 1;
  exportedAt: string;
  source: SyncSource;
  data: WorkoutData;
  profile: UserProfile | null;
  firstSessionDate: string | null;
  mobilityDoneDate: string | null;
}

export interface SyncSnapshotV2 {
  app: 'liftday';
  schemaVersion: 2;
  exportedAt: string;
  source: SyncSource;
  sessions: WorkoutData;
  dailyLogs: Record<string, DailyLog>;
  profile: UserProfile | null;
  activeWorkoutDraft: ActiveWorkoutDraft | null;
  firstSessionDate: string | null;
  mobilityDoneDate: string | null;
  onboardingCompleted?: boolean;
}

export type SyncSnapshot = SyncSnapshotV1 | SyncSnapshotV2;

export interface ImportResult {
  importedSessions: number;
  addedSessions: number;
  updatedSessions: number;
  keptSessions: number;
  importedDailyLogs: number;
  addedDailyLogs: number;
  updatedDailyLogs: number;
  profileImported: boolean;
  activeWorkoutDraftImported: boolean;
  firstSessionDateImported: boolean;
  mobilityDoneDateImported: boolean;
  onboardingCompletedImported: boolean;
  backupKey: string;
  exportedAt: string;
}

export function createSyncSnapshot(source: SyncSource = 'unknown'): SyncSnapshotV2 {
  return {
    app: 'liftday',
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    source,
    sessions: readWorkoutData(),
    dailyLogs: readDailyLogs(),
    profile: readProfile(),
    activeWorkoutDraft: readActiveWorkoutDraft(),
    firstSessionDate: readStorageValue(FIRST_SESSION_KEY),
    mobilityDoneDate: readStorageValue(MOBILITY_DONE_KEY),
    onboardingCompleted: readBooleanFlag(ONBOARDING_KEY),
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

  const current = createImportBaseSnapshot();
  const backupKey = `${BACKUP_PREFIX}${new Date().toISOString()}`;

  const incomingSessions = getSnapshotSessions(snapshot);
  const mergedData: WorkoutData = { ...current.sessions };
  let addedSessions = 0;
  let updatedSessions = 0;
  let keptSessions = 0;

  for (const [dateKey, incomingSession] of Object.entries(incomingSessions)) {
    const existingSession = current.sessions[dateKey];
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

  const writes = new Map<string, string | null>();
  writes.set(backupKey, serializeSyncSnapshot(current));
  writes.set(STORAGE_KEY, JSON.stringify(mergedData));

  const incomingDailyLogs = getSnapshotDailyLogs(snapshot);
  const mergedDailyLogs: Record<string, DailyLog> = { ...current.dailyLogs };
  let addedDailyLogs = 0;
  let updatedDailyLogs = 0;

  for (const [dateKey, incomingLog] of Object.entries(incomingDailyLogs)) {
    const existingLog = current.dailyLogs[dateKey];
    if (!existingLog) {
      addedDailyLogs += 1;
      mergedDailyLogs[dateKey] = { ...incomingLog, dateKey: incomingLog.dateKey ?? dateKey };
      continue;
    }

    const mergedLog = { ...existingLog, ...incomingLog, dateKey };
    if (JSON.stringify(existingLog) !== JSON.stringify(mergedLog)) {
      updatedDailyLogs += 1;
    }
    mergedDailyLogs[dateKey] = mergedLog;
  }

  if (Object.keys(incomingDailyLogs).length > 0) {
    writes.set(DAILY_LOGS_KEY, JSON.stringify(mergedDailyLogs));
  }

  let profileImported = false;
  if (snapshot.profile) {
    writes.set(USER_PROFILE_KEY, JSON.stringify(migrateUserProfile(snapshot.profile)));
    profileImported = true;
  }

  const firstSessionDate = earliestDate(current.firstSessionDate, snapshot.firstSessionDate);
  const firstSessionDateImported = firstSessionDate !== current.firstSessionDate;
  if (firstSessionDate) {
    writes.set(FIRST_SESSION_KEY, firstSessionDate);
  }

  let mobilityDoneDateImported = false;
  if (snapshot.mobilityDoneDate) {
    writes.set(MOBILITY_DONE_KEY, snapshot.mobilityDoneDate);
    mobilityDoneDateImported = snapshot.mobilityDoneDate !== current.mobilityDoneDate;
  }

  const importedDraft = getSnapshotActiveWorkoutDraft(snapshot);
  const activeWorkoutDraftImported = shouldImportDraft(current.activeWorkoutDraft, importedDraft);
  if (activeWorkoutDraftImported && importedDraft) {
    writes.set(ACTIVE_WORKOUT_DRAFT_KEY, JSON.stringify(importedDraft));
  }

  const onboardingCompleted = getSnapshotOnboardingCompleted(snapshot, incomingSessions);
  const onboardingCompletedImported = onboardingCompleted && readBooleanFlag(ONBOARDING_KEY) !== true;
  if (onboardingCompleted) {
    writes.set(ONBOARDING_KEY, 'true');
  }

  writes.set(LAST_IMPORT_KEY, JSON.stringify({
    importedAt: new Date().toISOString(),
    exportedAt: snapshot.exportedAt,
    source: snapshot.source,
    sessions: Object.keys(incomingSessions).length,
    dailyLogs: Object.keys(incomingDailyLogs).length,
    profileImported,
    activeWorkoutDraftImported,
    mobilityDoneDateImported,
    onboardingCompletedImported,
    backupKey,
  }));

  applyTransactionalWrites(writes);

  return {
    importedSessions: Object.keys(incomingSessions).length,
    addedSessions,
    updatedSessions,
    keptSessions,
    importedDailyLogs: Object.keys(incomingDailyLogs).length,
    addedDailyLogs,
    updatedDailyLogs,
    profileImported,
    activeWorkoutDraftImported,
    firstSessionDateImported,
    mobilityDoneDateImported,
    onboardingCompletedImported,
    backupKey,
    exportedAt: snapshot.exportedAt,
  };
}

function createImportBaseSnapshot(): SyncSnapshotV2 {
  const sessions = readWorkoutDataResult();
  const dailyLogs = readDailyLogsResult();
  const profile = readProfileResult();
  const draft = readActiveWorkoutDraftResult();
  const firstSessionDate = readStorageValueResult(FIRST_SESSION_KEY);
  const mobilityDoneDate = readStorageValueResult(MOBILITY_DONE_KEY);

  const failed = [sessions, dailyLogs, profile, draft, firstSessionDate, mobilityDoneDate]
    .find((entry) => !entry.success);
  if (failed && !failed.success) {
    throw new Error(`Cannot import backup until current storage is recoverable: ${failed.reason}`);
  }

  return {
    app: 'liftday',
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'laptop',
    sessions: sessions.value,
    dailyLogs: dailyLogs.value,
    profile: profile.value,
    activeWorkoutDraft: draft.value,
    firstSessionDate: firstSessionDate.value,
    mobilityDoneDate: mobilityDoneDate.value,
    onboardingCompleted: readBooleanFlag(ONBOARDING_KEY),
  };
}

function applyTransactionalWrites(writes: Map<string, string | null>): void {
  const originals = new Map<string, string | null>();

  for (const key of writes.keys()) {
    const original = readStorageValueResult(key);
    if (!original.success) {
      throw new Error(`Import aborted before writing: ${original.reason}`);
    }
    originals.set(key, original.value);
  }

  const applied: string[] = [];
  for (const [key, value] of writes.entries()) {
    const result = value === null ? removeStorageValue(key) : writeStorageValue(key, value);
    if (result.success) {
      applied.push(key);
      continue;
    }

    rollbackTransactionalWrites(originals, applied);
    throw new Error(`Import aborted and rolled back: ${result.reason}`);
  }
}

function rollbackTransactionalWrites(originals: Map<string, string | null>, applied: string[]): void {
  for (const key of applied.reverse()) {
    const original = originals.get(key) ?? null;
    const result = original === null ? removeStorageValue(key) : writeStorageValue(key, original);
    if (!result.success) {
      console.error(`Rollback failed for local storage key "${key}".`, result.error);
    }
  }
}

export function getLocalSyncSummary() {
  const data = readWorkoutData();
  const dates = Object.keys(data).sort();
  return {
    sessionCount: dates.length,
    firstSessionDate: readStorageValue(FIRST_SESSION_KEY) ?? dates[0] ?? null,
    latestSessionDate: dates.at(-1) ?? null,
    lastImport: readStorageValue(LAST_IMPORT_KEY),
  };
}

function readWorkoutData(): WorkoutData {
  return readWorkoutDataResult().value;
}

function readWorkoutDataResult() {
  return readJsonStorageResult(STORAGE_KEY, {}, (value) => isWorkoutData(value) ? migrateWorkoutData(value) : null);
}

function readDailyLogs(): Record<string, DailyLog> {
  return readDailyLogsResult().value;
}

function readDailyLogsResult() {
  return readJsonStorageResult(DAILY_LOGS_KEY, {}, (value) => isDailyLogs(value) ? migrateDailyLogs(value) : null);
}

function readProfile(): UserProfile | null {
  return readProfileResult().value;
}

function readProfileResult() {
  return readJsonStorageResult(USER_PROFILE_KEY, null, (value) => value === null ? null : isUserProfile(value) ? migrateUserProfile(value) : null);
}

function readActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  return readActiveWorkoutDraftResult().value;
}

function readActiveWorkoutDraftResult() {
  return readJsonStorageResult(ACTIVE_WORKOUT_DRAFT_KEY, null, (value) => value === null ? null : isActiveWorkoutDraft(value) ? value : null);
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
  return isSyncSnapshotV1(value) || isSyncSnapshotV2(value);
}

function isSyncSnapshotV1(value: unknown): value is SyncSnapshotV1 {
  if (!isRecord(value)) return false;
  return (
    value.app === 'liftday' &&
    value.schemaVersion === 1 &&
    typeof value.exportedAt === 'string' &&
    isSyncSource(value.source) &&
    isWorkoutData(value.data) &&
    (value.profile === null || isUserProfile(value.profile)) &&
    (value.firstSessionDate === null || typeof value.firstSessionDate === 'string') &&
    (value.mobilityDoneDate === null || typeof value.mobilityDoneDate === 'string')
  );
}

function isSyncSnapshotV2(value: unknown): value is SyncSnapshotV2 {
  if (!isRecord(value)) return false;
  return (
    value.app === 'liftday' &&
    value.schemaVersion === 2 &&
    typeof value.exportedAt === 'string' &&
    isSyncSource(value.source) &&
    isWorkoutData(value.sessions) &&
    isDailyLogs(value.dailyLogs) &&
    (value.profile === null || isUserProfile(value.profile)) &&
    (value.activeWorkoutDraft === null || isActiveWorkoutDraft(value.activeWorkoutDraft)) &&
    (value.firstSessionDate === null || typeof value.firstSessionDate === 'string') &&
    (value.mobilityDoneDate === null || typeof value.mobilityDoneDate === 'string') &&
    (value.onboardingCompleted === undefined || typeof value.onboardingCompleted === 'boolean')
  );
}

function isSyncSource(value: unknown): value is SyncSource {
  return value === 'phone' || value === 'laptop' || value === 'unknown';
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

function isDailyLogs(value: unknown): value is Record<string, DailyLog> {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([dateKey, log]) => typeof dateKey === 'string' && isDailyLog(log));
}

function isDailyLog(value: unknown): value is DailyLog {
  if (!isRecord(value)) return false;
  return Object.values(value).every((fieldValue) => {
    if (fieldValue === undefined || fieldValue === null) return true;
    if (Array.isArray(fieldValue)) return false;
    return ['string', 'number', 'boolean', 'object'].includes(typeof fieldValue);
  });
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.tiers) &&
    isRecord(value.tierProgress) &&
    typeof value.createdAt === 'string'
  );
}

function isActiveWorkoutDraft(value: unknown): value is ActiveWorkoutDraft {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    typeof value.dateKey === 'string' &&
    (value.state === 'warming-up' || value.state === 'exercising' || value.state === 'resting' || value.state === 'transitioning') &&
    typeof value.exerciseIndex === 'number' &&
    typeof value.currentSet === 'number' &&
    isRecord(value.sessionReps) &&
    typeof value.startedAt === 'string' &&
    ['push', 'pull', 'legs', 'push_a', 'pull_a', 'legs_maintenance', 'push_b', 'pull_b', 'delts_arms'].includes(value.workoutType as string) &&
    typeof value.savedAt === 'string' &&
    typeof value.timer === 'number' &&
    (value.timerEndAt === null || typeof value.timerEndAt === 'number') &&
    typeof value.timerPaused === 'boolean' &&
    typeof value.nextExerciseName === 'string' &&
    Array.isArray(value.unavailableEquipment) &&
    Array.isArray(value.skippedChainIndices) &&
    Array.isArray(value.requeuedExercises)
  );
}

function getSnapshotSessions(snapshot: SyncSnapshot): WorkoutData {
  return migrateWorkoutData(snapshot.schemaVersion === 1 ? snapshot.data : snapshot.sessions);
}

function getSnapshotDailyLogs(snapshot: SyncSnapshot): Record<string, DailyLog> {
  return snapshot.schemaVersion === 1 ? {} : migrateDailyLogs(snapshot.dailyLogs);
}

function getSnapshotActiveWorkoutDraft(snapshot: SyncSnapshot): ActiveWorkoutDraft | null {
  return snapshot.schemaVersion === 1 ? null : snapshot.activeWorkoutDraft;
}

function getSnapshotOnboardingCompleted(snapshot: SyncSnapshot, incomingSessions: WorkoutData): boolean {
  if (snapshot.schemaVersion === 2 && typeof snapshot.onboardingCompleted === 'boolean') {
    return snapshot.onboardingCompleted;
  }
  return Boolean(snapshot.profile || Object.keys(incomingSessions).length > 0);
}

function shouldImportDraft(current: ActiveWorkoutDraft | null, incoming: ActiveWorkoutDraft | null): boolean {
  if (!incoming) return false;
  if (!current) return true;
  const currentTime = Date.parse(current.savedAt);
  const incomingTime = Date.parse(incoming.savedAt);
  if (Number.isNaN(currentTime)) return true;
  if (Number.isNaN(incomingTime)) return false;
  return incomingTime > currentTime;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
