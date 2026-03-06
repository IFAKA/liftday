'use client';

import { useState } from 'react';
import { Dumbbell, TrendingUp, Calendar } from 'lucide-react';
import { Button } from './ui/button';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Dumbbell,
      title: 'LiftDay',
      description: [
        '6-day PPL split',
        'Bodyweight & TRX',
        '30-40 min sessions',
      ],
      action: 'Next',
    },
    {
      icon: TrendingUp,
      title: 'Progressive',
      description: [
        '6-20 rep range',
        'Weeks 1-4: 2 sets',
        'Weeks 5+: 3 sets',
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between p-safe">
      <div className="w-full flex justify-end p-4 shrink-0">
        <button
          onClick={onComplete}
          className="text-[10px] text-white/50 uppercase font-bold tracking-widest px-4 py-2"
          aria-label="Skip onboarding"
        >
          SKIP
        </button>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 px-6 w-full max-w-sm">
        <Icon
          key={`icon-${step}`}
          className="w-24 h-24 sm:w-32 sm:h-32 text-white mb-8"
          style={{ animation: 'bounce-in 400ms ease-out backwards' }}
        />

        <div className="text-center w-full">
          <h1
            key={`title-${step}`}
            className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mb-6"
            style={{ animation: 'slide-up-in 300ms ease-out 100ms backwards' }}
          >
            {currentStep.title}
          </h1>

          <div className="flex flex-col gap-3">
            {currentStep.description.map((line, i) => (
              <p
                key={`desc-${step}-${i}`}
                className="text-sm font-bold text-white/60 text-center uppercase tracking-wider"
                style={{
                  animation: `slide-up-in 300ms ease-out ${i * 80 + 200}ms backwards`,
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-4 mb-8 shrink-0 flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-white' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="w-full h-[68px] rounded-full text-2xl font-black uppercase tracking-tight bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-lg"
        >
          {currentStep.action}
        </Button>
      </div>
    </div>
  );
}
