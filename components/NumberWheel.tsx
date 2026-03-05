'use client';

import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

const ITEM_H = 60;
const VISIBLE = 5;
const CENTER = Math.floor(VISIBLE / 2); // 2

// Responsive constants
const RESPONSIVE_CONFIG = {
  smartwatch: { itemHeight: 40, visible: 3, width: 80, centerFontSize: 28, nearFontSize: 16, farFontSize: 12 },
  mobile: { itemHeight: 60, visible: 5, width: 120, centerFontSize: 42, nearFontSize: 26, farFontSize: 18 },
  desktop: { itemHeight: 70, visible: 5, width: 140, centerFontSize: 48, nearFontSize: 30, farFontSize: 20 }
};

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try { _audioCtx = new Ctor(); } catch { return null; }
  }
  return _audioCtx;
}

function playTick() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.025);
    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.030);
    osc.start(t);
    osc.stop(t + 0.030);
  } catch { /* silently ignore if audio not available */ }
}

interface NumberWheelProps {
  defaultValue: number;
  min?: number;
  max: number;
  label: string;
  onConfirm: (value: number) => void;
  onChange?: (value: number) => void;
  hideButton?: boolean;
}

export function NumberWheel({ 
  defaultValue, 
  min = 0, 
  max, 
  label, 
  onConfirm,
  onChange,
  hideButton = false
}: NumberWheelProps) {
  const init = Math.min(Math.max(defaultValue, min), max);

  const [float, setFloat] = useState(init);
  const floatRef = useRef(init);
  const lastTickInt = useRef(init);

  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const startY = useRef(0);
  const startFloat = useRef(0);
  const velY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const raf = useRef<number>(0);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const editStartVal = useRef(init);
  const editDone = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Responsive configuration
  const [config, setConfig] = useState(RESPONSIVE_CONFIG.mobile);
  
  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;
      if (width <= 320) {
        setConfig(RESPONSIVE_CONFIG.smartwatch);
      } else if (width >= 1024) {
        setConfig(RESPONSIVE_CONFIG.desktop);
      } else {
        setConfig(RESPONSIVE_CONFIG.mobile);
      }
    };
    
    updateConfig();
    window.addEventListener('resize', updateConfig);
    return () => window.removeEventListener('resize', updateConfig);
  }, []);

  const { itemHeight, visible, width: wheelWidth, centerFontSize, nearFontSize, farFontSize } = config;
  const center = Math.floor(visible / 2);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  function applyFloat(fv: number) {
    floatRef.current = fv;
    setFloat(fv);
    const intNow = Math.round(fv);
    if (intNow !== lastTickInt.current) {
      lastTickInt.current = intNow;
      playTick();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(2);
      onChange?.(intNow);
    }
  }

  function easeToInt(from: number, target: number) {
    const dist = Math.abs(target - from);
    if (dist < 0.001) { applyFloat(target); return; }
    const duration = Math.min(380, Math.max(80, dist * 55));
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      applyFloat(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (editing) return;
    cancelAnimationFrame(raf.current);
    dragging.current = true;
    hasMoved.current = false;
    startY.current = e.clientY;
    startFloat.current = floatRef.current;
    lastY.current = e.clientY;
    lastT.current = Date.now();
    velY.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > 4) hasMoved.current = true;
    applyFloat(clamp(startFloat.current - dy / itemHeight));
    const now = Date.now();
    const dt = now - lastT.current;
    if (dt > 0) velY.current = (e.clientY - lastY.current) / dt;
    lastY.current = e.clientY;
    lastT.current = now;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging.current) return;
    dragging.current = false;

    if (!hasMoved.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y >= center * itemHeight && y < (center + 1) * itemHeight) {
        const cur = clamp(Math.round(floatRef.current));
        editDone.current = false;
        editStartVal.current = cur;
        setEditText(String(cur));
        setEditing(true);
        return;
      }
    }

    const vel = velY.current;

    if (Math.abs(vel) < 0.06) {
      easeToInt(floatRef.current, clamp(Math.round(floatRef.current)));
      return;
    }

    let v = vel;
    const decay = () => {
      v *= 0.88;
      const next = clamp(floatRef.current - v * 16 / itemHeight);
      applyFloat(next);
      if (Math.abs(v) > 0.06) {
        raf.current = requestAnimationFrame(decay);
      } else {
        easeToInt(floatRef.current, clamp(Math.round(floatRef.current)));
      }
    };
    raf.current = requestAnimationFrame(decay);
  }

  function finishEdit(text: string) {
    if (editDone.current) return;
    editDone.current = true;
    const n = parseInt(text, 10);
    const target = !isNaN(n) && text.trim() !== '' ? clamp(n) : editStartVal.current;
    lastTickInt.current = target;
    floatRef.current = target;
    setFloat(target);
    setEditing(false);
    onChange?.(target);
  }

  function cancelEdit() {
    if (editDone.current) return;
    editDone.current = true;
    const v = editStartVal.current;
    lastTickInt.current = v;
    floatRef.current = v;
    setFloat(v);
    setEditing(false);
  }

  const translateY = center * itemHeight - (float - min) * itemHeight;
  const centerInt = clamp(Math.round(float));
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      <span className="text-[8px] uppercase tracking-widest text-muted-foreground sm:text-[10px]">{label}</span>

      <div
        ref={containerRef}
        className="relative overflow-hidden select-none touch-none cursor-ns-resize"
        style={{ height: visible * itemHeight, width: wheelWidth }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute inset-x-0 z-10 pointer-events-none border-t border-b border-foreground/25"
          style={{ top: center * itemHeight, height: itemHeight }}
        />

        <div
          className="absolute w-full will-change-transform"
          style={{ transform: `translateY(${translateY}px)` }}
        >
          {numbers.map((n) => {
            const dist = Math.abs(n - float);
            const distInt = Math.abs(n - centerInt);
            const isCenter = distInt === 0;
            return (
              <div
                key={n}
                className="flex items-center justify-center font-mono font-bold"
                style={{
                  height: itemHeight,
                  fontSize: isCenter ? centerFontSize : distInt === 1 ? nearFontSize : farFontSize,
                  opacity: editing && isCenter ? 0 : Math.max(0.04, 1 - dist * 0.55),
                }}
              >
                {n}
              </div>
            );
          })}
        </div>

        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none z-20 sm:h-20" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none z-20 sm:h-20" />

        {editing && (
          <div
            className="absolute inset-x-0 z-30 flex items-center justify-center"
            style={{ top: center * itemHeight, height: itemHeight }}
          >
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => cancelEdit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); finishEdit(editText); }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
              }}
              className="w-full text-center font-mono font-bold bg-transparent border-none outline-none text-foreground caret-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ fontSize: centerFontSize }}
            />
          </div>
        )}
      </div>

      {!hideButton && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (editing) finishEdit(editText);
            else onConfirm(clamp(Math.round(floatRef.current)));
          }}
          className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center active:scale-95 transition-transform shadow-md sm:w-12 sm:h-12 lg:w-14 lg:h-14"
        >
          <Check className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
        </button>
      )}
    </div>
  );
}
