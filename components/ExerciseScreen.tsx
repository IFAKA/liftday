'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import type { AdaptiveRecommendation, Exercise, ExerciseKey, SMVExercisePrescription, SetEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { NumberInput } from './NumberInput';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { TopBar } from './TopBar';
import { copyText } from '@/lib/clipboard';
import { getNextSetAutoAdjust, type AutoAdjustSuggestion, type AutoAdjustTone } from '@/lib/workout-auto-adjust';
import type { CoachingReference } from '@/hooks/useWorkout';
import { formatLoadTarget } from '@/lib/load-targets';
import { CoachingPanel, ExerciseCopyTitle, MachineOccupiedControl, RirPicker, SwapPicker } from './exercise/ExercisePanels';

interface ExerciseScreenProps {
  exercise: Exercise;
  totalPlannedSets: number;
  completedPlannedSets: number;
  currentSet: number;
  setsPerExercise: number;
  currentTarget: number;
  currentWeightTarget: number;
  currentWeightStep: number;
  prescription: SMVExercisePrescription | null;
  previousRep: number | null;
  previousWeight: number | null;
  coachingReference: CoachingReference | null;
  autoAdjustSuggestion: AutoAdjustSuggestion | null;
  topRecommendation: AdaptiveRecommendation | null;
  currentExerciseSets: SetEntry[];
  flashColor: 'green' | 'red' | null;
  onLogSet: (reps: number, weight?: number, rir?: number) => void;
  onQuit: () => void;
  onMachineOccupied?: () => void;
  swapAlternatives?: Exercise[];
  onSelectAlternative?: (exerciseKey: ExerciseKey) => void;
  canDeferMachineOccupied?: boolean;
  persistenceError?: string | null;
  onRetryComplete?: () => void;
}

