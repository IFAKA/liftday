'use client';

import { useState } from 'react';
import { Check, Ruler, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  WatchFormPanel,
  WatchMeasurementGrid,
  WatchMeasurementInput,
  WatchPrimaryAction,
  WatchSecondaryAction,
} from '@/components/WatchSurface';
import type { DailyLog } from '@/lib/types';
import { formatDateKey, formatDisplayDate } from '@/lib/workout-utils';
import {
  getDefaultProfile,
  loadDailyLogs,
  loadUserProfile,
  saveDailyLog,
  setBodyProfileFallbacks,
} from '@/lib/storage';
import {
  formatBodyMeasurementInput,
  formatKg,
  getLastKnownBodyMeasurement,
  getLastKnownWeight,
  getProfileBodyMeasurement,
  getValidBodyMeasurement,
  parseBodyMeasurement,
  roundBodyMeasurement,
} from '@/lib/body-measurements';
import { TopBar } from '../TopBar';

type WeeklyMeasurementKey = keyof Pick<DailyLog, 'waistCm' | 'shoulderCm' | 'chestCm' | 'hipCm' | 'neckCm' | 'quadCm' | 'calfCm' | 'forearmCm' | 'wristCm' | 'ankleCm' | 'bicepsCm'>;
type WeeklyMeasurements = Record<WeeklyMeasurementKey, number>;

const WEEKLY_MEASUREMENT_FIELDS = [
  { key: 'waistCm', label: 'Waist' },
  { key: 'shoulderCm', label: 'Shoulder' },
  { key: 'chestCm', label: 'Chest' },
  { key: 'hipCm', label: 'Hip' },
  { key: 'neckCm', label: 'Neck' },
  { key: 'quadCm', label: 'Quad' },
  { key: 'calfCm', label: 'Calf' },
  { key: 'forearmCm', label: 'Forearm' },
  { key: 'wristCm', label: 'Wrist' },
  { key: 'ankleCm', label: 'Ankle' },
  { key: 'bicepsCm', label: 'Biceps' },
] as const satisfies readonly { key: WeeklyMeasurementKey; label: string }[];

export function WeightCheckScreen({
  date,
  logs,
  onCancel,
  onComplete,
}: {
  date: Date;
  logs: Record<string, DailyLog>;
  onCancel: () => void;
  onComplete: (logs: Record<string, DailyLog>) => void;
}) {
  const dateKey = formatDateKey(date);
  const todayLog = logs[dateKey];
  const todayWeight = getValidBodyMeasurement(todayLog?.morningWeightKg);
  const profileWeight = getValidBodyMeasurement(loadUserProfile()?.weightKg) ?? getValidBodyMeasurement(getDefaultProfile().weightKg);
  const lastWeight = getLastKnownWeight(logs, dateKey) ?? profileWeight;
  const [weightInput, setWeightInput] = useState(() => formatBodyMeasurementInput(todayWeight ?? lastWeight));
  const [inputError, setInputError] = useState<string | null>(null);

  const saveWeight = () => {
    const nextWeight = parseBodyMeasurement(weightInput);
    if (nextWeight === null || nextWeight < 25 || nextWeight > 250) {
      setInputError('Enter kg');
      return;
    }

    saveDailyLog(dateKey, {
      dateKey,
      morningWeightKg: roundBodyMeasurement(nextWeight),
      weightCheckSkipped: false,
    });
    onComplete(loadDailyLogs());
  };

  const skipWeight = () => {
    saveDailyLog(dateKey, {
      dateKey,
      weightCheckSkipped: true,
    });
    setInputError(null);
    onComplete(loadDailyLogs());
  };

  const previousLabel = lastWeight !== null ? `Last ${formatKg(lastWeight)}` : 'No recent weight';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black px-safe pt-safe pb-safe">
      <TopBar
        center={
          <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
            {formatDisplayDate(date)}
          </span>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <Scale className="mb-5 h-14 w-14 text-white/35" />
        <h1 className="text-fluid-title font-black uppercase leading-none text-white text-center">
          WEIGHT
        </h1>
        <p className="mt-3 text-fluid-label font-mono font-black uppercase text-white/45">
          {previousLabel}
        </p>
      </div>

      <div className="w-full px-4 pb-safe mb-4 shrink-0">
        <WatchFormPanel
          hint="kg before warm-up"
          error={inputError}
          action={
            <Button
              type="button"
              size="icon"
              aria-label="Save weight"
              onClick={saveWeight}
              className="size-12 rounded-full bg-white text-black active:scale-95"
            >
              <Check className="h-5 w-5" />
            </Button>
          }
        >
          <WatchMeasurementInput
            label="Bodyweight in kilograms"
            unit="kg"
            min={25}
            max={250}
            value={weightInput}
            onChange={(value) => {
              setWeightInput(value);
              setInputError(null);
            }}
            onEnter={saveWeight}
            compact
          />
        </WatchFormPanel>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <WatchSecondaryAction
            type="button"
            onClick={onCancel}
          >
            Cancel
          </WatchSecondaryAction>
          <WatchSecondaryAction
            type="button"
            onClick={skipWeight}
          >
            No scale
          </WatchSecondaryAction>
        </div>
      </div>
    </div>
  );
}

