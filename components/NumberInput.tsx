'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from './ui/button';

interface NumberInputProps {
  defaultValue: number;
  min?: number;
  max: number;
  label: string;
  onChange?: (value: number) => void;
}

export function NumberInput({
  defaultValue,
  min = 0,
  max,
  label,
  onChange,
}: NumberInputProps) {
  const [value, setValue] = useState(() => Math.min(Math.max(defaultValue, min), max));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vibrate to provide tactile feedback like a crown would
  const hapticTick = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(2); // Short, subtle vibration
    }
  }, []);

  const updateValue = useCallback(
    (delta: number) => {
      setValue((current) => {
        const next = Math.min(Math.max(current + delta, min), max);
        if (next !== current) {
          hapticTick();
          if (onChange) onChange(next);
        }
        return next;
      });
    },
    [max, min, onChange, hapticTick]
  );

  const startAdjust = useCallback(
    (delta: number) => {
      // Immediate single tick
      updateValue(delta);
      
      // Clear any existing timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Start rapid update after a short delay (long press)
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          updateValue(delta);
        }, 80); // Slightly slower for better control on tiny screen
      }, 400); // 400ms delay to consider it a "hold"
    },
    [updateValue]
  );

  const stopAdjust = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return stopAdjust;
  }, [stopAdjust]);

  return (
    <div className="flex flex-col items-center justify-center w-full flex-1 relative min-h-0">
      {/* Massive number in center */}
      <div className="flex items-center justify-center pointer-events-none z-10 -mt-4">
        <span className="font-mono font-black text-fluid-timer tracking-tighter tabular-nums leading-none">
          {value}
        </span>
      </div>
      
      {/* Label under number */}
      <span className="text-fluid-label uppercase tracking-widest text-white/40 font-mono -mt-2 z-10">
        {label}
      </span>

      {/* Split touch zones (Left = Minus, Right = Plus) */}
      <div className="absolute inset-0 flex z-20">
        <Button
          variant="ghost"
          className="flex-1 h-full justify-start pl-2 rounded-none active:bg-white/5 group"
          onPointerDown={(e) => { e.preventDefault(); startAdjust(-1); }}
          onPointerUp={stopAdjust}
          onPointerCancel={stopAdjust}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Decrease"
        >
          <Minus className="icon-lg text-white opacity-20 group-active:opacity-100 transition-opacity" />
        </Button>

        <Button
          variant="ghost"
          className="flex-1 h-full justify-end pr-2 rounded-none active:bg-white/5 group"
          onPointerDown={(e) => { e.preventDefault(); startAdjust(1); }}
          onPointerUp={stopAdjust}
          onPointerCancel={stopAdjust}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Increase"
        >
          <Plus className="icon-lg text-white opacity-20 group-active:opacity-100 transition-opacity" />
        </Button>
      </div>
    </div>
  );
}
