import { STORAGE_ISSUES_KEY } from './constants';
import type { PersistenceReadResult, PersistenceResult, StorageIssue } from './types';

const CORRUPT_BACKUP_PREFIX = 'liftday_corrupt_payload_';

export function ok(): PersistenceResult {
  return { success: true };
}

export function fail(reason: string, error?: unknown): PersistenceResult {
  return { success: false, reason, error };
}

export function readStorageValue(key: string): string | null {
  const result = readStorageValueResult(key);
  return result.success ? result.value : null;
}

export function readStorageValueResult(key: string): PersistenceReadResult<string | null> {
  try {
    if (typeof window === 'undefined') return { success: true, value: null };
    return { success: true, value: window.localStorage.getItem(key) };
  } catch (error) {
    const reason = `Could not read local storage key "${key}": ${formatStorageError(error)}`;
    recordStorageIssue({ key, operation: 'read', reason });
    console.error(reason, error);
    return { success: false, value: null, reason, error };
  }
}

export function writeStorageValue(key: string, value: string): PersistenceResult {
  try {
    if (typeof window === 'undefined') return ok();
    window.localStorage.setItem(key, value);
    return ok();
  } catch (error) {
    const reason = `Could not write local storage key "${key}": ${formatStorageError(error)}`;
    recordStorageIssue({ key, operation: 'write', reason });
    console.error(reason, error);
    return fail(reason, error);
  }
}

export function removeStorageValue(key: string): PersistenceResult {
  try {
    if (typeof window === 'undefined') return ok();
    window.localStorage.removeItem(key);
    return ok();
  } catch (error) {
    const reason = `Could not remove local storage key "${key}": ${formatStorageError(error)}`;
    recordStorageIssue({ key, operation: 'remove', reason });
    console.error(reason, error);
    return fail(reason, error);
  }
}

export function readJsonStorage<T>(
  key: string,
  fallback: T,
  transform?: (value: unknown) => T | null
): T {
  return readJsonStorageResult(key, fallback, transform).value;
}

export function readJsonStorageResult<T>(
  key: string,
  fallback: T,
  transform?: (value: unknown) => T | null
): PersistenceReadResult<T> {
  try {
    const rawResult = readStorageValueResult(key);
    if (!rawResult.success) {
      return { ...rawResult, value: fallback };
    }
    const raw = rawResult.value;
    if (!raw) return { success: true, value: fallback };
    const parsed = JSON.parse(raw) as unknown;
    const transformed = transform?.(parsed) ?? (parsed as T);
    if (transformed === null) {
      const reason = `Persisted data for "${key}" failed validation.`;
      const recoveryKey = preserveRawPayload(key, raw);
      recordStorageIssue({ key, operation: 'validate', reason, recoveryKey });
      console.error(reason);
      return { success: false, value: fallback, reason, raw, error: new Error(reason) };
    }
    return { success: true, value: transformed };
  } catch (error) {
    const raw = readStorageValue(key);
    const reason = `Persisted data for "${key}" is corrupt JSON.`;
    const recoveryKey = raw ? preserveRawPayload(key, raw) : undefined;
    recordStorageIssue({ key, operation: 'parse', reason, recoveryKey });
    console.error(reason, error);
    return { success: false, value: fallback, reason, raw: raw ?? undefined, error };
  }
}

export function writeJsonStorage(key: string, value: unknown): PersistenceResult {
  try {
    return writeStorageValue(key, JSON.stringify(value));
  } catch (error) {
    const reason = `Could not serialize local storage key "${key}": ${formatStorageError(error)}`;
    recordStorageIssue({ key, operation: 'write', reason });
    console.error(reason, error);
    return fail(reason, error);
  }
}

export function readBooleanFlag(key: string): boolean {
  return readStorageValue(key) === 'true';
}

export function getStorageIssues(): StorageIssue[] {
  return readJsonStorage(STORAGE_ISSUES_KEY, [], (value) => Array.isArray(value) ? value as StorageIssue[] : []);
}

export function clearStorageIssues(): PersistenceResult {
  return removeStorageValue(STORAGE_ISSUES_KEY);
}

function preserveRawPayload(key: string, raw: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const recoveryKey = `${CORRUPT_BACKUP_PREFIX}${key}_${Date.now()}`;
  try {
    window.localStorage.setItem(recoveryKey, raw);
    return recoveryKey;
  } catch (error) {
    const reason = `Could not preserve corrupt local storage payload for "${key}".`;
    console.error(reason, error);
    return undefined;
  }
}

function recordStorageIssue(input: Omit<StorageIssue, 'happenedAt'>): void {
  if (typeof window === 'undefined') return;
  const issue: StorageIssue = { ...input, happenedAt: new Date().toISOString() };
  try {
    const raw = window.localStorage.getItem(STORAGE_ISSUES_KEY);
    const current = raw ? JSON.parse(raw) as unknown : [];
    const issues = Array.isArray(current) ? current as StorageIssue[] : [];
    window.localStorage.setItem(STORAGE_ISSUES_KEY, JSON.stringify([...issues.slice(-9), issue]));
  } catch (error) {
    console.error('Could not record storage issue.', error, issue);
  }
}

function formatStorageError(error: unknown): string {
  if (error instanceof DOMException) return `${error.name}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return 'unknown error';
}
