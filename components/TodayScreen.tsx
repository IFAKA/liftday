'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, CalendarDays, ChartBar, Check, CheckCircle, Dumbbell, Flame, Ruler, Scale, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkout } from '@/hooks/useWorkout';
import { useSchedule } from '@/hooks/useSchedule';
import { useMobility } from '@/hooks/useMobility';
import { formatDateKey, formatDisplayDate } from '@/lib/workout-utils';
import { formatWorkoutType, getWorkoutType, getTrainingStreak } from '@/lib/schedule';
import { Badge } from '@/components/ui/badge';
import { TopBar } from './TopBar';
import { WatchListItem, WatchMeasurementInput, WatchPanel, WatchPrimaryAction, WatchSecondaryAction } from './WatchSurface';
import { DailyLog } from '@/lib/types';
import { getDefaultProfile, loadDailyLogs, loadUserProfile, saveDailyLog, setBodyProfileFallbacks } from '@/lib/storage';
import { getStorageIssues } from '@/lib/browser-storage';
import { REST_DURATION } from '@/lib/constants';
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

type PreWorkoutGate = 'measurements' | 'weight' | null;
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

const ONBOARDING_KEY = 'liftday_onboarding_completed';
const ScreenFallback = () => <LoadingScreen />;

const ExerciseScreen = dynamic(
  () => import('@/components/ExerciseScreen').then((mod) => mod.ExerciseScreen),
  { loading: ScreenFallback, ssr: false }
);
const RestTimer = dynamic(
  () => import('@/components/RestTimer').then((mod) => mod.RestTimer),
  { loading: ScreenFallback, ssr: false }
);
const ExerciseTransition = dynamic(
  () => import('@/components/ExerciseTransition').then((mod) => mod.ExerciseTransition),
  { loading: ScreenFallback, ssr: false }
);
const SessionComplete = dynamic(
  () => import('@/components/SessionComplete').then((mod) => mod.SessionComplete),
  { loading: ScreenFallback, ssr: false }
);
const PrepTimer = dynamic(
  () => import('@/components/PrepTimer').then((mod) => mod.PrepTimer),
  { loading: ScreenFallback, ssr: false }
);
const RestDayScreen = dynamic(
  () => import('@/components/RestDayScreen').then((mod) => mod.RestDayScreen),
  { loading: ScreenFallback, ssr: false }
);

export function TodayScreen() {
  const [today] = useState(() => new Date());
  const router = useRouter();

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      router.replace('/onboarding');
    }
  }, [router]);

  return <TodayContent date={today} />;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-black">
      <Dumbbell className="w-8 h-8 text-white/50 animate-pulse" />
    </div>
  );
}

