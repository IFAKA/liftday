'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Activity, CalendarDays, ChartBar, Check, Moon, Play, Ruler, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MobilityFlow } from './MobilityFlow';
import { MobilityErrorBoundary } from './MobilityErrorBoundary';
import { SessionComplete } from './SessionComplete';
import { DailyLog, MobilityExercise } from '@/lib/types';
import { WatchListItem, WatchPanel } from './WatchSurface';
import { formatDateKey } from '@/lib/workout-utils';
import { getDefaultProfile, loadDailyLogs, loadUserProfile, saveDailyLog } from '@/lib/storage';

export interface MobilityHookState {
  exercise: MobilityExercise;
  exerciseIndex: number;
  totalExercises: number;
  timer: number;
  side: 'left' | 'right' | null;
  isActive: boolean;
  isPaused: boolean;
  isComplete: boolean;
  startMobility: () => void;
  skip: () => void;
  pause: () => void;
  resume: () => void;
  quit: () => void;
}

interface RestDayScreenProps {
  date: Date;
  nextTraining: string | null;
  weekCompleted: number;
  weekTotal: number;
  mobility: MobilityHookState;
}

export function RestDayScreen({ date, nextTraining, weekCompleted, weekTotal, mobility }: RestDayScreenProps) {
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>(() => loadDailyLogs());
  const isSunday = date.getDay() === 0;
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDailyLogs(loadDailyLogs());
  }, []);

  if (mobility.isActive) {
    return (
      <MobilityErrorBoundary onSkip={mobility.skip} onQuit={mobility.quit}>
        <MobilityFlow
          exercise={mobility.exercise}
          exerciseIndex={mobility.exerciseIndex}
          totalExercises={mobility.totalExercises}
          timer={mobility.timer}
          side={mobility.side}
          isPaused={mobility.isPaused}
          onSkip={mobility.skip}
          onPause={mobility.pause}
          onResume={mobility.resume}
          onQuit={mobility.quit}
        />
      </MobilityErrorBoundary>
    );
  }

  if (mobility.isComplete) {
    return (
      <SessionComplete
        mode="mobility"
        date={new Date()}
        weekCompleted={weekCompleted}
        weekTotal={weekTotal}
        nextTraining={nextTraining}
        onDone={mobility.quit}
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center overflow-hidden bg-black px-safe pt-safe pb-safe">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-end w-full px-4 py-3">
        <Moon className="w-12 h-12 sm:w-16 sm:h-16 text-white/30 mb-3 sm:mb-4" />
        <h1 className="text-fluid-title font-black uppercase text-white leading-none mb-2 text-center">
          REST
        </h1>
        {nextTraining && (
          <p className="text-fluid-label font-bold text-white/40 uppercase px-6 text-center">
            NEXT: {nextTraining}
          </p>
        )}
      </div>

      <div className="w-full shrink-0 px-4 pb-4 sm:pb-6 flex flex-col">
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion} className="mb-2">
          <WatchListItem
            href="/muscles"
            icon={Activity}
            title="Muscles"
            subtitle="What is working"
            subtle
            className="py-3"
          />
        </RestDayActionRow>
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion} className="mb-2">
          <WatchListItem
            href="/program"
            icon={CalendarDays}
            title="Program"
            subtitle="Routine"
            subtle
            className="py-3"
          />
        </RestDayActionRow>
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion} className="mb-2">
          <WatchListItem
            href="/history"
            icon={ChartBar}
            title="Progress"
            subtitle="Changes and attention"
            subtle
            className="py-3"
          />
        </RestDayActionRow>
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion} className="mb-2">
          <WatchListItem
            href="/settings"
            icon={Settings}
            title="Options"
            subtitle="Routine, body, sync"
            subtle
            className="py-3"
          />
        </RestDayActionRow>
        {isSunday && (
          <WaistMeasurementPanel
            date={date}
            logs={dailyLogs}
            onLogsChange={setDailyLogs}
          />
        )}
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion}>
          <Button
            onClick={mobility.startMobility}
            className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black hover:bg-white/90 active:scale-95 transition-[background-color,transform] duration-150 ease-[var(--ease-out-ui)] shadow-xl"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 fill-current" />
            5 MIN MOBILITY
          </Button>
        </RestDayActionRow>
      </div>
    </div>
  );
}

