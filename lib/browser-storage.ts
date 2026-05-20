export function readStorageValue(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageValue(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage full or unavailable
  }
}

export function removeStorageValue(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readJsonStorage<T>(
  key: string,
  fallback: T,
  transform?: (value: unknown) => T | null
): T {
  try {
    const raw = readStorageValue(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return transform?.(parsed) ?? (parsed as T);
  } catch {
    return fallback;
  }
}

export function writeJsonStorage(key: string, value: unknown): void {
  writeStorageValue(key, JSON.stringify(value));
}

export function readBooleanFlag(key: string): boolean {
  return readStorageValue(key) === 'true';
}
