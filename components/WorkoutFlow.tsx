'use client';

import dynamic from 'next/dynamic';
import type { UseWorkoutReturn } from '@/hooks/useWorkout';
import { REST_DURATION } from '@/lib/constants';
import { CooldownStretchScreen } from './CooldownStretchScreen';
import { Dumbbell } from 'lucide-react';

const ScreenFallback = () => (
  <div className="flex h-full items-center justify-center bg-black">
    <Dumbbell className="h-8 w-8 animate-pulse text-white/50" />
  </div>
);

const ExerciseScreen = dynamic(
  () => import('@/components/ExerciseScreen').then((mod) => mod.ExerciseScreen),
  { loading: ScreenFallback, ssr: false },
);
const RestTimer = dynamic(
  () => import('@/components/RestTimer').then((mod) => mod.RestTimer),
  { loading: ScreenFallback, ssr: false },
);
const SessionComplete = dynamic(
  () => import('@/components/SessionComplete').then((mod) => mod.SessionComplete),
  { loading: ScreenFallback, ssr: false },
);
const PrepTimer = dynamic(
  () => import('@/components/PrepTimer').then((mod) => mod.PrepTimer),
  { loading: ScreenFallback, ssr: false },
);

export function WorkoutFlow({ workout, date }: { workout: UseWorkoutReturn; date: Date }) {
  if (workout.phase === 'warmup-stretch' || workout.phase === 'warmup-plank') {
    return (
      <PrepTimer
        mode={workout.phase === 'warmup-stretch' ? 'warmup-stretch' : 'warmup-plank'}
        seconds={workout.timer}
        totalSeconds={workout.phase === 'warmup-stretch' ? 1 : workout.warmupDuration}
        isRunning={!workout.timerPaused}
        onCancel={workout.quitWorkout}
        onPrimary={workout.phase === 'warmup-stretch' ? workout.startWarmupTimer : workout.beginWorkoutAfterWarmup}
        onStartTimer={workout.startWarmupTimer}
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
        supersetPartnerName={workout.currentSupersetPartnerName}
        equipmentBlockPartnerName={workout.currentEquipmentBlockPartnerName}
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

  if (workout.state === 'resting') {
    return (
      <RestTimer
        seconds={workout.timer}
        totalSeconds={workout.currentPrescription?.restSeconds ?? REST_DURATION}
        isPaused={workout.timerPaused}
        onSkip={workout.skipTimer}
        onQuit={workout.quitWorkout}
        nextExerciseName={workout.nextExerciseAfterRestName}
        nextSupersetPartnerName={workout.nextSupersetPartnerName}
        nextEquipmentBlockPartnerName={workout.nextEquipmentBlockPartnerName}
        onNextMachineOccupied={
          workout.canHandleNextExerciseMachineOccupied ? workout.handleNextExerciseMachineOccupied : undefined
        }
      />
    );
  }

  if (workout.phase === 'cooldown-stretch' || workout.phase === 'cooldown-choice') {
    return (
      <CooldownStretchScreen
        phase={workout.phase}
        seconds={workout.timer}
        onRepeat={workout.repeatCooldown}
        onEnd={workout.finishWorkout}
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

  return <ScreenFallback />;
}
