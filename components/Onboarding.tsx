'use client';

import { useState } from 'react';
import { Dumbbell, TrendingUp, Calendar, X } from 'lucide-react';
import { Button } from './ui/button';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Dumbbell,
      title: 'Welcome to LiftDay',
      description: [
        '6-day Push/Pull/Legs split',
        '12 exercises, bodyweight + TRX',
        'Takes 30-40 minutes per session',
      ],
      action: 'Next',
    },
    {
      icon: TrendingUp,
      title: 'Progressive Overload',
      description: [
        '6-20 rep hypertrophy range',
        'Week 1-4: 2 sets per exercise',
        'Week 5+: 3 sets per exercise',
      ],
      action: 'Next',
    },
    {
      icon: Calendar,
      title: 'Training Schedule',
      description: [
        'Mon-Sat: Push, Pull, Legs (repeat)',
        'Sunday: Rest + Mobility work (optional)',
        'Install as PWA for the best experience',
      ],
      action: 'Get Started',
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
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6">
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors"
        aria-label="Skip onboarding"
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="flex flex-col items-center gap-8 max-w-md">
        <Icon
          className="w-16 h-16"
          style={{ animation: 'bounce-in 600ms ease-out backwards' }}
        />

        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">{currentStep.title}</h1>

          <div className="space-y-2">
            {currentStep.description.map((line, i) => (
              <p
                key={i}
                className="text-sm text-muted-foreground"
                style={{
                  animation: `stagger-in 400ms ease-out ${i * 100 + 200}ms backwards`,
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-primary' : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        <Button
          size="lg"
          onClick={handleNext}
          className="w-full max-w-xs rounded-full"
        >
          {currentStep.action}
        </Button>
      </div>
    </div>
  );
}
