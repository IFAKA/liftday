'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  WatchFormPanel,
  WatchMeasurementGrid,
  WatchMeasurementInput,
  WatchPanel,
} from '@/components/WatchSurface';
import type { DailyLog } from '@/lib/types';
import { formatDateKey } from '@/lib/workout-utils';
import { getDefaultProfile, loadDailyLogs, loadUserProfile, saveDailyLog } from '@/lib/storage';
import {
  formatBodyMeasurementInput,
  formatCm,
  getLastKnownBodyMeasurement,
  getValidBodyMeasurement,
  parseBodyMeasurement,
  roundBodyMeasurement,
} from '@/lib/body-measurements';

export function RestDayActionRow({
  children,
  className,
  shouldReduceMotion,
}: {
  children: ReactNode;
  className?: string;
  shouldReduceMotion: boolean | null;
}) {
  return (
    <motion.div
      layout={shouldReduceMotion ? false : 'position'}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type MeasurementSaveState = 'editing' | 'saved' | 'dismissed';

export function WaistMeasurementPanel({
  date,
  logs,
  onLogsChange,
}: {
  date: Date;
  logs: Record<string, DailyLog>;
  onLogsChange: (logs: Record<string, DailyLog>) => void;
}) {
  const dateKey = formatDateKey(date);
  const todayWaist = getValidBodyMeasurement(logs[dateKey]?.waistCm);
  const todayShoulder = getValidBodyMeasurement(logs[dateKey]?.shoulderCm);
  const profileWaist = getValidBodyMeasurement(loadUserProfile()?.waistCircumferenceCm) ?? getValidBodyMeasurement(getDefaultProfile().waistCircumferenceCm);
  const profileShoulder = getValidBodyMeasurement(loadUserProfile()?.shoulderCircumferenceCm) ?? getValidBodyMeasurement(getDefaultProfile().shoulderCircumferenceCm);
  const lastWaist = getLastKnownBodyMeasurement(logs, dateKey, 'waistCm') ?? profileWaist;
  const lastShoulder = getLastKnownBodyMeasurement(logs, dateKey, 'shoulderCm') ?? profileShoulder;
  const [saveState, setSaveState] = useState<MeasurementSaveState>(todayWaist === null || todayShoulder === null ? 'editing' : 'dismissed');
  const [waistInput, setWaistInput] = useState(() => formatBodyMeasurementInput(todayWaist ?? lastWaist));
  const [shoulderInput, setShoulderInput] = useState(() => formatBodyMeasurementInput(todayShoulder ?? lastShoulder));
  const [savedMeasurements, setSavedMeasurements] = useState<{ waist: number; shoulder: number } | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const displayedWaist = savedMeasurements?.waist ?? todayWaist;
  const displayedShoulder = savedMeasurements?.shoulder ?? todayShoulder;

  useEffect(() => {
    if (saveState !== 'saved') return undefined;

    const timeout = window.setTimeout(() => {
      setSaveState('dismissed');
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [saveState]);

  const saveMeasurements = () => {
    const nextWaist = parseBodyMeasurement(waistInput);
    const nextShoulder = parseBodyMeasurement(shoulderInput);
    if (nextWaist === null || nextWaist < 40 || nextWaist > 180) {
      setInputError('Enter waist');
      return;
    }
    if (nextShoulder === null || nextShoulder < 60 || nextShoulder > 180) {
      setInputError('Enter shoulder');
      return;
    }

    const roundedWaist = roundBodyMeasurement(nextWaist);
    const roundedShoulder = roundBodyMeasurement(nextShoulder);

    saveDailyLog(dateKey, {
      dateKey,
      waistCm: roundedWaist,
      shoulderCm: roundedShoulder,
    });
    onLogsChange(loadDailyLogs());
    setSavedMeasurements({ waist: roundedWaist, shoulder: roundedShoulder });
    setSaveState('saved');
    setInputError(null);
  };

  return (
    <AnimatePresence initial={false}>
      {saveState !== 'dismissed' && (
        <motion.div
          layout={shouldReduceMotion ? false : 'position'}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0, y: -6 }}
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="mb-2 overflow-hidden"
        >
          <WatchPanel
            subtle
            className={saveState === 'saved' ? 'border-green-400/25 bg-green-400/10 py-3' : 'py-3'}
          >
            <div className="flex items-center gap-2.5">
              {saveState === 'saved' ? (
                <Check className="h-4 w-4 shrink-0 text-green-300" />
              ) : (
                <Ruler className="h-4 w-4 shrink-0 text-white/45" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-fluid-label font-mono uppercase text-white/35">Waist + shoulders</p>
                <p className="mt-1 truncate text-fluid-label font-black uppercase text-white">
                  {todayWaist !== null && todayShoulder !== null ? 'Measured today' : 'Same conditions'}
                </p>
              </div>
              {saveState !== 'editing' && displayedWaist !== null && displayedShoulder !== null && (
                <p className="shrink-0 text-fluid-label font-mono font-black tabular-nums uppercase text-white/55">
                  {formatCm(displayedWaist)} / {formatCm(displayedShoulder)}
                </p>
              )}
            </div>

            {saveState === 'editing' ? (
              <div className="mt-3 flex items-start gap-2">
                <WatchFormPanel
                  surface={false}
                  className="min-w-0 flex-1"
                  error={inputError}
                  hint="Same morning, relaxed"
                >
                  <WatchMeasurementGrid>
                    <WatchMeasurementInput
                      label="Waist circumference in centimeters"
                      min={40}
                      max={180}
                      value={waistInput}
                      onChange={(value) => {
                        setWaistInput(value);
                        setInputError(null);
                      }}
                      onEnter={saveMeasurements}
                      compact
                    />
                    <WatchMeasurementInput
                      label="Shoulder circumference in centimeters"
                      min={60}
                      max={180}
                      value={shoulderInput}
                      onChange={(value) => {
                        setShoulderInput(value);
                        setInputError(null);
                      }}
                      onEnter={saveMeasurements}
                      compact
                    />
                  </WatchMeasurementGrid>
                </WatchFormPanel>
                <Button
                  type="button"
                  size="icon"
                  aria-label="Save waist and shoulders"
                  onClick={saveMeasurements}
                  className="size-11 rounded-full bg-white text-black active:scale-95"
                >
                  <Check className="h-5 w-5" />
                </Button>
              </div>
            ) : null}
          </WatchPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