function TodayContent({ date }: { date: Date }) {
  const [startError, setStartError] = useState<string | null>(null);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [storageIssue, setStorageIssue] = useState<string | null>(null);
  const [preWorkoutGate, setPreWorkoutGate] = useState<PreWorkoutGate>(null);
  const workout = useWorkout(date);
  const schedule = useSchedule(date, workout.data);
  const mobility = useMobility();
  const workoutType = getWorkoutType(date);
  const streak = getTrainingStreak(date, workout.data);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDailyLogs(loadDailyLogs());
    const latestIssue = getStorageIssues().at(-1);
    if (latestIssue) {
      setStorageIssue(`${latestIssue.reason} Recovery: ${latestIssue.recoveryKey ?? 'not available'}.`);
    }
  }, []);

  if (workout.isRestoringActiveWorkout) {
    return <LoadingScreen />;
  }

  const storageReady = workout.isStorageHydrated;
  const storageIssueMessage = storageIssue ?? formatStorageIssue(getStorageIssues().at(-1));

  // Rest day
  if (!schedule.isTraining) {
    return (
      <RestDayScreen
        date={date}
        nextTraining={schedule.nextTraining}
        weekCompleted={schedule.weekProgress.completed}
        weekTotal={schedule.weekProgress.total}
        mobility={mobility}
      />
    );
  }

  // Workout in progress
  if (workout.state === 'warming-up') {
    return (
      <PrepTimer
        mode="warmup"
        seconds={workout.timer}
        totalSeconds={workout.warmupDuration}
        isRunning={!workout.timerPaused}
        onCancel={workout.quitWorkout}
        onPrimary={workout.beginWorkoutAfterWarmup}
        onStartTimer={workout.startWarmupTimer}
        onPreset={workout.setWarmupDuration}
        onRepeat={workout.repeatWarmupTimer}
      />
    );
  }

  if (workout.state === 'exercising') {
    return (
      <ExerciseScreen
        exercise={workout.currentExercise!}
        totalPlannedSets={workout.totalPlannedSets}
        completedPlannedSets={workout.completedPlannedSets}
        currentSet={workout.currentSet}
        setsPerExercise={workout.setsPerExercise}
        currentTarget={workout.currentTarget}
        currentWeightTarget={workout.currentWeightTarget}
        currentWeightStep={workout.currentWeightStep}
        prescription={workout.currentPrescription}
        previousRep={workout.previousRep}
        previousWeight={workout.previousWeight}
        coachingReference={workout.coachingReference}
        autoAdjustSuggestion={workout.autoAdjustSuggestion}
        topRecommendation={workout.topRecommendation}
        currentExerciseSets={workout.sessionReps[workout.currentExercise!.key] ?? []}
        flashColor={workout.flashColor}
        persistenceError={workout.persistenceError}
        onLogSet={workout.logSet}
        onRetryComplete={workout.retryWorkoutSave}
        onQuit={workout.quitWorkout}
        onMachineOccupied={workout.handleMachineOccupied}
        swapAlternatives={workout.swapAlternatives}
        onSelectAlternative={workout.selectAlternativeForOccupied}
        canDeferMachineOccupied={workout.canDeferMachineOccupied}
      />
    );
  }

  if (workout.state === 'transitioning') {
    return (
      <ExerciseTransition
        exerciseName={workout.nextExerciseName}
        onComplete={workout.finishTransition}
      />
    );
  }

  if (workout.state === 'resting') {
    return (
      <RestTimer
        seconds={workout.timer}
        totalSeconds={workout.currentPrescription?.restSeconds ?? REST_DURATION}
        isPaused={workout.timerPaused}
        onSkip={workout.skipTimer}
        onQuit={workout.quitWorkout}
        onUndo={workout.undoLastSet}
nextExerciseName={workout.nextExerciseAfterRestName}
      />
    );
  }

  if (workout.state === 'complete') {
    return (
      <SessionComplete
        mode="workout"
        sessionReps={workout.sessionReps}
        data={workout.data}
        date={date}
        advancedTiers={workout.advancedTiers}
        onDone={workout.quitWorkout}
      />
    );
  }

  // Idle — ready to start (or already done today)
  const isDone = storageReady && schedule.isDone;
  const dateKey = formatDateKey(date);
  const todayLog = dailyLogs[dateKey];
  const isWeightCheckDay = date.getDay() === 6;
  const hasHandledMeasurements = hasWeeklyMeasurements(todayLog);
  const hasHandledWeight = getValidBodyMeasurement(todayLog?.morningWeightKg) !== null || todayLog?.weightCheckSkipped === true;

  const startWarmup = () => {
    setStartError(null);
    setPreWorkoutGate(null);

    workout.startWorkout().catch((error: unknown) => {
      setStartError(error instanceof Error ? error.message : 'Workout start failed.');
    });
  };

  const continueAfterMeasurements = (nextLogs: Record<string, DailyLog>) => {
    setDailyLogs(nextLogs);
    const nextTodayLog = nextLogs[dateKey];
    if (isWeightCheckDay && getValidBodyMeasurement(nextTodayLog?.morningWeightKg) === null && nextTodayLog?.weightCheckSkipped !== true) {
      setPreWorkoutGate('weight');
      return;
    }

    startWarmup();
  };

  const continueAfterWeight = (nextLogs: Record<string, DailyLog>) => {
    setDailyLogs(nextLogs);
    startWarmup();
  };

  const handleStart = () => {
    setStartError(null);
    if (isWeightCheckDay && !hasHandledMeasurements) {
      setPreWorkoutGate('measurements');
      return;
    }

    if (isWeightCheckDay && !hasHandledWeight) {
      setPreWorkoutGate('weight');
      return;
    }

    startWarmup();
  };

  if (!isDone && preWorkoutGate === 'measurements') {
    return (
      <WeeklyMeasurementScreen
        date={date}
        logs={dailyLogs}
        onCancel={() => setPreWorkoutGate(null)}
        onComplete={continueAfterMeasurements}
      />
    );
  }

  if (!isDone && preWorkoutGate === 'weight') {
    return (
      <WeightCheckScreen
        date={date}
        logs={dailyLogs}
        onCancel={() => setPreWorkoutGate(null)}
        onComplete={continueAfterWeight}
      />
    );
  }

  return (
    <TodayHub
      date={date}
      isDone={isDone}
      workoutTitle={formatWorkoutType(workoutType)}
      streak={streak}
      storageReady={storageReady}
      nextExerciseName={workout.exercises[0]?.name}
      nextPrescription={workout.currentPrescription}
      storageIssueMessage={storageIssueMessage}
      startError={startError}
      onStart={handleStart}
    />
  );
}

