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
      className="flex flex-col items-center justify-between w-full h-full bg-black p-2 overflow-hidden relative"
      onClick={onComplete}
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full px-2 text-center min-h-0">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 mb-1">Next Up</p>
        <h1 className="text-2xl font-black tracking-tight text-white leading-tight uppercase line-clamp-2">
          {exerciseName}
        </h1>
      </div>

      <div className="w-full shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={onComplete}
          className="w-full btn-fluid rounded-full bg-white/10 text-white active:scale-95 transition-all font-black uppercase tracking-widest border border-white/5"
        >
          <Play className="w-4 h-4 mr-2 fill-current" />
          Start
        </Button>
      </div>
    </div>
  );
}
