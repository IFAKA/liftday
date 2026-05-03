'use client';

type TracePayload = Record<string, unknown>;

export interface LiftDayTraceEntry {
  id: number;
  at: string;
  event: string;
  payload?: TracePayload;
}

interface LiftDayTraceApi {
  dump: () => LiftDayTraceEntry[];
  text: () => string;
  clear: () => void;
}

declare global {
  interface Window {
    __liftdayTrace?: LiftDayTraceApi;
  }
}

const MAX_TRACE_ENTRIES = 300;
const traceEntries: LiftDayTraceEntry[] = [];
let nextTraceId = 1;

function shouldLogToConsole(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem('liftday_debug_trace') === '1';
  } catch {
    return false;
  }
}

function ensureTraceApi(): void {
  if (typeof window === 'undefined' || window.__liftdayTrace) return;

  window.__liftdayTrace = {
    dump: () => [...traceEntries],
    text: () => JSON.stringify(traceEntries, null, 2),
    clear: () => {
      traceEntries.length = 0;
      nextTraceId = 1;
    },
  };
}

export function traceLiftDay(event: string, payload?: TracePayload): void {
  if (typeof window === 'undefined') return;

  ensureTraceApi();

  const entry: LiftDayTraceEntry = {
    id: nextTraceId,
    at: new Date().toISOString(),
    event,
    payload,
  };
  nextTraceId += 1;

  traceEntries.push(entry);
  if (traceEntries.length > MAX_TRACE_ENTRIES) {
    traceEntries.shift();
  }

  if (shouldLogToConsole()) {
    console.debug('[LiftDay trace]', entry);
  }
}
