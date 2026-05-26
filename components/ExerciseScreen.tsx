'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, AlertCircle, Check, Copy } from 'lucide-react';
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
            <button
              type="button"
              onClick={handleCopyExerciseName}
              className="group mx-auto flex max-w-full flex-col items-center rounded-xl px-2 py-1 text-center active:bg-white/10 sm:mx-0 sm:items-start sm:text-left"
              aria-label={`Copy ${exercise.name}`}
            >
              <span className="text-fluid-exercise font-black uppercase tracking-tighter text-white leading-tight">
                {exercise.name}
              </span>
              <span className={cn(
                'mt-1 inline-flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-widest',
                copiedName ? 'text-green-300' : 'text-white/35'
              )}>
                {copiedName ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copiedName ? 'Copied' : 'Tap name to copy'}
              </span>
            </button>
            {onMachineOccupied && currentSet === 0 && (
              <button
                onClick={() => {
                  if (canDeferMachineOccupied) {
                    onMachineOccupied();
                  } else if (swapAlternatives.length > 0 && onSelectAlternative) {
                    setShowSwapPicker(true);
                  } else {
                    onMachineOccupied();
                  }
                }}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/25 bg-white/5 text-xs font-medium text-white/60 hover:text-white hover:border-white/40 hover:bg-white/10 active:scale-95 transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-ui)]"
              >
                <AlertCircle className="size-3.5 shrink-0" />
                Machine occupied
              </button>
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
                <div className="mx-auto mb-2 flex w-full max-w-xs items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="min-w-0 truncate text-xs font-black uppercase text-white/65">
                    {referenceLabel}
                  </span>
                  <span className={cn('shrink-0 rounded-full px-2 py-1 text-[11px] font-black uppercase', coachingToneClass)}>
                    {coaching.status}
                  </span>
                </div>
                <div className="mx-auto -mt-1 mb-2 flex w-full max-w-xs flex-col gap-1 text-center text-xs font-medium leading-snug">
                  <p className="line-clamp-2 text-white/55">{coaching.reason}</p>
                  {coaching.programContext && (
                    <p className="line-clamp-1 font-mono uppercase text-white/35">{coaching.programContext}</p>
                  )}
                  {coaching.warning && (
                    <p className="line-clamp-2 text-amber-200/80">{coaching.warning}</p>
                  )}
                  {persistenceError && (
                    <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-100">
                      Save failed. {persistenceError}
                    </p>
                  )}
                </div>
                <div className="mx-auto mb-2 flex w-full max-w-xs items-center justify-between gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
                  {[0, 1, 2, 3, 4].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRir(option)}
                      className={cn(
                        'flex h-10 flex-1 items-center justify-center rounded-full text-sm font-black tabular-nums transition',
                        rir === option ? 'bg-white text-black' : 'text-white/45 active:bg-white/10'
                      )}
                      aria-label={`${option} RIR`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
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
          <motion.div
            key="swap-picker"
            initial={{
              opacity: 0,
              transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
            }}
            animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
            exit={{
              opacity: 0,
              transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
            }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 z-[60] flex flex-col bg-black/95 px-4 pb-safe pt-3 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-picker-title"
          >
            <TopBar
              leftAction={
                <Button variant="ghost" size="icon-xl" aria-label="Close alternative picker" onClick={() => setShowSwapPicker(false)} className="-ml-2 text-white/55 hover:bg-white/10 hover:text-white">
                  <ChevronLeft className="icon-lg" />
                </Button>
              }
              center={<span id="swap-picker-title" className="text-fluid-label font-black uppercase tracking-tight text-white">Choose swap</span>}
            />

            <div className="flex-1 overflow-y-auto py-3">
              <p className="mb-3 text-fluid-label font-mono uppercase leading-relaxed text-white/45">
                {exercise.name} is busy. Pick what is open now.
              </p>
              <div className="flex flex-col gap-2">
                {swapAlternatives.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      onSelectAlternative?.(option.key);
                      setShowSwapPicker(false);
                    }}
                    className="min-h-16 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left active:scale-[0.98] active:bg-white/12"
                  >
                    <span className="block truncate text-fluid-label font-black uppercase text-white">
                      {option.name}
                    </span>
                    <span className="mt-1 block text-xs font-mono uppercase text-white/40">
                      {option.primaryMuscle.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-2">
              <Button
                onClick={() => setShowSwapPicker(false)}
                className="col-span-2 min-h-12 rounded-full bg-white text-xs font-black uppercase text-black active:scale-95"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
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
