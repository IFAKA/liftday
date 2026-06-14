import type { DailyLog } from './types';
import { getValidBodyMeasurement } from './body-measurements';
import { formatDateKey } from './workout-utils';

export type DueMeasurementKey =
  | 'waistCm'
  | 'shoulderCm'
  | 'chestCm'
  | 'bicepsCm'
  | 'forearmCm'
  | 'neckCm'
  | 'hipCm'
  | 'quadCm'
  | 'calfCm'
  | 'wristCm'
  | 'ankleCm';

export interface MeasurementFieldDefinition {
  key: DueMeasurementKey;
  label: string;
}

export interface MeasurementCheckDue {
  dueDateKeys: string[];
  measurementFields: MeasurementFieldDefinition[];
  weightDue: boolean;
  photoDue: boolean;
}

const MEASUREMENT_CADENCE_ANCHOR = new Date(2026, 0, 4);
const DAYS_PER_WEEK = 7;

export const MEASUREMENT_FIELD_DEFINITIONS: readonly MeasurementFieldDefinition[] = [
  { key: 'waistCm', label: 'Waist' },
  { key: 'shoulderCm', label: 'Shoulder' },
  { key: 'chestCm', label: 'Chest' },
  { key: 'bicepsCm', label: 'Biceps' },
  { key: 'forearmCm', label: 'Forearm' },
  { key: 'neckCm', label: 'Neck' },
  { key: 'hipCm', label: 'Hip' },
  { key: 'quadCm', label: 'Quad' },
  { key: 'calfCm', label: 'Calf' },
  { key: 'wristCm', label: 'Wrist' },
  { key: 'ankleCm', label: 'Ankle' },
] as const;

const FIELD_ORDER = new Map(MEASUREMENT_FIELD_DEFINITIONS.map((field, index) => [field.key, index]));

export function getMeasurementCheckDue(
  date: Date,
  logs: Record<string, DailyLog>,
  photoDateKeys: string[] = []
): MeasurementCheckDue {
  const currentDateKey = formatDateKey(date);
  const dueFields = new Map<DueMeasurementKey, MeasurementFieldDefinition>();
  const dueDateKeys = new Set<string>();
  let weightDue = false;
  let photoDue = false;

  for (const scheduled of getScheduledWeightDaysThrough(date)) {
    const scheduledDateKey = formatDateKey(scheduled.date);
    let cycleHasDue = false;

    if (!hasWeightHandled(logs, scheduledDateKey, currentDateKey)) {
      weightDue = true;
      cycleHasDue = true;
    }

    if (cycleHasDue) dueDateKeys.add(scheduledDateKey);
  }

  for (const scheduled of getScheduledMeasurementDaysThrough(date)) {
    const scheduledDateKey = formatDateKey(scheduled.date);
    const dueForCycle = getCycleDueFields(scheduled.weekIndex);
    let cycleHasDue = false;

    for (const field of dueForCycle.measurements) {
      if (hasMeasurementHandled(logs, scheduledDateKey, currentDateKey, field.key)) continue;
      dueFields.set(field.key, field);
      cycleHasDue = true;
    }

    if (
      dueForCycle.photos &&
      !hasPhotoHandled(logs, photoDateKeys, scheduledDateKey, currentDateKey)
    ) {
      photoDue = true;
      cycleHasDue = true;
    }

    if (cycleHasDue) dueDateKeys.add(scheduledDateKey);
  }

  return {
    dueDateKeys: [...dueDateKeys].sort(),
    measurementFields: [...dueFields.values()].sort((a, b) => (FIELD_ORDER.get(a.key) ?? 0) - (FIELD_ORDER.get(b.key) ?? 0)),
    weightDue,
    photoDue,
  };
}

export function isMondayCheckDay(date: Date): boolean {
  return isMeasurementCheckDay(date);
}

export function isMeasurementCheckDay(date: Date): boolean {
  return date.getDay() === 0;
}

function getScheduledMeasurementDaysThrough(date: Date): { date: Date; weekIndex: number }[] {
  const current = startOfLocalDay(date);
  const latestMeasurementDay = getSundayOnOrBefore(current);
  const weekIndex = getWeeksSinceMeasurementAnchor(latestMeasurementDay);
  return weekIndex >= 0 ? [{ date: latestMeasurementDay, weekIndex }] : [];
}

