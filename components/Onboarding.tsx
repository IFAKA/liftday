'use client';

import { useState } from 'react';
import { Activity, BarChart3, CheckCircle2, History, X } from 'lucide-react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';
import { WatchBackButton, WatchPanel, WatchPrimaryAction, WatchScreen, WatchSection, WatchStatusPill } from './WatchSurface';

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
      bodyClassName="px-3 pb-5"
      footerClassName="mb-4"
      top={(
        <TopBar
          center={<span className="text-fluid-label font-black uppercase tracking-tight text-white/45">Setup</span>}
          leftAction={
            step > 0 ? (
              <WatchBackButton
                onClick={handleBack}
                aria-label="Previous step"
              />
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
          <WatchPrimaryAction
            onClick={handleNext}
          >
            {currentStep.action}
          </WatchPrimaryAction>
        </>
      )}
    >
      <WatchSection className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <WatchStatusPill tone="neutral">Step {step + 1} / {steps.length}</WatchStatusPill>
          <div className="flex gap-1" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((_, index) => <span key={index} className={`h-1.5 rounded-full ${index === step ? 'w-6 bg-white' : 'w-1.5 bg-white/20'}`} />)}
          </div>
        </div>

        <WatchPanel active className="min-h-[19rem]">
          <div className="mb-4 flex items-center gap-2">
            <Icon className="size-5 text-white/55" />
            <span className="text-fluid-label font-mono uppercase tracking-widest text-white/45">{currentStep.label}</span>
          </div>
          <h1 className="max-w-[19rem] text-fluid-heading font-black leading-tight tracking-tight text-white">{currentStep.title}</h1>
          <div className="mt-3 flex flex-col gap-1">
            {currentStep.description.map((line) => <p key={line} className="text-fluid-label leading-relaxed text-white/55">{line}</p>)}
          </div>
          <div className="mt-5 flex flex-col gap-2">
            {currentStep.checklist.map((item) => (
              <div key={item} className="flex min-h-10 items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 text-fluid-label font-bold text-white/70">
                <CheckCircle2 className="size-4 text-white/40" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </WatchPanel>

        <div className="flex items-center gap-2 px-1 text-fluid-label text-white/35">
          <History className="size-4" />
          <span>Settings can be changed later.</span>
        </div>
      </WatchSection>
    </WatchScreen>
  );
}
