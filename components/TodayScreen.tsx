'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, CalendarDays, ChartBar, Check, CheckCircle, Dumbbell, Flame, Ruler, Scale, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkout } from '@/hooks/useWorkout';
import { useSchedule } from '@/hooks/useSchedule';
import { useMobility } from '@/hooks/useMobility';
import { formatDateKey, formatDisplayDate } from '@/lib/workout-utils';
import { formatWorkoutType, getWorkoutType, getTrainingStreak } from '@/lib/schedule';
import { Badge } from '@/components/ui/badge';
import { TopBar } from './TopBar';
import { WatchListItem, WatchPanel } from './WatchSurface';
import { DailyLog, UserProfile } from '@/lib/types';
import { getDefaultProfile, loadDailyLogs, loadUserProfile, saveDailyLog, setBodyProfileFallbacks } from '@/lib/storage';
import { getStorageIssues } from '@/lib/browser-storage';
import { REST_DURATION } from '@/lib/constants';

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
  const hasHandledWeight = getValidWeight(todayLog?.morningWeightKg) !== null || todayLog?.weightCheckSkipped === true;

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
    if (isWeightCheckDay && getValidWeight(nextTodayLog?.morningWeightKg) === null && nextTodayLog?.weightCheckSkipped !== true) {
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
    <div className="flex flex-col h-full overflow-hidden bg-black relative">
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
              {formatWorkoutType(workoutType)}
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

      {storageReady && !isDone && workout.exercises[0] && workout.currentPrescription && (
        <div className="w-full px-4 mb-3">
          <WatchPanel subtle className="py-3">
            <p className="text-fluid-label text-zinc-500 uppercase font-mono">Next</p>
            <p className="mt-1 truncate text-fluid-label font-black uppercase text-white">
              {workout.exercises[0].name}
            </p>
            <p className="mt-1 text-fluid-label font-mono uppercase text-white/35">
              {workout.currentPrescription.sets}x{workout.currentPrescription.minReps}-{workout.currentPrescription.maxReps} · {workout.currentPrescription.targetRir}
            </p>
          </WatchPanel>
        </div>
      )}

      <div className="w-full px-4 mb-3 flex flex-col gap-2">
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
      </div>

      {storageReady && !isDone && (
        <>
          {storageIssueMessage && (
            <div className="w-full px-4 mb-3">
              <WatchPanel className="border-amber-300/35 bg-amber-300/10 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-200" />
                  <p className="text-fluid-label font-black uppercase leading-tight text-amber-100">
                    Storage issue. {storageIssueMessage}
                  </p>
                </div>
              </WatchPanel>
            </div>
          )}
          {startError && (
            <div className="w-full px-4 mb-3">
              <WatchPanel className="border-red-500/40 bg-red-500/10 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                  <p className="text-fluid-label font-black uppercase leading-tight text-red-100">
                    {startError}
                  </p>
                </div>
              </WatchPanel>
            </div>
          )}
          <div className="w-full px-4 pb-safe mb-4 shrink-0">
            <Button
              onClick={handleStart}
              className="w-full btn-mobile-accessible rounded-full bg-white text-black active:scale-95 transition-transform duration-150 ease-[var(--ease-out-ui)] font-black uppercase tracking-tight shadow-xl"
            >
              Start
            </Button>
          </div>
        </>
      )}
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
  const todayWeight = getValidWeight(todayLog?.morningWeightKg);
  const profileWeight = getValidWeight(loadUserProfile()?.weightKg) ?? getValidWeight(getDefaultProfile().weightKg);
  const lastWeight = getLastKnownWeight(logs, dateKey) ?? profileWeight;
  const [weightInput, setWeightInput] = useState(() => formatWeightInput(todayWeight ?? lastWeight));
  const [inputError, setInputError] = useState<string | null>(null);

  const saveWeight = () => {
    const nextWeight = Number.parseFloat(weightInput);
    if (!Number.isFinite(nextWeight) || nextWeight < 25 || nextWeight > 250) {
      setInputError('Enter kg');
      return;
    }

    saveDailyLog(dateKey, {
      dateKey,
      morningWeightKg: roundWeight(nextWeight),
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

  const previousLabel = lastWeight !== null ? `Last ${formatWeight(lastWeight)}` : 'No recent weight';

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
              <Input
                aria-label="Bodyweight in kilograms"
                inputMode="decimal"
                type="number"
                min="25"
                max="250"
                step="0.1"
                value={weightInput}
                onChange={(event) => {
                  setWeightInput(event.target.value);
                  setInputError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveWeight();
                }}
                className="h-12 rounded-full border-white/10 bg-black/30 text-center font-mono text-fluid-ui font-black tabular-nums text-white"
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
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="btn-mobile-secondary rounded-full border-white/15 bg-white/5 text-fluid-label font-black uppercase tracking-tight text-white/70 active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={skipWeight}
            className="btn-mobile-secondary rounded-full border-white/15 bg-white/5 text-fluid-label font-black uppercase tracking-tight text-white/70 active:scale-95"
          >
            No scale
          </Button>
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
      formatMeasurementInput(getValidMeasurement(todayLog?.[key]) ?? getLastKnownMeasurement(logs, dateKey, key) ?? getProfileMeasurement(profile, key)),
    ])) as Record<(typeof WEEKLY_MEASUREMENT_FIELDS)[number]['key'], string>;
  });
  const [inputError, setInputError] = useState<string | null>(null);

  const saveMeasurements = () => {
    const values = WEEKLY_MEASUREMENT_FIELDS.map(({ key }) => [key, parseMeasurement(draft[key])] as const);
    if (values.some(([, value]) => value === null || value < 10 || value > 250)) {
      setInputError('Check cm');
      return;
    }

    const measurementLog = values.reduce<WeeklyMeasurements>((nextLog, [key, value]) => {
      nextLog[key] = roundMeasurement(value!);
      return nextLog;
    }, {} as WeeklyMeasurements);
    const defaultProfile = getDefaultProfile();
    saveDailyLog(dateKey, {
      dateKey,
      ...measurementLog,
    });
    setBodyProfileFallbacks({
      heightCm: getValidMeasurement(todayLog?.heightCm) ?? getValidMeasurement(profile.heightCm) ?? defaultProfile.heightCm ?? 172,
      weightKg: getValidWeight(todayLog?.morningWeightKg) ?? getValidWeight(profile.weightKg) ?? defaultProfile.weightKg ?? 68.6,
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
                <WeeklyMeasurementInput
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
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="btn-mobile-secondary rounded-full border-white/15 bg-white/5 text-fluid-label font-black uppercase tracking-tight text-white/70 active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={saveMeasurements}
            className="btn-mobile-secondary rounded-full bg-white text-fluid-label font-black uppercase tracking-tight text-black active:scale-95"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function WeeklyMeasurementInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="block truncate text-fluid-label font-mono uppercase text-white/35">{label}</span>
      <div className="mt-1 flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={value}
          aria-label={`${label} centimeters`}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 border-0 bg-transparent px-0 text-fluid-label font-black tabular-nums text-white shadow-none focus-visible:ring-0"
        />
        <span className="shrink-0 text-[10px] font-mono uppercase text-white/30">cm</span>
      </div>
    </label>
  );
}

function hasWeeklyMeasurements(log: DailyLog | undefined): boolean {
  return WEEKLY_MEASUREMENT_FIELDS.every(({ key }) => getValidMeasurement(log?.[key]) !== null);
}

function getLastKnownMeasurement(
  logs: Record<string, DailyLog>,
  beforeDateKey: string,
  key: (typeof WEEKLY_MEASUREMENT_FIELDS)[number]['key']
): number | null {
  const latest = Object.values(logs)
    .filter((log) => log.dateKey < beforeDateKey && getValidMeasurement(log[key]) !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];

  return getValidMeasurement(latest?.[key]);
}

function getProfileMeasurement(
  profile: UserProfile,
  key: (typeof WEEKLY_MEASUREMENT_FIELDS)[number]['key']
): number {
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

function getLastKnownWeight(logs: Record<string, DailyLog>, beforeDateKey: string): number | null {
  const latest = Object.values(logs)
    .filter((log) => log.dateKey < beforeDateKey && getValidWeight(log.morningWeightKg) !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];

  return getValidWeight(latest?.morningWeightKg);
}

function getValidWeight(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function getValidMeasurement(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function parseMeasurement(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMeasurementInput(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '';
}

function roundMeasurement(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatWeight(value: number): string {
  return `${formatWeightInput(value)}kg`;
}

function formatWeightInput(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '';
}

function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatStorageIssue(issue: ReturnType<typeof getStorageIssues>[number] | undefined): string | null {
  if (!issue) return null;
  return `${issue.reason} Recovery: ${issue.recoveryKey ?? 'not available'}.`;
}
