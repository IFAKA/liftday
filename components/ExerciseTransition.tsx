'use client';

import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface ExerciseTransitionProps {
  exerciseName: string;
  onComplete: () => void;
}

export function ExerciseTransition({ exerciseName, onComplete }: ExerciseTransitionProps) {
  useEffect(() => {
    const timeout = setTimeout(onComplete, 2000);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div
      className="flex flex-col items-center justify-center h-[100dvh] bg-background p-6 gap-6 cursor-pointer select-none overflow-hidden"
      onClick={onComplete}
    >
      <ArrowRight
        className="w-8 h-8 text-muted-foreground"
        style={{ animation: 'slide-down-in 260ms ease-out backwards' }}
      />
      <p
        className="text-xs uppercase tracking-widest text-muted-foreground"
        style={{ animation: 'stagger-in 260ms ease-out 80ms backwards' }}
      >
        Next up
      </p>
      <h1
        className="text-2xl font-bold tracking-tight text-center"
        style={{ animation: 'slide-up-in 260ms ease-out 160ms backwards' }}
      >
        {exerciseName}
      </h1>
      <p
        className="text-xs text-muted-foreground/40 mt-2"
        style={{ animation: 'stagger-in 260ms ease-out 280ms backwards' }}
      >
        Tap to continue
      </p>
    </div>
  );
}
