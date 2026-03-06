'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';

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
        }, 50); // Fast increment once held
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
    <div className="relative flex flex-col items-center justify-center w-full flex-1 touch-none">
      {/* Small top label */}
      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground/60 mb-2 sm:mb-8 font-mono absolute top-2 sm:top-4 z-10 pointer-events-none">
        {label}
      </span>

      {/* Massive number in center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span className="font-mono font-black text-[80px] sm:text-[140px] tracking-tighter tabular-nums leading-none">
          {value}
        </span>
      </div>

      {/* Split touch zones (Left = Minus, Right = Plus) */}
      <div className="absolute inset-0 flex z-20">
        <button
          className="flex-1 h-full flex items-center justify-start pl-4 sm:pl-8 active:bg-white/5 transition-colors group"
          onPointerDown={(e) => {
            e.preventDefault();
            startAdjust(-1);
          }}
          onPointerUp={stopAdjust}
          onPointerCancel={stopAdjust}
          onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
          aria-label="Decrease"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center opacity-20 group-active:opacity-100 transition-opacity">
            <Minus className="w-12 h-12 text-white" />
          </div>
        </button>

        <button
          className="flex-1 h-full flex items-center justify-end pr-4 sm:pr-8 active:bg-white/5 transition-colors group"
          onPointerDown={(e) => {
            e.preventDefault();
            startAdjust(1);
          }}
          onPointerUp={stopAdjust}
          onPointerCancel={stopAdjust}
          onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
          aria-label="Increase"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center opacity-20 group-active:opacity-100 transition-opacity">
            <Plus className="w-12 h-12 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
}