function RestDayActionRow({
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

function WaistMeasurementPanel({
  date,
  logs,
  onLogsChange,
}: {
  date: Date;
  logs: Record<string, DailyLog>;
  onLogsChange: (logs: Record<string, DailyLog>) => void;
}) {
  const dateKey = formatDateKey(date);
  const todayWaist = getValidMeasurement(logs[dateKey]?.waistCm);
  const todayShoulder = getValidMeasurement(logs[dateKey]?.shoulderCm);
  const profileWaist = getValidMeasurement(loadUserProfile()?.waistCircumferenceCm) ?? getValidMeasurement(getDefaultProfile().waistCircumferenceCm);
  const profileShoulder = getValidMeasurement(loadUserProfile()?.shoulderCircumferenceCm) ?? getValidMeasurement(getDefaultProfile().shoulderCircumferenceCm);
  const lastWaist = getLastKnownMeasurement(logs, dateKey, 'waistCm') ?? profileWaist;
  const lastShoulder = getLastKnownMeasurement(logs, dateKey, 'shoulderCm') ?? profileShoulder;
  const [saveState, setSaveState] = useState<MeasurementSaveState>(todayWaist === null || todayShoulder === null ? 'editing' : 'dismissed');
  const [waistInput, setWaistInput] = useState(() => formatCmInput(todayWaist ?? lastWaist));
  const [shoulderInput, setShoulderInput] = useState(() => formatCmInput(todayShoulder ?? lastShoulder));
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
    const nextWaist = Number.parseFloat(waistInput);
    const nextShoulder = Number.parseFloat(shoulderInput);
    if (!Number.isFinite(nextWaist) || nextWaist < 40 || nextWaist > 180) {
      setInputError('Enter waist');
      return;
    }
    if (!Number.isFinite(nextShoulder) || nextShoulder < 60 || nextShoulder > 180) {
      setInputError('Enter shoulder');
      return;
    }

    const roundedWaist = roundMeasurement(nextWaist);
    const roundedShoulder = roundMeasurement(nextShoulder);

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
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  <MeasurementInput
                    label="Waist circumference in centimeters"
                    min={40}
                    max={180}
                    value={waistInput}
                    onChange={(value) => {
                      setWaistInput(value);
                      setInputError(null);
                    }}
                    onEnter={saveMeasurements}
                  />
                  <MeasurementInput
                    label="Shoulder circumference in centimeters"
                    min={60}
                    max={180}
                    value={shoulderInput}
                    onChange={(value) => {
                      setShoulderInput(value);
                      setInputError(null);
                    }}
                    onEnter={saveMeasurements}
                  />
                  {inputError ? (
                    <p className="col-span-2 mt-1 text-fluid-label font-mono uppercase text-red-300">{inputError}</p>
                  ) : (
                    <p className="col-span-2 mt-1 truncate text-fluid-label font-mono uppercase text-white/30">Same morning, relaxed</p>
                  )}
                </div>
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

function MeasurementInput({
  label,
  min,
  max,
  value,
  onChange,
  onEnter,
}: {
  label: string;
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  return (
    <Input
      aria-label={label}
      inputMode="decimal"
      type="number"
      min={min}
      max={max}
      step="0.1"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onEnter();
      }}
      className="h-11 rounded-full border-white/10 bg-black/30 px-2 text-center font-mono text-fluid-label font-black tabular-nums text-white"
    />
  );
}

function getLastKnownMeasurement(logs: Record<string, DailyLog>, beforeDateKey: string, key: 'waistCm' | 'shoulderCm'): number | null {
  const latest = Object.values(logs)
    .filter((log) => log.dateKey < beforeDateKey && getValidMeasurement(log[key]) !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];

  return getValidMeasurement(latest?.[key]);
}

function getValidMeasurement(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function formatCm(value: number): string {
  return `${formatCmInput(value)}cm`;
}

function formatCmInput(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '';
}

function roundMeasurement(value: number): number {
  return Math.round(value * 10) / 10;
}