function getCycleDueFields(weekIndex: number): {
  measurements: readonly MeasurementFieldDefinition[];
  photos: boolean;
} {
  const measurements: MeasurementFieldDefinition[] = [
    MEASUREMENT_FIELD_DEFINITIONS[0],
  ];

  if (weekIndex % 4 === 0) {
    measurements.push(
      MEASUREMENT_FIELD_DEFINITIONS[1],
      MEASUREMENT_FIELD_DEFINITIONS[2],
      MEASUREMENT_FIELD_DEFINITIONS[3],
      MEASUREMENT_FIELD_DEFINITIONS[4],
      MEASUREMENT_FIELD_DEFINITIONS[5],
      MEASUREMENT_FIELD_DEFINITIONS[6],
      MEASUREMENT_FIELD_DEFINITIONS[7],
      MEASUREMENT_FIELD_DEFINITIONS[8],
      MEASUREMENT_FIELD_DEFINITIONS[9],
      MEASUREMENT_FIELD_DEFINITIONS[10]
    );
  }

  return {
    measurements,
    photos: weekIndex % 4 === 0,
  };
}

function getScheduledWeightDaysThrough(date: Date): { date: Date; weekIndex: number }[] {
  const current = startOfLocalDay(date);
  const monday = getMondayOnOrBefore(current);
  return [0, 2, 4, 5]
    .map((dayOffset) => {
      const scheduledDate = new Date(monday);
      scheduledDate.setDate(monday.getDate() + dayOffset);
      return scheduledDate;
    })
    .filter((scheduledDate) => scheduledDate <= current)
    .map((scheduledDate) => ({ date: scheduledDate, weekIndex: getWeeksSinceMeasurementAnchor(monday) }));
}

function hasWeightHandled(logs: Record<string, DailyLog>, scheduledDateKey: string, currentDateKey: string): boolean {
  return getLogsInWindow(logs, scheduledDateKey, currentDateKey).some((log) => (
    getValidBodyMeasurement(log.morningWeightKg) !== null ||
    log.weightCheckSkipped === true ||
    log.weightCheckSkippedDateKeys?.includes(scheduledDateKey) === true
  ));
}

function hasMeasurementHandled(
  logs: Record<string, DailyLog>,
  scheduledDateKey: string,
  currentDateKey: string,
  field: DueMeasurementKey
): boolean {
  return getLogsInWindow(logs, scheduledDateKey, currentDateKey).some((log) => (
    getValidBodyMeasurement(log[field]) !== null ||
    log.measurementCheckSkippedDateKeys?.includes(scheduledDateKey) === true
  ));
}

function hasPhotoHandled(
  logs: Record<string, DailyLog>,
  photoDateKeys: string[],
  scheduledDateKey: string,
  currentDateKey: string
): boolean {
  if (photoDateKeys.some((dateKey) => dateKey >= scheduledDateKey && dateKey <= currentDateKey)) return true;
  return getLogsInWindow(logs, scheduledDateKey, currentDateKey).some((log) => (
    log.photoCheckSkippedDateKeys?.includes(scheduledDateKey) === true
  ));
}

function getLogsInWindow(logs: Record<string, DailyLog>, startDateKey: string, endDateKey: string): DailyLog[] {
  return Object.values(logs).filter((log) => log.dateKey >= startDateKey && log.dateKey <= endDateKey);
}

function getWeeksSinceMeasurementAnchor(date: Date): number {
  const normalized = startOfLocalDay(date);
  return Math.round((normalized.getTime() - MEASUREMENT_CADENCE_ANCHOR.getTime()) / (DAYS_PER_WEEK * 24 * 60 * 60 * 1000));
}

function getMondayOnOrBefore(date: Date): Date {
  const normalized = startOfLocalDay(date);
  const daysSinceMonday = (normalized.getDay() + 6) % DAYS_PER_WEEK;
  normalized.setDate(normalized.getDate() - daysSinceMonday);
  return normalized;
}

function getSundayOnOrBefore(date: Date): Date {
  const normalized = startOfLocalDay(date);
  normalized.setDate(normalized.getDate() - normalized.getDay());
  return normalized;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
