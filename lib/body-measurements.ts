import type { DailyLog, UserProfile } from '@/lib/types';
import { getDefaultProfile } from '@/lib/storage';

export type BodyMeasurementLogKey = keyof Pick<
  DailyLog,
  | 'waistCm'
  | 'shoulderCm'
  | 'chestCm'
  | 'hipCm'
  | 'neckCm'
  | 'quadCm'
  | 'calfCm'
  | 'forearmCm'
  | 'wristCm'
  | 'ankleCm'
  | 'bicepsCm'
>;

export function getValidBodyMeasurement(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function parseBodyMeasurement(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatBodyMeasurementInput(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '';
}

export function roundBodyMeasurement(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatCm(value: number): string {
  return `${formatBodyMeasurementInput(value)}cm`;
}

export function formatKg(value: number): string {
  return `${formatBodyMeasurementInput(value)}kg`;
}

export function getLastKnownBodyMeasurement(
  logs: Record<string, DailyLog>,
  beforeDateKey: string,
  key: BodyMeasurementLogKey
): number | null {
  const latest = Object.values(logs)
    .filter((log) => log.dateKey < beforeDateKey && getValidBodyMeasurement(log[key]) !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];

  return getValidBodyMeasurement(latest?.[key]);
}

export function getLastKnownWeight(logs: Record<string, DailyLog>, beforeDateKey: string): number | null {
  const latest = Object.values(logs)
    .filter((log) => log.dateKey < beforeDateKey && getValidBodyMeasurement(log.morningWeightKg) !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];

  return getValidBodyMeasurement(latest?.morningWeightKg);
}

export function getProfileBodyMeasurement(profile: UserProfile, key: BodyMeasurementLogKey): number {
  const defaultProfile = getDefaultProfile();
  switch (key) {
    case 'waistCm':
      return profile.waistCircumferenceCm ?? defaultProfile.waistCircumferenceCm ?? 76.5;
    case 'shoulderCm':
      return profile.shoulderCircumferenceCm ?? defaultProfile.shoulderCircumferenceCm ?? 111.76;
    case 'chestCm':
      return profile.chestCircumferenceCm ?? defaultProfile.chestCircumferenceCm ?? 89.5;
    case 'hipCm':
      return profile.hipCircumferenceCm ?? defaultProfile.hipCircumferenceCm ?? 85;
    case 'neckCm':
      return profile.neckCircumferenceCm ?? defaultProfile.neckCircumferenceCm ?? 37;
    case 'quadCm':
      return profile.quadCircumferenceCm ?? defaultProfile.quadCircumferenceCm ?? 50;
    case 'calfCm':
      return profile.calfCircumferenceCm ?? defaultProfile.calfCircumferenceCm ?? 35;
    case 'forearmCm':
      return profile.forearmCircumferenceCm ?? defaultProfile.forearmCircumferenceCm ?? 25.5;
    case 'wristCm':
      return profile.wristCircumferenceCm ?? defaultProfile.wristCircumferenceCm ?? 16.5;
    case 'ankleCm':
      return profile.ankleCircumferenceCm ?? defaultProfile.ankleCircumferenceCm ?? 22.5;
    case 'bicepsCm':
      return profile.bicepsCircumferenceCm ?? defaultProfile.bicepsCircumferenceCm ?? 28;
  }
}
