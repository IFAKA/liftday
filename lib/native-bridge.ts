'use client';

import {
  isActionAllowed,
  parseNativeAction,
  WORKOUT_SURFACE_ORIGIN,
  type ActionAckMessage,
  type NativeActionMessage,
  type WorkoutSurfaceAction,
  type WorkoutSurfaceSnapshot,
} from './workout-surface';

const PROCESSED_ACTIONS_KEY = 'liftday_native_processed_actions';
const MAX_PROCESSED_ACTIONS = 64;

export type NativeWorkoutCallbacks = {
  startPlank: () => void;
  busy: () => void;
  log: (reps: number, weight: number | undefined) => void;
  skipRest: () => void;
  repeatCooldown: () => void;
  end: () => void;
};

function send(message: unknown): void {
  if (typeof window === 'undefined') return;
  window.postMessage(JSON.stringify(message), WORKOUT_SURFACE_ORIGIN);
}

function readProcessed(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(PROCESSED_ACTIONS_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(-MAX_PROCESSED_ACTIONS) : [];
  } catch { return []; }
}

function remember(eventId: string): void {
  const next = [...readProcessed().filter((item) => item !== eventId), eventId].slice(-MAX_PROCESSED_ACTIONS);
  localStorage.setItem(PROCESSED_ACTIONS_KEY, JSON.stringify(next));
}

function acknowledge(eventId: string, status: ActionAckMessage['status'], reason?: string): void {
  send({ type: 'liftday.action-ack', schemaVersion: 1, eventId, status, ...(reason ? { reason } : {}) });
}

export function publishWorkoutSnapshot(snapshot: WorkoutSurfaceSnapshot): void {
  send({ type: 'liftday.snapshot', schemaVersion: 1, snapshot });
}

export function installNativeWorkoutBridge(snapshot: WorkoutSurfaceSnapshot, callbacks: NativeWorkoutCallbacks): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== WORKOUT_SURFACE_ORIGIN) return;
    let value: unknown = event.data;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { return; }
    }
    if (!value || typeof value !== 'object' || (value as { type?: string }).type !== 'liftday.action') return;
    const action = parseNativeAction(value);
    if (!action) return;
    if (readProcessed().includes(action.eventId)) {
      acknowledge(action.eventId, 'ignored', 'duplicate event');
      return;
    }
    if (!isActionAllowed(snapshot, action.action)) {
      acknowledge(action.eventId, 'failed', `Action ${action.action} is not valid in ${snapshot.phase}`);
      return;
    }
    try {
      dispatchAction(action, snapshot, callbacks);
      remember(action.eventId);
      acknowledge(action.eventId, 'applied');
    } catch (error) {
      acknowledge(action.eventId, 'failed', error instanceof Error ? error.message : 'Action failed');
    }
  };
  window.addEventListener('message', handleMessage);
  publishWorkoutSnapshot(snapshot);
  send({ type: 'liftday.native-ready', schemaVersion: 1 });
  return () => window.removeEventListener('message', handleMessage);
}

function dispatchAction(action: NativeActionMessage, snapshot: WorkoutSurfaceSnapshot, callbacks: NativeWorkoutCallbacks): void {
  const actionHandlers: Record<WorkoutSurfaceAction, () => void> = {
    done: callbacks.startPlank,
    busy: callbacks.busy,
    log: () => callbacks.log(snapshot.recommendedReps ?? 0, snapshot.recommendedWeight ?? undefined),
    'skip-rest': callbacks.skipRest,
    repeat: callbacks.repeatCooldown,
    end: callbacks.end,
  };
  actionHandlers[action.action]();
}