export function WeeklyMeasurementScreen({
  date,
  logs,
  onCancel,
  onComplete,
}: {
  date: Date;
  logs: Record<string, DailyLog>;
  onCancel: () => void;
  onComplete: (logs: Record<string, DailyLog>) => void;
}) {
  const dateKey = formatDateKey(date);
  const todayLog = logs[dateKey];
  const profile = loadUserProfile() ?? getDefaultProfile();
  const [draft, setDraft] = useState(() => {
    return Object.fromEntries(WEEKLY_MEASUREMENT_FIELDS.map(({ key }) => [
      key,
      formatBodyMeasurementInput(getValidBodyMeasurement(todayLog?.[key]) ?? getLastKnownBodyMeasurement(logs, dateKey, key) ?? getProfileBodyMeasurement(profile, key)),
    ])) as Record<(typeof WEEKLY_MEASUREMENT_FIELDS)[number]['key'], string>;
  });
  const [inputError, setInputError] = useState<string | null>(null);

  const saveMeasurements = () => {
    const values = WEEKLY_MEASUREMENT_FIELDS.map(({ key }) => [key, parseBodyMeasurement(draft[key])] as const);
    if (values.some(([, value]) => value === null || value < 10 || value > 250)) {
      setInputError('Check cm');
      return;
    }

    const measurementLog = values.reduce<WeeklyMeasurements>((nextLog, [key, value]) => {
      nextLog[key] = roundBodyMeasurement(value!);
      return nextLog;
    }, {} as WeeklyMeasurements);
    const defaultProfile = getDefaultProfile();
    saveDailyLog(dateKey, {
      dateKey,
      ...measurementLog,
    });
    setBodyProfileFallbacks({
      heightCm: getValidBodyMeasurement(todayLog?.heightCm) ?? getValidBodyMeasurement(profile.heightCm) ?? defaultProfile.heightCm ?? 172,
      weightKg: getValidBodyMeasurement(todayLog?.morningWeightKg) ?? getValidBodyMeasurement(profile.weightKg) ?? defaultProfile.weightKg ?? 68.6,
      waistCircumferenceCm: measurementLog.waistCm,
      shoulderCircumferenceCm: measurementLog.shoulderCm,
      chestCircumferenceCm: measurementLog.chestCm,
      hipCircumferenceCm: measurementLog.hipCm,
      neckCircumferenceCm: measurementLog.neckCm,
      quadCircumferenceCm: measurementLog.quadCm,
      calfCircumferenceCm: measurementLog.calfCm,
      forearmCircumferenceCm: measurementLog.forearmCm,
      wristCircumferenceCm: measurementLog.wristCm,
      ankleCircumferenceCm: measurementLog.ankleCm,
      bicepsCircumferenceCm: measurementLog.bicepsCm,
    });
    onComplete(loadDailyLogs());
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black px-safe pt-safe pb-safe">
      <TopBar
        center={
          <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
            {formatDisplayDate(date)}
          </span>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-4">
        <div className="flex shrink-0 items-center gap-3 py-4">
          <Ruler className="h-10 w-10 shrink-0 text-white/35" />
          <div className="min-w-0">
            <h1 className="text-fluid-ui font-black uppercase leading-none text-white">
              Measurements
            </h1>
            <p className="mt-1 text-fluid-label font-mono uppercase text-white/35">
              Tape check before gym
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          <WatchFormPanel error={inputError} className="py-3">
            <WatchMeasurementGrid>
              {WEEKLY_MEASUREMENT_FIELDS.map(({ key, label }) => (
                <WatchMeasurementInput
                  key={key}
                  label={label}
                  value={draft[key]}
                  onChange={(value) => {
                    setDraft((current) => ({ ...current, [key]: value }));
                    setInputError(null);
                  }}
                />
              ))}
            </WatchMeasurementGrid>
          </WatchFormPanel>
        </div>
      </div>

      <div className="w-full px-4 pb-safe mb-4 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <WatchSecondaryAction
            type="button"
            onClick={onCancel}
          >
            Cancel
          </WatchSecondaryAction>
          <WatchPrimaryAction
            type="button"
            onClick={saveMeasurements}
          >
            Save
          </WatchPrimaryAction>
        </div>
      </div>
    </div>
  );
}

export function hasWeeklyMeasurements(log: DailyLog | undefined): boolean {
  return WEEKLY_MEASUREMENT_FIELDS.every(({ key }) => getValidBodyMeasurement(log?.[key]) !== null);
}
