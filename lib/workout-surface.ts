import type { WorkoutPhase } from './types';

export const WORKOUT_SURFACE_SCHEMA_VERSION = 1 as const;
export const WORKOUT_SURFACE_ORIGIN = 'https://liftday.vercel.app' as const;
export type WorkoutSurfaceAction = 'done' | 'busy' | 'log' | 'skip-rest' | 'repeat' | 'end';
export type WorkoutSurfaceSnapshot = {
  schemaVersion: 1;
  phase: WorkoutPhase;
  exerciseName: string | null;
  recommendedWeight: number | null;
  recommendedReps: number | null;
  restSeconds: number | null;
  plankSeconds: number | null;
  cooldownSeconds: number | null;
  availableActions: WorkoutSurfaceAction[];
  revision: number;
  updatedAt: string;
};
export type NativeActionMessage = { type: 'liftday.action'; schemaVersion: 1; eventId: string; action: WorkoutSurfaceAction };
export type SnapshotMessage = { type: 'liftday.snapshot'; schemaVersion: 1; snapshot: WorkoutSurfaceSnapshot };
export type ActionAckMessage = { type: 'liftday.action-ack'; schemaVersion: 1; eventId: string; status: 'applied' | 'ignored' | 'failed'; reason?: string };
export type NativeReadyMessage = { type: 'liftday.native-ready'; schemaVersion: 1 };

const ACTIONS = new Set<WorkoutSurfaceAction>(['done', 'busy', 'log', 'skip-rest', 'repeat', 'end']);
const PHASES = new Set<WorkoutPhase>(['warmup-stretch', 'warmup-plank', 'exercise-ready', 'resting', 'cooldown-stretch', 'cooldown-choice', 'complete']);

export function createWorkoutSurfaceSnapshot(input: Omit<WorkoutSurfaceSnapshot, 'schemaVersion' | 'revision' | 'updatedAt'> & { revision?: number; updatedAt?: string }): WorkoutSurfaceSnapshot {
  return { ...input, schemaVersion: 1, revision: input.revision ?? 0, updatedAt: input.updatedAt ?? new Date().toISOString() };
}
export function nextWorkoutSurfaceRevision(previous: number): number { return Math.max(0, Math.floor(previous)) + 1; }
export function getAvailableActions(phase: WorkoutPhase): WorkoutSurfaceAction[] {
  switch (phase) {
    case 'warmup-stretch': return ['done'];
    case 'exercise-ready': return ['busy', 'log'];
    case 'resting': return ['skip-rest'];
    case 'cooldown-choice': return ['repeat', 'end'];
    default: return [];
  }
}
export function isWorkoutSurfaceSnapshot(value: unknown): value is WorkoutSurfaceSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkoutSurfaceSnapshot>;
  return candidate.schemaVersion === 1 && typeof candidate.revision === 'number' && PHASES.has(candidate.phase as WorkoutPhase)
    && Array.isArray(candidate.availableActions) && candidate.availableActions.every((action) => ACTIONS.has(action as WorkoutSurfaceAction))
    && (candidate.exerciseName === null || typeof candidate.exerciseName === 'string') && typeof candidate.updatedAt === 'string';
}
export function parseNativeAction(value: unknown): NativeActionMessage | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<NativeActionMessage>;
  if (candidate.type !== 'liftday.action' || candidate.schemaVersion !== 1 || typeof candidate.eventId !== 'string'
    || candidate.eventId.length < 1 || candidate.eventId.length > 128 || !ACTIONS.has(candidate.action as WorkoutSurfaceAction)) return null;
  return candidate as NativeActionMessage;
}
export function isActionAllowed(snapshot: WorkoutSurfaceSnapshot, action: WorkoutSurfaceAction): boolean { return snapshot.availableActions.includes(action); }
