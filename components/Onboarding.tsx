'use client';

import { useState } from 'react';
import { Activity, BarChart3, CheckCircle2, ChevronLeft, History, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';
import { WatchScreen } from './WatchSurface';

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
    <WatchScreen
      scrollable={false}
      bodyClassName="flex flex-col justify-center overflow-hidden px-4 pb-4"
      footerClassName="mb-3 flex flex-col gap-3"
      top={(
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
      )}
      footer={(
        <>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-[width,background-color] duration-180 ease-[var(--ease-out-ui)] ${
                    i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <span className="text-fluid-label font-mono tabular-nums text-white/35">
              {step + 1}/{steps.length}
            </span>
          </div>

          <Button
            onClick={handleNext}
            className="h-12 w-full rounded-xl bg-white text-fluid-label font-black uppercase tracking-widest text-black hover:bg-white/90 active:scale-[0.98]"
          >
            {currentStep.action}
          </Button>
        </>
      )}
    >
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
            className="w-full py-3"
          >
            <div className="mb-3 flex items-center gap-2">
              <Icon className="size-4 text-white/45" />
              <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">
                {currentStep.label}
              </span>
            </div>

            <h1 className="max-w-[19rem] text-fluid-heading font-black leading-tight tracking-tight text-white">
              {currentStep.title}
            </h1>

            <div className="mt-3 flex max-w-[20rem] flex-col gap-1">
              {currentStep.description.map((line) => (
                <p key={line} className="text-fluid-label leading-relaxed text-white/50">
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-5 flex flex-col divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.03]">
              {currentStep.checklist.map((item) => (
                <div
                  key={item}
                  className="flex min-h-11 items-center gap-3 px-3 text-fluid-label font-bold text-white/70 first:rounded-t-xl last:rounded-b-xl"
                >
                  <CheckCircle2 className="size-4 text-white/35" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
      </AnimatePresence>
      <div className="mt-3 flex items-center justify-center gap-2 text-fluid-label text-white/30">
        <History className="size-3.5" />
        <span>Settings can be changed later.</span>
      </div>
    </WatchScreen>
  );
}
