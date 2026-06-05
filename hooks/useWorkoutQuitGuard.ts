'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface WorkoutQuitGuardOptions {
  historyStateKey: string;
  enabled?: boolean;
  onConfirm: () => void;
  onBack?: () => boolean;
}

export function useWorkoutQuitGuard({
  historyStateKey,
  enabled = true,
  onConfirm,
  onBack,
}: WorkoutQuitGuardOptions) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const showQuitConfirmRef = useRef(showQuitConfirm);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    showQuitConfirmRef.current = showQuitConfirm;
  }, [showQuitConfirm]);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const requestQuit = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  const confirmQuit = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  useEffect(() => {
    if (!enabled) return;

    const handlePopState = () => {
      if (onBackRef.current?.()) {
        window.history.pushState({ [historyStateKey]: true }, '');
        return;
      }

      if (showQuitConfirmRef.current) {
        setShowQuitConfirm(false);
      } else {
        setShowQuitConfirm(true);
      }
      window.history.pushState({ [historyStateKey]: true }, '');
    };

    window.history.pushState({ [historyStateKey]: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [enabled, historyStateKey]);

  return {
    showQuitConfirm,
    setShowQuitConfirm,
    requestQuit,
    confirmQuit,
  };
}
