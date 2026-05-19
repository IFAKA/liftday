'use client';

import { useState } from 'react';
import { Dumbbell, TrendingUp, Calendar, X, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const steps = [
    {
      icon: Dumbbell,
      title: 'LiftDay',
      description: [
        '6-day PPL split',
        'Gym-first routine',
        'Up to 105 min sessions',
      ],
      action: 'Next',
    },
    {
      icon: TrendingUp,
      title: 'Progressive',
      description: [
        '6-20 rep range',
        '3 hard sets',
        'SMV efficient frontier',
      ],
      action: 'Next',
    },
    {
      icon: Calendar,
      title: 'Schedule',
      description: [
        'Mon-Sat: PPL',
        'Sun: Rest/Mobility',
        'Add to Home Screen',
      ],
      action: 'Start',
    },
  ];

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
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center overflow-hidden">
      <TopBar
        leftAction={
          step > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="-ml-2 text-white/40 hover:text-white hover:bg-transparent active:text-white"
              aria-label="Previous step"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : null
        }
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            onClick={onComplete}
            className="-mr-2 text-white/40 hover:text-white hover:bg-transparent active:text-white"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </Button>
        }
      />

      <div className="flex-1 flex flex-col items-center justify-center px-4 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{
              opacity: 0,
              transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
            }}
            animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
            exit={{
              opacity: 0,
              transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
            }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col items-center text-center w-full"
          >
            <div className="mb-2">
              <Icon className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-fluid-ui font-black uppercase tracking-tight text-white mb-1 leading-none">
              {currentStep.title}
            </h1>

            <div className="flex flex-col gap-0.5">
              {currentStep.description.map((line, i) => (
                <p
                  key={i}
                  className="text-fluid-label font-bold text-white/40 uppercase tracking-widest"
                >
                  {line}
                </p>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full px-4 pb-safe mb-4 shrink-0 flex flex-col items-center gap-3">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 rounded-full transition-[width,background-color] duration-180 ease-[var(--ease-out-ui)] ${
                i === step ? 'w-3 bg-white' : 'w-0.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-transform duration-150 ease-[var(--ease-out-ui)] shadow-xl"
        >
          {currentStep.action}
        </Button>
      </div>
    </div>
  );
}
