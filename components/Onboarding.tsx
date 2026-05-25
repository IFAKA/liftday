'use client';

import { useState } from 'react';
import { Activity, BarChart3, CheckCircle2, ChevronLeft, History, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Activity,
    label: 'Today',
    title: 'Know what to train next.',
    description: [
      'Open the app and start from Today.',
      'Your next session, warm-up, and rest day are kept in one place.',
    ],
    checklist: ['Start the next workout', 'See rest or mobility days', 'Keep the routine out of your way'],
    action: 'Next',
  },
  {
    icon: CheckCircle2,
    label: 'Log',
    title: 'Record sets while you lift.',
    description: [
      'Enter weight, reps, and effort after each set.',
      'LiftDay uses that history to suggest the next useful target.',
    ],
    checklist: ['Fast set entry', 'Built-in rest timing', 'Previous performance cues'],
    action: 'Next',
  },
  {
    icon: BarChart3,
    label: 'Review',
    title: 'Use history to adjust.',
    description: [
      'Check trends when you need context, not during the set.',
      'Your workout data stays on this device unless you export or sync it.',
    ],
    checklist: ['Training history', 'Progress signals', 'Local-first data'],
    action: 'Start',
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col items-center overflow-hidden bg-black">
      <TopBar
        center={<span className="text-fluid-label font-black uppercase tracking-tight text-white/45">Setup</span>}
        leftAction={
          step > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="-ml-2 text-white/45 hover:bg-transparent hover:text-white active:text-white"
              aria-label="Previous step"
            >
              <ChevronLeft className="size-5" />
            </Button>
          ) : null
        }
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            onClick={onComplete}
            className="-mr-2 text-white/45 hover:bg-transparent hover:text-white active:text-white"
            aria-label="Skip onboarding"
          >
            <X className="size-5" />
          </Button>
        }
      />

      <div className="flex w-full flex-1 flex-col overflow-y-auto px-4 pb-3 pt-1 no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{
              opacity: 0,
              transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
            }}
            animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
            exit={{
              opacity: 0,
              transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
            }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="flex min-h-full w-full flex-col justify-center py-4"
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-2xl bg-white text-black shadow-[0_16px_50px_rgba(255,255,255,0.08)]">
                <Icon className="size-5" />
              </div>
              <span className="text-fluid-label font-black uppercase tracking-[0.18em] text-white/40">
                {currentStep.label}
              </span>
            </div>

            <h1 className="max-w-sm text-[2rem] font-black leading-[0.95] tracking-normal text-white min-[390px]:text-[2.35rem]">
              {currentStep.title}
            </h1>

            <div className="mt-4 flex max-w-sm flex-col gap-2">
              {currentStep.description.map((line) => (
                <p key={line} className="text-base font-medium leading-snug text-white/58">
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {currentStep.checklist.map((item) => (
                <div
                  key={item}
                  className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white/78"
                >
                  <CheckCircle2 className="size-4 text-green-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full shrink-0 px-4 pb-safe">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-[width,background-color] duration-180 ease-[var(--ease-out-ui)] ${
                  i === step ? 'w-6 bg-white' : 'w-2 bg-white/18'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
            {step + 1}/{steps.length}
          </span>
        </div>

        <Button
          onClick={handleNext}
          className="mb-4 h-14 w-full rounded-2xl bg-white text-base font-black uppercase tracking-tight text-black shadow-[0_18px_45px_rgba(255,255,255,0.10)] transition-transform duration-150 ease-[var(--ease-out-ui)] active:scale-[0.98]"
        >
          {currentStep.action}
        </Button>

        <div className="flex items-center justify-center gap-2 pb-1 text-xs font-semibold text-white/32">
          <History className="size-3.5" />
          <span>Settings can be changed later.</span>
        </div>
      </div>
    </div>
  );
}
