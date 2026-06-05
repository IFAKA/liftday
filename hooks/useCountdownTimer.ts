'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CountdownTimerOptions {
  initialSeconds: number;
  autoStart?: boolean;
  onComplete?: () => void;
}

export function useCountdownTimer({
  initialSeconds,
  autoStart = true,
  onComplete,
}: CountdownTimerOptions) {
  const [duration, setDurationState] = useState(initialSeconds);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart && initialSeconds > 0);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(initialSeconds <= 0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning || seconds <= 0) return;

    const timer = window.setInterval(() => {
      setSeconds((currentSeconds) => {
        const nextSeconds = Math.max(0, currentSeconds - 1);
        if (nextSeconds === 0 && !completedRef.current) {
          completedRef.current = true;
          window.setTimeout(() => {
            setIsRunning(false);
            onCompleteRef.current?.();
          }, 0);
        }
        return nextSeconds;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, seconds]);

  const start = useCallback(() => {
    if (seconds <= 0) return;
    completedRef.current = false;
    setIsRunning(true);
  }, [seconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    completedRef.current = duration <= 0;
    setIsRunning(autoStart && duration > 0);
    setSeconds(duration);
  }, [autoStart, duration]);

  const repeat = useCallback(() => {
    completedRef.current = duration <= 0;
    setSeconds(duration);
    setIsRunning(duration > 0);
  }, [duration]);

  const setDuration = useCallback((nextDuration: number) => {
    const clampedDuration = Math.max(0, nextDuration);
    setDurationState(clampedDuration);
    setSeconds(clampedDuration);
    setIsRunning(autoStart && clampedDuration > 0);
    completedRef.current = clampedDuration <= 0;
  }, [autoStart]);

  return {
    seconds,
    isRunning,
    start,
    repeat,
    pause,
    reset,
    setDuration,
  };
}
