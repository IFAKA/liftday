import { WorkoutData, ExerciseKey, VTaperPriority, UserProfile, TierChain } from './types';
import { getPreviousSessionDate, getSetsForWeek } from './workout-utils';

const MIN_REPS = 6;
const MAX_REPS = 20;
const START_REPS = 8;

/** Returns true for every 4th week (deload: weeks 4, 8, 12, …). */
export function isDeloadWeek(weekNumber: number): boolean {
  return weekNumber > 0 && weekNumber % 4 === 0;
}

export function getTargets(
  exerciseKey: ExerciseKey,
  weekNumber: number,
  currentDate: Date,
  data: WorkoutData
): number[] {
  const sets = getSetsForWeek(weekNumber);
  const prevDateKey = getPreviousSessionDate(currentDate, data);

  if (!prevDateKey) return Array(sets).fill(START_REPS);

  const prevReps = data[prevDateKey]?.[exerciseKey];
  if (!prevReps || prevReps.length === 0) return Array(sets).fill(START_REPS);

  const avg = Math.floor(prevReps.reduce((sum, r) => sum + r, 0) / prevReps.length);

  if (isDeloadWeek(weekNumber)) {
    return Array(sets).fill(Math.max(MIN_REPS, Math.floor(avg * 0.8)));
  }

  return Array(sets).fill(Math.min(MAX_REPS, Math.max(MIN_REPS, avg + 1)));
}

/** How many consecutive max-rep sessions are needed to advance a tier. */
export function getSessionsToAdvance(priority: VTaperPriority): number {
  switch (priority) {
    case 'critical': return 1;
    case 'high':     return 2;
    case 'support':  return 2;
    case 'indirect': return 3;
    case 'aesthetic': return 3;
  }
}

/**
 * Evaluates tier progress after a session and returns an updated UserProfile.
 * Fixed chains are skipped. Deload weeks block tier changes.
 */
export function evaluateTierProgress(
  slotId: string,
  sessionReps: number[],
  profile: UserProfile,
  chain: TierChain,
  weekNumber: number
): UserProfile {
  if (chain.fixed) return profile;
  if (isDeloadWeek(weekNumber)) return profile;

  // Push/pull cap: push support slots can't advance past pull_vertical tier
  if (chain.workoutType === 'push' && chain.priority === 'support') {
    const pullTier = profile.tiers['pull_vertical'] ?? 0;
    const currentTier = profile.tiers[slotId] ?? 0;
    if (currentTier >= pullTier) return profile;
  }

  const sessionsToAdvance = getSessionsToAdvance(chain.priority);
  const currentTier = profile.tiers[slotId] ?? 0;
  const maxTier = chain.exercises.length - 1;

  const existing = profile.tierProgress[slotId];
  let consecutiveMaxSessions = existing?.consecutiveMaxSessions ?? 0;
  let consecutiveMinSessions = existing?.consecutiveMinSessions ?? 0;

  const allMax = sessionReps.length > 0 && sessionReps.every((r) => r >= MAX_REPS);
  const anyMin = sessionReps.some((r) => r < MIN_REPS);

  if (allMax) {
    consecutiveMaxSessions++;
    consecutiveMinSessions = 0;
  } else if (anyMin) {
    consecutiveMinSessions++;
    consecutiveMaxSessions = 0;
  } else {
    consecutiveMaxSessions = 0;
    consecutiveMinSessions = 0;
  }

  const newTiers = { ...profile.tiers };

  if (consecutiveMaxSessions >= sessionsToAdvance && currentTier < maxTier) {
    newTiers[slotId] = currentTier + 1;
    consecutiveMaxSessions = 0;
  }

  if (consecutiveMinSessions >= 2 && currentTier > 0) {
    newTiers[slotId] = (newTiers[slotId] ?? currentTier) - 1;
    consecutiveMinSessions = 0;
  }

  return {
    ...profile,
    tiers: newTiers,
    tierProgress: {
      ...profile.tierProgress,
      [slotId]: { slotId, consecutiveMaxSessions, consecutiveMinSessions },
    },
  };
}

export function shouldIncreaseDifficulty(exerciseKey: ExerciseKey, data: WorkoutData): boolean {
  for (const d of Object.keys(data).sort().reverse()) {
    const reps = data[d]?.[exerciseKey];
    if (reps && reps.length > 0) return reps.every((r) => r >= MAX_REPS);
  }
  return false;
}
