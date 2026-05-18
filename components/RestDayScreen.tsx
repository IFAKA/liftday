'use client';

import { useEffect, useState } from 'react';
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
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const isSunday = date.getDay() === 0;

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

      <div className="w-full shrink-0 px-4 pb-4 sm:pb-6 flex flex-col gap-2">
        <WatchListItem
          href="/muscles"
          icon={Activity}
          title="Muscles"
          subtitle="What is working"
          subtle
          className="py-3"
        />
        <WatchListItem
          href="/program"
          icon={CalendarDays}
          title="Program"
          subtitle="Routine"
          subtle
          className="py-3"
        />
        <WatchListItem
          href="/history"
          icon={ChartBar}
          title="Progress"
          subtitle="Changes and attention"
          subtle
          className="py-3"
        />
        <WatchListItem
          href="/settings"
          icon={Settings}
          title="Options"
          subtitle="Routine, body, sync"
          subtle
          className="py-3"
        />
        {isSunday && (
          <WaistMeasurementPanel
            date={date}
            logs={dailyLogs}
            onLogsChange={setDailyLogs}
          />
        )}
        <Button
          onClick={mobility.startMobility}
          className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-xl"
        >
          <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 fill-current" />
          5 MIN MOBILITY
        </Button>
      </div>
    </div>
  );
}

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
  const profileWaist = getValidMeasurement(loadUserProfile()?.waistCircumferenceCm) ?? getValidMeasurement(getDefaultProfile().waistCircumferenceCm);
  const lastWaist = getLastKnownWaist(logs, dateKey) ?? profileWaist;
  const [isEditing, setIsEditing] = useState(todayWaist === null);
  const [waistInput, setWaistInput] = useState(() => formatCmInput(todayWaist ?? lastWaist));
  const [inputError, setInputError] = useState<string | null>(null);

  const saveWaist = () => {
    const nextWaist = Number.parseFloat(waistInput);
    if (!Number.isFinite(nextWaist) || nextWaist < 40 || nextWaist > 180) {
      setInputError('Enter cm');
      return;
    }

    saveDailyLog(dateKey, {
      dateKey,
      waistCm: roundMeasurement(nextWaist),
    });
    onLogsChange(loadDailyLogs());
    setIsEditing(false);
    setInputError(null);
  };

  return (
    <WatchPanel subtle className="py-3">
      <div className="flex items-center gap-2.5">
        <Ruler className="h-4 w-4 shrink-0 text-white/45" />
        <div className="min-w-0 flex-1">
          <p className="text-fluid-label font-mono uppercase text-white/35">Sunday waist</p>
          <p className="mt-1 truncate text-fluid-label font-black uppercase text-white">
            {todayWaist !== null ? 'Measured today' : 'Same conditions'}
          </p>
        </div>
        {!isEditing && todayWaist !== null && (
          <p className="shrink-0 text-fluid-label font-mono font-black tabular-nums uppercase text-white/55">
            {formatCm(todayWaist)}
          </p>
        )}
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setWaistInput(formatCmInput(todayWaist ?? lastWaist));
              setInputError(null);
              setIsEditing(true);
            }}
            className="h-9 w-11 shrink-0 rounded-full border border-white/10 bg-white/5 px-0 text-[10px] font-black uppercase text-white/80 hover:bg-white/10 hover:text-white"
          >
            Log
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-3 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Input
              aria-label="Waist circumference in centimeters"
              inputMode="decimal"
              type="number"
              min="40"
              max="180"
              step="0.1"
              value={waistInput}
              onChange={(event) => {
                setWaistInput(event.target.value);
                setInputError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveWaist();
              }}
              className="h-11 rounded-full border-white/10 bg-black/30 text-center font-mono text-fluid-ui font-black tabular-nums text-white"
            />
            {inputError ? (
              <p className="mt-1 text-fluid-label font-mono uppercase text-red-300">{inputError}</p>
            ) : (
              <p className="mt-1 truncate text-fluid-label font-mono uppercase text-white/30">Same morning, relaxed</p>
            )}
          </div>
          <Button
            type="button"
            size="icon"
            aria-label="Save waist"
            onClick={saveWaist}
            className="size-11 rounded-full bg-white text-black active:scale-95"
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>
      ) : null}
    </WatchPanel>
  );
}

function getLastKnownWaist(logs: Record<string, DailyLog>, beforeDateKey: string): number | null {
  const latest = Object.values(logs)
    .filter((log) => log.dateKey < beforeDateKey && getValidMeasurement(log.waistCm) !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];

  return getValidMeasurement(latest?.waistCm);
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
