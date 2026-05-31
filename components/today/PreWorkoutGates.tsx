'use client';

import { useState } from 'react';
import { Camera, Check, Ruler, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  WatchFormPanel,
  WatchMeasurementGrid,
  WatchMeasurementInput,
  WatchPrimaryAction,
  WatchScreen,
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
import type { DueMeasurementKey, MeasurementFieldDefinition } from '@/lib/measurement-schedule';
import { compressProgressPhotoFile, saveProgressPhoto } from '@/lib/progress-photos';
import { TopBar } from '../TopBar';

type DueMeasurements = Partial<Record<DueMeasurementKey, number>>;

export function WeightCheckScreen({
  date,
  dueDateKeys,
  logs,
  onCancel,
  onComplete,
}: {
  date: Date;
  dueDateKeys: string[];
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
    const skipped = new Set([...(todayLog?.weightCheckSkippedDateKeys ?? []), ...dueDateKeys]);
    saveDailyLog(dateKey, {
      dateKey,
      weightCheckSkipped: true,
      weightCheckSkippedDateKeys: [...skipped],
    });
    setInputError(null);
    onComplete(loadDailyLogs());
  };

  const previousLabel = lastWeight !== null ? `Last ${formatKg(lastWeight)}` : 'No recent weight';

  return (
    <WatchScreen
      scrollable={false}
      top={(
        <TopBar
          center={
            <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
              {formatDisplayDate(date)}
            </span>
          }
        />
      )}
      bodyClassName="flex flex-col items-center justify-center"
      footer={(
        <>
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

          <div className="grid grid-cols-2 gap-2">
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
        </>
      )}
      footerClassName="mb-4 flex flex-col gap-3"
    >
        <Scale className="mb-5 h-14 w-14 text-white/35" />
        <h1 className="text-fluid-title font-black uppercase leading-none text-white text-center">
          WEIGHT
        </h1>
        <p className="mt-3 text-fluid-label font-mono font-black uppercase text-white/45">
          {previousLabel}
        </p>
    </WatchScreen>
  );
}

export function WeeklyMeasurementScreen({
  date,
  dueDateKeys,
  fields,
  logs,
  onCancel,
  onComplete,
}: {
  date: Date;
  dueDateKeys: string[];
  fields: MeasurementFieldDefinition[];
  logs: Record<string, DailyLog>;
  onCancel: () => void;
  onComplete: (logs: Record<string, DailyLog>) => void;
}) {
  const dateKey = formatDateKey(date);
  const todayLog = logs[dateKey];
  const profile = loadUserProfile() ?? getDefaultProfile();
  const [draft, setDraft] = useState(() => {
    return Object.fromEntries(fields.map(({ key }) => [
      key,
      formatBodyMeasurementInput(getValidBodyMeasurement(todayLog?.[key]) ?? getLastKnownBodyMeasurement(logs, dateKey, key) ?? getProfileBodyMeasurement(profile, key)),
    ])) as Record<DueMeasurementKey, string>;
  });
  const [inputError, setInputError] = useState<string | null>(null);

  const saveMeasurements = () => {
    const values = fields.map(({ key }) => [key, parseBodyMeasurement(draft[key])] as const);
    if (values.some(([, value]) => value === null || value < 10 || value > 250)) {
      setInputError('Check cm');
      return;
    }

    const measurementLog = values.reduce<DueMeasurements>((nextLog, [key, value]) => {
      nextLog[key] = roundBodyMeasurement(value!);
      return nextLog;
    }, {});
    const defaultProfile = getDefaultProfile();
    saveDailyLog(dateKey, {
      dateKey,
      ...measurementLog,
    });
    setBodyProfileFallbacks({
      heightCm: getValidBodyMeasurement(todayLog?.heightCm) ?? getValidBodyMeasurement(profile.heightCm) ?? defaultProfile.heightCm ?? 172,
      weightKg: getValidBodyMeasurement(todayLog?.morningWeightKg) ?? getValidBodyMeasurement(profile.weightKg) ?? defaultProfile.weightKg ?? 68.6,
      waistCircumferenceCm: measurementLog.waistCm ?? getValidBodyMeasurement(profile.waistCircumferenceCm) ?? defaultProfile.waistCircumferenceCm ?? 76.5,
      shoulderCircumferenceCm: measurementLog.shoulderCm,
      chestCircumferenceCm: measurementLog.chestCm,
      hipCircumferenceCm: measurementLog.hipCm,
      neckCircumferenceCm: measurementLog.neckCm,
      quadCircumferenceCm: measurementLog.quadCm,
      calfCircumferenceCm: measurementLog.calfCm,
      forearmCircumferenceCm: measurementLog.forearmCm,
      bicepsCircumferenceCm: measurementLog.bicepsCm,
    });
    onComplete(loadDailyLogs());
  };

  const skipMeasurements = () => {
    const skipped = new Set([...(todayLog?.measurementCheckSkippedDateKeys ?? []), ...dueDateKeys]);
    saveDailyLog(dateKey, {
      dateKey,
      measurementCheckSkippedDateKeys: [...skipped],
    });
    setInputError(null);
    onComplete(loadDailyLogs());
  };

  return (
    <WatchScreen
      scrollable={false}
      top={(
        <TopBar
          center={
            <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
              {formatDisplayDate(date)}
            </span>
          }
        />
      )}
      bodyClassName="flex flex-col"
      footer={(
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
          <WatchSecondaryAction
            type="button"
            onClick={skipMeasurements}
            className="col-span-2"
          >
            Skip
          </WatchSecondaryAction>
        </div>
      )}
      footerClassName="mb-4"
    >
        <header className="flex shrink-0 items-center gap-3 py-4">
          <Ruler className="h-10 w-10 shrink-0 text-white/35" />
          <div className="min-w-0">
            <h1 className="text-fluid-ui font-black uppercase leading-none text-white">
              Measurements
            </h1>
            <p className="mt-1 text-fluid-label font-mono uppercase text-white/35">
              {fields.length} due before gym
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          <WatchFormPanel error={inputError} className="py-3">
            <WatchMeasurementGrid>
              {fields.map(({ key, label }) => (
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
    </WatchScreen>
  );
}

export function ProgressPhotoCheckScreen({
  date,
  dueDateKeys,
  logs,
  onCancel,
  onComplete,
}: {
  date: Date;
  dueDateKeys: string[];
  logs: Record<string, DailyLog>;
  onCancel: () => void;
  onComplete: (logs: Record<string, DailyLog>) => void;
}) {
  const dateKey = formatDateKey(date);
  const todayLog = logs[dateKey];
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  async function readPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setInputError(null);
      const compressed = await compressProgressPhotoFile(file);
      setImageData(compressed);
      setPreview(compressed);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Photo failed');
    }
  }

  function savePhoto() {
    if (!imageData) {
      setInputError('Choose photo');
      return;
    }
    const result = saveProgressPhoto({ date, imageData, pose: 'front' });
    if (!result.success) {
      setInputError(result.reason);
      return;
    }
    onComplete(loadDailyLogs());
  }

  function skipPhoto() {
    const skipped = new Set([...(todayLog?.photoCheckSkippedDateKeys ?? []), ...dueDateKeys]);
    saveDailyLog(dateKey, {
      dateKey,
      photoCheckSkippedDateKeys: [...skipped],
    });
    onComplete(loadDailyLogs());
  }

  return (
    <WatchScreen
      scrollable={false}
      top={(
        <TopBar
          center={
            <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
              {formatDisplayDate(date)}
            </span>
          }
        />
      )}
      bodyClassName="flex flex-col items-center justify-center px-5 text-center"
      footer={(
        <div className="mb-4 flex flex-col gap-3">
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-fluid-label font-black uppercase text-white active:scale-95">
            <Camera className="h-4 w-4" />
            Choose photo
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => readPhoto(event.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {inputError && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-center text-xs text-red-100">
              {inputError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <WatchSecondaryAction type="button" onClick={onCancel}>
              Cancel
            </WatchSecondaryAction>
            <WatchPrimaryAction type="button" onClick={savePhoto}>
              Save
            </WatchPrimaryAction>
            <WatchSecondaryAction type="button" onClick={skipPhoto} className="col-span-2">
              Skip
            </WatchSecondaryAction>
          </div>
        </div>
      )}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Selected progress photo" className="mb-5 aspect-[3/4] max-h-[42dvh] w-auto rounded-2xl border border-white/10 object-cover" />
      ) : (
        <Camera className="mb-5 h-14 w-14 text-white/35" />
      )}
      <h1 className="text-fluid-title font-black uppercase leading-none text-white">
        Photo
      </h1>
      <p className="mt-3 max-w-64 text-fluid-label font-mono uppercase leading-snug text-white/45">
        Monthly progress check
      </p>
    </WatchScreen>
  );
}
