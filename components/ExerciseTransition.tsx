'use client';

import { useEffect } from 'react';
import { WatchActionFooter, WorkoutFlowScreen } from './WatchSurface';

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
    <WorkoutFlowScreen
      className="p-2"
      bodyClassName="px-2 text-center"
      footer={(
        <div onClick={(event) => event.stopPropagation()}>
          <WatchActionFooter
            primary={{ label: 'Start', onClick: onComplete, tone: 'secondary' }}
          />
        </div>
      )}
      onClick={onComplete}
    >
        <p className="text-fluid-label uppercase tracking-[0.2em] font-bold text-white/40 mb-1">Next Up</p>
        <h1 className="text-fluid-exercise font-black tracking-tight text-white leading-tight uppercase line-clamp-2">
          {exerciseName}
        </h1>
    </WorkoutFlowScreen>
  );
}
