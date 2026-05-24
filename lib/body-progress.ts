import type { DailyLog, UserProfile } from './types';

export type BodyMeasurementId =
  | 'weight'
  | 'waist'
  | 'shoulder'
  | 'chest'
  | 'hip'
  | 'neck'
  | 'quad'
  | 'calf'
  | 'forearm'
  | 'wrist'
  | 'ankle'
  | 'biceps'
  | 'height'
  | 'target-weight';

type BodyLogKey = keyof Pick<DailyLog, 'morningWeightKg' | 'waistCm' | 'shoulderCm' | 'chestCm' | 'hipCm' | 'neckCm' | 'quadCm' | 'calfCm' | 'forearmCm' | 'wristCm' | 'ankleCm' | 'bicepsCm' | 'heightCm'>;
type BodyProfileKey = keyof Pick<UserProfile, 'weightKg' | 'waistCircumferenceCm' | 'shoulderCircumferenceCm' | 'chestCircumferenceCm' | 'hipCircumferenceCm' | 'neckCircumferenceCm' | 'quadCircumferenceCm' | 'calfCircumferenceCm' | 'forearmCircumferenceCm' | 'wristCircumferenceCm' | 'ankleCircumferenceCm' | 'bicepsCircumferenceCm' | 'heightCm' | 'targetWeightKg'>;

export interface BodyMeasurementDefinition {
  id: BodyMeasurementId;
  label: string;
  shortLabel: string;
  unit: 'kg' | 'cm';
  logKey?: BodyLogKey;
  profileKey: BodyProfileKey;
  fallback: number;
}

export interface BodyMeasurementPoint {
  dateKey: string;
  label: string;
  value: number;
  source: 'profile' | 'log';
}

export interface BodyWeeklyPoint {
  weekKey: string;
  label: string;
  value: number;
  change: number | null;
}

export const BODY_MEASUREMENT_DEFINITIONS: BodyMeasurementDefinition[] = [
  { id: 'weight', label: 'Weight', shortLabel: 'Wt', unit: 'kg', logKey: 'morningWeightKg', profileKey: 'weightKg', fallback: 68.6 },
  { id: 'waist', label: 'Waist', shortLabel: 'Waist', unit: 'cm', logKey: 'waistCm', profileKey: 'waistCircumferenceCm', fallback: 76.5 },
  { id: 'shoulder', label: 'Shoulder', shortLabel: 'Shoulder', unit: 'cm', logKey: 'shoulderCm', profileKey: 'shoulderCircumferenceCm', fallback: 111.76 },
  { id: 'chest', label: 'Chest', shortLabel: 'Chest', unit: 'cm', logKey: 'chestCm', profileKey: 'chestCircumferenceCm', fallback: 89.5 },
  { id: 'hip', label: 'Hip', shortLabel: 'Hip', unit: 'cm', logKey: 'hipCm', profileKey: 'hipCircumferenceCm', fallback: 85 },
  { id: 'neck', label: 'Neck', shortLabel: 'Neck', unit: 'cm', logKey: 'neckCm', profileKey: 'neckCircumferenceCm', fallback: 37 },
  { id: 'quad', label: 'Quad', shortLabel: 'Quad', unit: 'cm', logKey: 'quadCm', profileKey: 'quadCircumferenceCm', fallback: 50 },
  { id: 'calf', label: 'Calf', shortLabel: 'Calf', unit: 'cm', logKey: 'calfCm', profileKey: 'calfCircumferenceCm', fallback: 35 },
  { id: 'forearm', label: 'Forearm', shortLabel: 'Forearm', unit: 'cm', logKey: 'forearmCm', profileKey: 'forearmCircumferenceCm', fallback: 25.5 },
  { id: 'wrist', label: 'Wrist', shortLabel: 'Wrist', unit: 'cm', logKey: 'wristCm', profileKey: 'wristCircumferenceCm', fallback: 16.5 },
  { id: 'ankle', label: 'Ankle', shortLabel: 'Ankle', unit: 'cm', logKey: 'ankleCm', profileKey: 'ankleCircumferenceCm', fallback: 22.5 },
  { id: 'biceps', label: 'Biceps', shortLabel: 'Biceps', unit: 'cm', logKey: 'bicepsCm', profileKey: 'bicepsCircumferenceCm', fallback: 28 },
  { id: 'height', label: 'Height', shortLabel: 'Height', unit: 'cm', logKey: 'heightCm', profileKey: 'heightCm', fallback: 172 },
  { id: 'target-weight', label: 'Ideal weight', shortLabel: 'Ideal', unit: 'kg', profileKey: 'targetWeightKg', fallback: 72 },
];

export function getBodyMeasurementDefinition(id: string): BodyMeasurementDefinition | null {
  return BODY_MEASUREMENT_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}

export function getLatestMeasurementValue(
  definition: BodyMeasurementDefinition,
  profile: UserProfile,
  logs: Record<string, DailyLog>
): number {
  const loggedValue = definition.logKey ? getLatestLoggedValue(logs, definition.logKey) : undefined;
  const profileValue = profile[definition.profileKey];
  return loggedValue ?? (typeof profileValue === 'number' ? profileValue : definition.fallback);
}