function TodayHub({
  date,
  isDone,
  workoutTitle,
  streak,
  storageReady,
  nextExerciseName,
  nextPrescription,
  storageIssueMessage,
  startError,
  onStart,
}: {
  date: Date;
  isDone: boolean;
  workoutTitle: string;
  streak: number;
  storageReady: boolean;
  nextExerciseName?: string;
  nextPrescription?: {
    sets: number;
    minReps: number;
    maxReps: number;
    targetRir: string;
  } | null;
  storageIssueMessage: string | null;
  startError: string | null;
  onStart: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      <TopBar
        center={
          <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
            {formatDisplayDate(date)}
          </span>
        }
      />

      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-8">
        {isDone ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-5" />
            <h1 className="text-fluid-title font-black uppercase text-white leading-none">
              DONE
            </h1>
          </div>
        ) : (
          <>
            <h1 className="text-fluid-title font-black uppercase text-white leading-none text-center">
              {workoutTitle}
            </h1>
            {streak > 0 && (
              <Badge variant="ghost" className="mt-3 rounded-full bg-orange-500/10 border-orange-500/20 text-fluid-label font-black text-orange-500 uppercase">
                <Flame className="w-4 h-4 text-orange-500" />
                {streak} DAY STREAK
              </Badge>
            )}
          </>
        )}
      </div>

      {storageReady && !isDone && nextExerciseName && nextPrescription && (
        <WorkoutStartPanel exerciseName={nextExerciseName} prescription={nextPrescription} />
      )}

      <TodayNavList />

      {storageReady && !isDone && (
        <>
          {storageIssueMessage && (
            <StorageIssuePanel tone="warning" message={`Storage issue. ${storageIssueMessage}`} />
          )}
          {startError && (
            <StorageIssuePanel tone="danger" message={startError} />
          )}
          <div className="w-full px-4 pb-safe mb-4 shrink-0">
            <WatchPrimaryAction onClick={onStart} className="shadow-xl">
              Start
            </WatchPrimaryAction>
          </div>
        </>
      )}
    </div>
  );
}

function WorkoutStartPanel({
  exerciseName,
  prescription,
}: {
  exerciseName: string;
  prescription: {
    sets: number;
    minReps: number;
    maxReps: number;
    targetRir: string;
  };
}) {
  return (
    <div className="w-full px-4 mb-3">
      <WatchPanel subtle className="py-3">
        <p className="text-fluid-label text-zinc-500 uppercase font-mono">Next</p>
        <p className="mt-1 truncate text-fluid-label font-black uppercase text-white">
          {exerciseName}
        </p>
        <p className="mt-1 text-fluid-label font-mono uppercase text-white/35">
          {prescription.sets}x{prescription.minReps}-{prescription.maxReps} · {prescription.targetRir}
        </p>
      </WatchPanel>
    </div>
  );
}

function TodayNavList() {
  return (
    <div className="w-full px-4 mb-3 flex flex-col gap-2">
      <WatchListItem href="/muscles" icon={Activity} title="Muscles" subtitle="What is working" subtle className="py-3" />
      <WatchListItem href="/program" icon={CalendarDays} title="Program" subtitle="Routine" subtle className="py-3" />
      <WatchListItem href="/history" icon={ChartBar} title="Progress" subtitle="Changes and attention" subtle className="py-3" />
      <WatchListItem href="/settings" icon={Settings} title="Options" subtitle="Routine, body, sync" subtle className="py-3" />
    </div>
  );
}

function StorageIssuePanel({ tone, message }: { tone: 'warning' | 'danger'; message: string }) {
  const toneClassName = tone === 'warning'
    ? 'border-amber-300/35 bg-amber-300/10 text-amber-100 [&_svg]:text-amber-200'
    : 'border-red-500/40 bg-red-500/10 text-red-100 [&_svg]:text-red-400';

  return (
    <div className="w-full px-4 mb-3">
      <WatchPanel className={`py-3 ${toneClassName}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-fluid-label font-black uppercase leading-tight">
            {message}
          </p>
        </div>
      </WatchPanel>
    </div>
  );
}

function WeightCheckScreen({
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
        <WatchPanel subtle className="py-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
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
              {inputError ? (
                <p className="mt-2 text-fluid-label font-mono uppercase text-red-300">{inputError}</p>
              ) : (
                <p className="mt-2 text-fluid-label font-mono uppercase text-white/30">kg before warm-up</p>
              )}
            </div>
            <Button
              type="button"
              size="icon"
              aria-label="Save weight"
              onClick={saveWeight}
              className="size-12 rounded-full bg-white text-black active:scale-95"
            >
              <Check className="h-5 w-5" />
            </Button>
          </div>
        </WatchPanel>

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

function WeeklyMeasurementScreen({
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
          <WatchPanel subtle className="py-3">
            <div className="grid grid-cols-2 gap-2">
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
            </div>
            {inputError && (
              <p className="mt-3 text-fluid-label font-mono uppercase text-red-300">{inputError}</p>
            )}
          </WatchPanel>
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

function hasWeeklyMeasurements(log: DailyLog | undefined): boolean {
  return WEEKLY_MEASUREMENT_FIELDS.every(({ key }) => getValidBodyMeasurement(log?.[key]) !== null);
}

function formatStorageIssue(issue: ReturnType<typeof getStorageIssues>[number] | undefined): string | null {
  if (!issue) return null;
  return `${issue.reason} Recovery: ${issue.recoveryKey ?? 'not available'}.`;
}
