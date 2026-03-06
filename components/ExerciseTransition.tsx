'use client';

import { useEffect } from 'react';
import { Play } from 'lucide-react';
import { Button } from './ui/button';

interface ExerciseTransitionProps {
  exerciseName: string;
  onComplete: () => void;
}

export function ExerciseTransition({ exerciseName, onComplete }: ExerciseTransitionProps) {
  useEffect(() => {
    const timeout = setTimeout(onComplete, 2500);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div
      className="flex flex-col items-center justify-center h-[100dvh] bg-black p-safe cursor-pointer select-none overflow-hidden relative"
      onClick={onComplete}
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 text-center">
        <p
          className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold text-white/50 mb-2 sm:mb-4"
          style={{ animation: 'stagger-in 260ms ease-out 80ms backwards' }}
        >
          Next Up
        </p>
        <h1
          className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none uppercase"
          style={{ animation: 'slide-up-in 260ms ease-out 160ms backwards' }}
        >
          {exerciseName}
        </h1>
      </div>

      <div className="w-full absolute bottom-4 sm:bottom-8 px-4 z-10" style={{ animation: 'slide-up-in 260ms ease-out 240ms backwards' }}>
        <Button
          onClick={onComplete}
          className="w-full h-[54px] sm:h-[68px] rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all text-sm font-bold uppercase tracking-widest border border-white/5"
        >
          <Play className="w-4 h-4 mr-2 fill-current" />
          Start
        </Button>
      </div>
    </div>
  );
}