export function ExerciseScreen({
  exercise,
  totalPlannedSets,
  completedPlannedSets,
  currentSet,
  setsPerExercise,
  currentTarget,
  currentWeightTarget,
  currentWeightStep,
  prescription,
  previousRep,
  previousWeight,
  coachingReference,
  autoAdjustSuggestion,
  topRecommendation,
  currentExerciseSets,
  flashColor,
  onLogSet,
  onQuit,
  onMachineOccupied,
  swapAlternatives = [],
  onSelectAlternative,
  canDeferMachineOccupied = false,
  persistenceError = null,
  onRetryComplete,
}: ExerciseScreenProps) {
  const isSeconds = exercise.unit === 'seconds';
  const firstSetVal = previousRep ?? currentTarget;
  const firstSetWeight = previousWeight ?? currentWeightTarget;
  const defaultVal = currentSet === 0 ? firstSetVal : currentTarget;
  const defaultWeight = currentSet === 0 ? firstSetWeight : currentWeightTarget;
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [val, setVal] = useState(defaultVal);
  const [weight, setWeight] = useState(defaultWeight);
  const [rir, setRir] = useState(prescription?.targetRirMax ?? 2);
  const [copiedName, setCopiedName] = useState(false);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Exercise changes reset to hook-owned progression or auto-adjust targets.
    setVal(defaultVal);
    setWeight(defaultWeight);
    setRir(autoAdjustSuggestion?.rir ?? prescription?.targetRirMax ?? 2);
    setShowQuitConfirm(false);
    setCopiedName(false);
    setShowSwapPicker(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.key, prescription?.targetRirMax]);

  useEffect(() => {
    if (currentSet !== 0) return;
    setVal(defaultVal);
    setWeight(defaultWeight);
    setRir(autoAdjustSuggestion?.rir ?? (currentSet + 1 === setsPerExercise && prescription?.finalSetRir ? prescription.targetRirMin : prescription?.targetRirMax ?? 2));
  }, [currentSet, defaultVal, defaultWeight, prescription, setsPerExercise, autoAdjustSuggestion]);

  useEffect(() => {
    if (currentSet === 0) return;
    setVal(currentTarget);
    setWeight(currentWeightTarget);
    setRir(autoAdjustSuggestion?.rir ?? (currentSet + 1 === setsPerExercise && prescription?.finalSetRir ? prescription.targetRirMin : prescription?.targetRirMax ?? 2));
    setShowQuitConfirm(false);
    setCopiedName(false);
    setShowSwapPicker(false);
  }, [currentSet, currentTarget, currentWeightTarget, prescription, setsPerExercise, autoAdjustSuggestion]);

  useEffect(() => {
    const handlePopState = () => {
      setShowQuitConfirm(true);
      window.history.pushState({ exercise: true }, '');
    };
    window.history.pushState({ exercise: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const totalSets = Math.max(1, totalPlannedSets);
  const completedSets = completedPlannedSets;
  const progressPercent = (completedSets / totalSets) * 100;
  const coaching = getNextSetAutoAdjust({
    exerciseKey: exercise.key,
    unit: exercise.unit,
    loggedSet: {
      reps: val,
      weight: exercise.unit === 'weighted' ? weight : null,
      rir,
    },
    prescription,
    priorSets: currentExerciseSets,
    previousSessionReference: coachingReference
      ? {
          reps: coachingReference.reps,
          weight: coachingReference.weight,
          rir: coachingReference.rir ?? prescription?.targetRirMax ?? 2,
        }
      : null,
    topRecommendation,
    currentSuggestion: autoAdjustSuggestion,
  });
  const referenceLabel = formatReferenceLabel(coachingReference);
  const coachingToneClass = getCoachingToneClass(coaching.tone);

  async function handleCopyExerciseName() {
    await copyText(exercise.name);
    setCopiedName(true);
    window.setTimeout(() => setCopiedName(false), 1400);
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Subtle Progress Bar */}
      <Progress
        value={progressPercent}
        className="absolute top-0 left-0 right-0 h-0.5 rounded-none bg-white/10 z-50 [&_[data-slot=progress-indicator]]:bg-white"
      />

      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key="logging"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'absolute inset-0 flex flex-col items-center transition-colors duration-500',
            flashColor === 'green' && 'bg-green-950/40',
            flashColor === 'red' && 'bg-red-950/40'
          )}
        >
          <TopBar
            leftAction={
              <Button variant="ghost" size="icon-xl" aria-label="Quit workout" onClick={() => setShowQuitConfirm(true)} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
                <X className="icon-lg" />
              </Button>
            }
            center={
              <span className="text-fluid-label font-black uppercase text-white tracking-[0.15em]">
                SET {currentSet + 1} OF {setsPerExercise}
              </span>
            }
          />

          <div className="w-full px-6 pt-4 shrink-0">
            <ExerciseCopyTitle exerciseName={exercise.name} copied={copiedName} onCopy={handleCopyExerciseName} />
            {onMachineOccupied && currentSet === 0 && (
              <MachineOccupiedControl
                onClick={() => {
                  if (canDeferMachineOccupied) {
                    onMachineOccupied();
                  } else if (swapAlternatives.length > 0 && onSelectAlternative) {
                    setShowSwapPicker(true);
                  } else {
                    onMachineOccupied();
                  }
                }}
              />
            )}
            {prescription && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-fluid-label font-mono uppercase text-white/40">
                <span>{prescription.minReps}-{prescription.maxReps} reps</span>
                <span className="text-white/15">/</span>
                <span>{currentSet + 1 === setsPerExercise && prescription.finalSetRir ? prescription.finalSetRir : prescription.targetRir}</span>
                <span className="text-white/15">/</span>
                <span>{prescription.restLabel}</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full relative min-h-0">
            {isSeconds ? (
              <NumberInput
                key={`${exercise.key}-${currentSet}-${defaultVal}`}
                defaultValue={defaultVal}
                max={120}
                label="Seconds"
                onChange={setVal}
              />
            ) : (
              <div className="flex-1 flex flex-col w-full min-h-0">
                <NumberInput
                  key={`${exercise.key}-${currentSet}-weight-${defaultWeight}`}
                  defaultValue={defaultWeight}
                  min={0}
                  max={500}
                  step={currentWeightStep}
                  label="KG"
                  compact
                  onChange={setWeight}
                />
                <NumberInput
                  key={`${exercise.key}-${currentSet}-reps-${defaultVal}`}
                  defaultValue={defaultVal}
                  min={1}
                  max={40}
                  label="REPS"
                  compact
                  onChange={setVal}
                />
                <CoachingPanel
                  referenceLabel={referenceLabel}
                  status={coaching.status}
                  statusClassName={coachingToneClass}
                  reason={coaching.reason}
                  programContext={coaching.programContext}
                  warning={coaching.warning}
                  persistenceError={persistenceError}
                />
                <RirPicker value={rir} onChange={setRir} />
              </div>
            )}
          </div>

          <div className="w-full px-4 pb-safe mb-4 shrink-0 z-10">
            <Button
              onClick={() => {
                if (persistenceError && onRetryComplete) {
                  onRetryComplete();
                  return;
                }
                onLogSet(val, isSeconds ? undefined : weight, rir);
              }}
              className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-transform duration-150 ease-[var(--ease-out-ui)] shadow-xl"
            >
              {persistenceError ? 'RETRY SAVE' : 'LOG SET'}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />

      <AnimatePresence>
        {showSwapPicker && (
          <SwapPicker
            exerciseName={exercise.name}
            swapAlternatives={swapAlternatives}
            shouldReduceMotion={shouldReduceMotion}
            onClose={() => setShowSwapPicker(false)}
            onSelectAlternative={onSelectAlternative}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function getCoachingToneClass(tone: AutoAdjustTone): string {
  switch (tone) {
    case 'good':
      return 'bg-emerald-400/15 text-emerald-200';
    case 'warning':
      return 'bg-amber-400/15 text-amber-200';
    case 'danger':
      return 'bg-red-400/15 text-red-200';
    case 'neutral':
      return 'bg-white/10 text-white/70';
  }
}

function formatReferenceLabel(reference: CoachingReference | null): string {
  if (reference === null) return 'No prior set';
  const effort = reference.rir === null ? '' : ` @${reference.rir}`;
  if (reference.weight !== null) return `Last: ${formatLoadTarget(reference.weight)} x ${reference.reps}${effort}`;
  return `Last: ${reference.reps}${effort}`;
}