export function getMeasurementHistory(
  definition: BodyMeasurementDefinition,
  profile: UserProfile,
  logs: Record<string, DailyLog>
): BodyMeasurementPoint[] {
  const points: BodyMeasurementPoint[] = [];
  const profileValue = profile[definition.profileKey];
  const profileDateKey = getProfileCreatedDateKey(profile.createdAt);

  if (profileDateKey && typeof profileValue === 'number') {
    points.push({
      dateKey: profileDateKey,
      label: formatBodyDate(profileDateKey),
      value: profileValue,
      source: 'profile',
    });
  }

  if (definition.logKey) {
    for (const log of Object.values(logs)) {
      const value = log[definition.logKey];
      if (typeof value !== 'number') continue;
      points.push({
        dateKey: log.dateKey,
        label: formatBodyDate(log.dateKey),
        value,
        source: 'log',
      });
    }
  }

  return points
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .reduce<BodyMeasurementPoint[]>((unique, point) => {
      const previous = unique[unique.length - 1];
      if (previous?.dateKey === point.dateKey) {
        unique[unique.length - 1] = previous.source === 'profile' && point.source === 'log' ? point : previous;
      } else {
        unique.push(point);
      }
      return unique;
    }, []);
}

export function getWeeklyMeasurementSeries(
  definition: BodyMeasurementDefinition,
  logs: Record<string, DailyLog>
): BodyWeeklyPoint[] {
  if (!definition.logKey) return [];

  const weeklyLatest = new Map<string, { dateKey: string; value: number }>();
  for (const log of Object.values(logs).sort((a, b) => a.dateKey.localeCompare(b.dateKey))) {
    const value = log[definition.logKey];
    if (typeof value !== 'number') continue;
    const weekKey = getCalendarWeekKey(log.dateKey);
    const current = weeklyLatest.get(weekKey);
    if (!current || log.dateKey >= current.dateKey) {
      weeklyLatest.set(weekKey, { dateKey: log.dateKey, value });
    }
  }

  const sorted = [...weeklyLatest.entries()].sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([weekKey, point], index) => {
    const previous = sorted[index - 1]?.[1].value;
    return {
      weekKey,
      label: formatWeekLabel(weekKey),
      value: point.value,
      change: typeof previous === 'number' ? point.value - previous : null,
    };
  });
}

export function getBodyProgressSummary(profile: UserProfile, logs: Record<string, DailyLog>) {
  const changedMeasurements = BODY_MEASUREMENT_DEFINITIONS.filter((definition) => {
    const history = getMeasurementHistory(definition, profile, logs);
    return history.length > 1 && roundBodyValue(history[history.length - 1].value - history[0].value) !== 0;
  }).length;
  const latestLogCount = Object.values(logs).filter(hasLoggedBodyMeasurement).length;
  const shoulder = getMeasurementHistory(BODY_MEASUREMENT_DEFINITIONS[2], profile, logs);
  const waist = getMeasurementHistory(BODY_MEASUREMENT_DEFINITIONS[1], profile, logs);
  const firstShoulder = shoulder[0]?.value;
  const latestShoulder = shoulder[shoulder.length - 1]?.value ?? getLatestMeasurementValue(BODY_MEASUREMENT_DEFINITIONS[2], profile, logs);
  const firstWaist = waist[0]?.value;
  const latestWaist = waist[waist.length - 1]?.value ?? getLatestMeasurementValue(BODY_MEASUREMENT_DEFINITIONS[1], profile, logs);
  const ratioChange = typeof firstShoulder === 'number' && typeof firstWaist === 'number'
    ? latestShoulder / latestWaist - firstShoulder / firstWaist
    : 0;

  return {
    changedMeasurements,
    latestLogCount,
    ratioChange,
  };
}

export function formatBodyMeasurement(value: number, unit: 'kg' | 'cm'): string {
  return `${formatBodyNumber(value, 1)}${unit}`;
}

export function formatBodyChange(value: number, unit: 'kg' | 'cm'): string {
  return `${value > 0 ? '+' : ''}${formatBodyNumber(value, 1)}${unit}`;
}

export function formatBodyNumber(value: number, fractionDigits: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(fractionDigits);
}

export function roundBodyValue(value: number): number {
  return Math.round(value * 10) / 10;
}

function getLatestLoggedValue(logs: Record<string, DailyLog>, key: BodyLogKey): number | undefined {
  return Object.values(logs)
    .filter((log) => typeof log[key] === 'number')
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0]?.[key];
}

function hasLoggedBodyMeasurement(log: DailyLog): boolean {
  return BODY_MEASUREMENT_DEFINITIONS.some((definition) => definition.logKey && typeof log[definition.logKey] === 'number');
}

function getProfileCreatedDateKey(value: string): string | undefined {
  const dateKey = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : undefined;
}

function getCalendarWeekKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

function formatWeekLabel(weekKey: string): string {
  return `Week ${formatBodyDate(weekKey)}`;
}

function formatBodyDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
