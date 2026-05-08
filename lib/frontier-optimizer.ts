import { EXERCISES } from './constants';
import { getRequiredEquipment } from './equipment';
import { getChainsForRoutine, getSelectedExerciseKey } from './tiers';
import { getExerciseMuscleContribution, scoreWeeklyVolume, RoutineScoreResult, MUSCLE_MIN_WEEKLY_SETS } from './smv';
import { scoreSessionSets } from './progress-insights';
import {
  ExerciseKey,
  MuscleGroup,
  RoutineConfig,
  SetEntry,
  TierChain,
  UserProfile,
  WorkoutData,
  WorkoutType,
} from './types';

interface FrontierCandidate {
  slotId: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  exercises: ExerciseKey[];
  priority: TierChain['priority'];
  fixed: boolean;
  cadence?: TierChain['cadence'];
  minSets: number;
  maxSets: number;
}

interface FrontierPlanSlot {
  candidate: FrontierCandidate;
  sets: number;
}

export interface FrontierOptimizerResult {
  routine: RoutineConfig;
  score: RoutineScoreResult;
  baseScore: RoutineScoreResult;
  reasons: string[];
  selectedSlots: {
    slotId: string;
    exercise: string;
    sets: number;
    cadence: string;
    priority: TierChain['priority'];
  }[];
}

const DEFAULT_SESSION_SET_CAP = 22;
const MAX_SESSION_SET_CAP = 27;
const SET_MINUTES = 3.5;

const GYM_FRONTIER_CANDIDATES: FrontierCandidate[] = [
  { slotId: 'gym_push_chest', workoutType: 'push', fixed: true, priority: 'critical', minSets: 2, maxSets: 3, exercises: ['barbell_bench_press'] },
  { slotId: 'gym_push_incline', workoutType: 'push', fixed: true, priority: 'high', minSets: 2, maxSets: 3, exercises: ['db_incline_press'] },
  { slotId: 'gym_push_overhead', workoutType: 'push', fixed: false, priority: 'high', minSets: 0, maxSets: 2, exercises: ['db_shoulder_press', 'barbell_ohp'] },
  { slotId: 'gym_push_lateral', workoutType: 'push', fixed: true, priority: 'critical', minSets: 3, maxSets: 4, exercises: ['db_lateral_raise'] },
  { slotId: 'gym_push_fly', workoutType: 'push', fixed: true, priority: 'high', cadence: 'second', minSets: 0, maxSets: 2, exercises: ['cable_fly'] },
  { slotId: 'gym_push_lateral_cable', workoutType: 'push', fixed: true, priority: 'critical', cadence: 'second', minSets: 0, maxSets: 4, exercises: ['cable_lateral_raise'] },
  { slotId: 'gym_push_tricep', workoutType: 'push', fixed: false, priority: 'high', minSets: 2, maxSets: 3, exercises: ['cable_tricep_pushdown', 'overhead_tricep_ext'] },

  { slotId: 'gym_pull_vertical', workoutType: 'pull', fixed: false, priority: 'critical', minSets: 3, maxSets: 5, exercises: ['lat_pulldown', 'pullup'] },
  { slotId: 'gym_pull_horizontal', workoutType: 'pull', fixed: false, priority: 'critical', minSets: 3, maxSets: 4, exercises: ['cable_row', 'barbell_row'] },
  { slotId: 'gym_pull_rear_delt', workoutType: 'pull', fixed: true, priority: 'critical', minSets: 2, maxSets: 3, exercises: ['cable_face_pull'] },
  { slotId: 'gym_pull_lat', workoutType: 'pull', fixed: true, priority: 'high', minSets: 0, maxSets: 3, exercises: ['straight_arm_pulldown_cable'] },
  { slotId: 'gym_pull_bicep', workoutType: 'pull', fixed: false, priority: 'high', minSets: 2, maxSets: 3, exercises: ['cable_curl', 'barbell_curl'] },
  { slotId: 'gym_pull_hammer', workoutType: 'pull', fixed: true, priority: 'high', minSets: 0, maxSets: 2, exercises: ['hammer_curl'] },

  { slotId: 'gym_legs_squat', workoutType: 'legs', fixed: false, priority: 'critical', minSets: 2, maxSets: 3, exercises: ['barbell_squat', 'front_squat'] },
  { slotId: 'gym_legs_hinge', workoutType: 'legs', fixed: false, priority: 'critical', minSets: 2, maxSets: 3, exercises: ['romanian_deadlift', 'barbell_deadlift', 'sumo_deadlift'] },
  { slotId: 'gym_legs_press', workoutType: 'legs', fixed: true, priority: 'high', cadence: 'second', minSets: 0, maxSets: 3, exercises: ['leg_press'] },
  { slotId: 'gym_legs_glute', workoutType: 'legs', fixed: true, priority: 'critical', cadence: 'second', minSets: 0, maxSets: 2, exercises: ['hip_thrust'] },
  { slotId: 'gym_legs_hamstring', workoutType: 'legs', fixed: true, priority: 'high', minSets: 2, maxSets: 3, exercises: ['leg_curl_machine'] },
  { slotId: 'gym_legs_quad', workoutType: 'legs', fixed: true, priority: 'high', cadence: 'second', minSets: 0, maxSets: 2, exercises: ['leg_extension_machine'] },
  { slotId: 'gym_legs_calf', workoutType: 'legs', fixed: true, priority: 'aesthetic', minSets: 2, maxSets: 3, exercises: ['standing_calf_raise_machine'] },
  { slotId: 'gym_legs_neck_flex', workoutType: 'legs', fixed: true, priority: 'aesthetic', cadence: 'first', minSets: 0, maxSets: 2, exercises: ['neck_iso_flex'] },
  { slotId: 'gym_legs_neck_ext', workoutType: 'legs', fixed: true, priority: 'aesthetic', cadence: 'second', minSets: 0, maxSets: 2, exercises: ['neck_iso_ext'] },
];

export function optimizeRoutineForFrontier(
  routine: RoutineConfig,
  profile: UserProfile | null,
  data: WorkoutData,
  fallbackSets: number
): FrontierOptimizerResult {
  if (routine.id !== 'gym' || routine.schedule.includes('push_a')) {
    const score = scoreRoutineWithProgress(routine, data, fallbackSets);
    return {
      routine,
      score,
      baseScore: score,
      reasons: routine.schedule.includes('push_a')
        ? ['Tailored SMV routine is fixed; optimizer scores it but does not randomize slots.']
        : ['Optimizer is currently enabled for the gym routine only.'],
      selectedSlots: describeRoutineSlots(routine, fallbackSets),
    };
  }

  const sessionSetCap = getSessionSetCap(profile);
  const basePlan = GYM_FRONTIER_CANDIDATES.map((candidate) => ({
    candidate,
    sets: candidate.minSets,
  }));
  const optimizedPlan = enforceMuscleFloors(greedyOptimize(basePlan, data, profile, fallbackSets, sessionSetCap), data, profile, fallbackSets, sessionSetCap);
  const optimizedRoutine = buildRoutineFromPlan(routine, optimizedPlan, profile);
  const score = scoreRoutineWithProgress(optimizedRoutine, data, fallbackSets);
  const baseScore = scoreRoutineWithProgress(routine, data, fallbackSets);

  return {
    routine: optimizedRoutine,
    score,
    baseScore,
    reasons: getOptimizerReasons(baseScore, score, optimizedRoutine, data, fallbackSets, sessionSetCap),
    selectedSlots: describeRoutineSlots(optimizedRoutine, fallbackSets),
  };
}

function greedyOptimize(
  initialPlan: FrontierPlanSlot[],
  data: WorkoutData,
  profile: UserProfile | null,
  fallbackSets: number,
  sessionSetCap: number
): FrontierPlanSlot[] {
  let plan = initialPlan.map((slot) => ({ ...slot }));
  let currentScore = scorePlan(plan, data, profile, fallbackSets).total;

  while (true) {
    const best = plan
      .map((slot, index) => {
        if (slot.sets >= slot.candidate.maxSets) return null;
        const next = plan.map((entry, entryIndex) => (
          entryIndex === index ? { ...entry, sets: entry.sets + 1 } : { ...entry }
        ));
        if (exceedsSessionSetCap(next, sessionSetCap, profile)) return null;
        const nextScore = scorePlan(next, data, profile, fallbackSets).total;
        return { index, gain: nextScore - currentScore };
      })
      .filter((entry): entry is { index: number; gain: number } => Boolean(entry))
      .sort((a, b) => b.gain - a.gain || a.index - b.index)[0];

    if (!best || best.gain <= 0) break;
    plan = plan.map((entry, index) => (
      index === best.index ? { ...entry, sets: entry.sets + 1 } : entry
    ));
    currentScore += best.gain;
  }

  return plan;
}

function enforceMuscleFloors(
  initialPlan: FrontierPlanSlot[],
  data: WorkoutData,
  profile: UserProfile | null,
  fallbackSets: number,
  sessionSetCap: number
): FrontierPlanSlot[] {
  let plan = initialPlan.map((slot) => ({ ...slot }));
  const floors = Object.entries(MUSCLE_MIN_WEEKLY_SETS) as [MuscleGroup, number][];

  for (const [muscle, floor] of floors) {
    while ((scorePlan(plan, data, profile, fallbackSets).breakdown[muscle]?.sets ?? 0) < floor) {
      const best = plan
        .map((slot, index) => {
          if (slot.sets >= slot.candidate.maxSets) return null;
          const contribution = getPrimaryExerciseContribution(slot.candidate, profile)[muscle] ?? 0;
          if (contribution <= 0) return null;
          const next = plan.map((entry, entryIndex) => (
            entryIndex === index ? { ...entry, sets: entry.sets + 1 } : { ...entry }
          ));
          if (exceedsSessionSetCap(next, sessionSetCap, profile)) return null;
          return { index, contribution };
        })
        .filter((entry): entry is { index: number; contribution: number } => Boolean(entry))
        .sort((a, b) => b.contribution - a.contribution || a.index - b.index)[0];

      if (!best) break;
      plan = plan.map((entry, index) => (
        index === best.index ? { ...entry, sets: entry.sets + 1 } : entry
      ));
    }
  }

  return plan;
}

function scorePlan(
  plan: FrontierPlanSlot[],
  data: WorkoutData,
  profile: UserProfile | null,
  fallbackSets: number
): RoutineScoreResult {
  return scoreRoutineWithProgress(buildRoutineFromPlan(null, plan, profile), data, fallbackSets);
}

function scoreRoutineWithProgress(
  routine: RoutineConfig,
  data: WorkoutData,
  fallbackSets: number
): RoutineScoreResult {
  const volume: Partial<Record<MuscleGroup, number>> = {};
  const sessionSetCounts: number[] = [];
  let equipmentChanges = 0;
  const occurrences: Partial<Record<Exclude<WorkoutType, 'rest'>, number>> = {};

  for (const workoutType of routine.schedule) {
    const occurrenceIndex = occurrences[workoutType] ?? 0;
    occurrences[workoutType] = occurrenceIndex + 1;
    const chains = getChainsForRoutine(routine, workoutType, occurrenceIndex);
    let sessionSets = 0;
    let previousStation: string | null = null;

    for (const chain of chains) {
      const sets = chain.sets ?? fallbackSets;
      const key = getSelectedExerciseKey(chain);
      sessionSets += sets;
      const station = getStationKey(key);
      if (previousStation !== null && previousStation !== station) equipmentChanges++;
      previousStation = station;

      const multiplier = getProgressMultiplier(data, key);
      const exercise = EXERCISES.find((entry) => entry.key === key);
      if (!exercise) continue;
      const contribution = getExerciseMuscleContribution(exercise);
      for (const [muscle, muscleSets] of Object.entries(contribution) as [MuscleGroup, number][]) {
        volume[muscle] = (volume[muscle] ?? 0) + sets * muscleSets * multiplier;
      }
    }

    sessionSetCounts.push(sessionSets);
  }

  return scoreWeeklyVolume(volume, {
    totalSets: sessionSetCounts.reduce((sum, sets) => sum + sets, 0),
    setsPerExercise: fallbackSets,
    equipmentChanges,
    sessionSetCounts,
  });
}

function buildRoutineFromPlan(
  baseRoutine: RoutineConfig | null,
  plan: FrontierPlanSlot[],
  profile: UserProfile | null
): RoutineConfig {
  const base = baseRoutine ?? {
    id: 'gym',
    name: 'Gym',
    description: 'Deterministic SMV frontier gym routine.',
    icon: 'dumbbell' as const,
    schedule: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] as Exclude<WorkoutType, 'rest'>[],
    tierChains: [],
  };

  return {
    ...base,
    tierChains: plan
      .filter((slot) => slot.sets > 0)
      .map(({ candidate, sets }) => {
        const selectedExercise = selectExerciseForCandidate(candidate, profile);
        return {
          slotId: candidate.slotId,
          workoutType: candidate.workoutType,
          fixed: candidate.fixed,
          priority: candidate.priority,
          sets,
          cadence: candidate.cadence,
          selectedExercise,
          progression: candidate.exercises,
          alternatives: candidate.exercises.filter((key) => key !== selectedExercise),
          exercises: candidate.exercises,
        };
      }),
  };
}

function getProgressMultiplier(data: WorkoutData, key: ExerciseKey): number {
  const sessions = Object.entries(data)
    .filter(([, session]) => Array.isArray(session[key]) && session[key]!.length > 0)
    .sort(([a], [b]) => b.localeCompare(a));

  if (sessions.length < 2) return 1;
  const latest = scoreSessionSets(sessions[0][1][key] as SetEntry[]);
  const previous = scoreSessionSets(sessions[1][1][key] as SetEntry[]);
  if (previous <= 0) return 1;
  const ratio = latest / previous;
  if (ratio >= 1.05) return 1.06;
  if (ratio <= 0.95) return 0.92;
  return 1;
}

function getPrimaryExerciseContribution(
  candidate: FrontierCandidate,
  profile: UserProfile | null
): Partial<Record<MuscleGroup, number>> {
  const exercise = EXERCISES.find((entry) => entry.key === selectExerciseForCandidate(candidate, profile));
  return exercise ? getExerciseMuscleContribution(exercise) : {};
}

function exceedsSessionSetCap(
  plan: FrontierPlanSlot[],
  sessionSetCap: number,
  profile: UserProfile | null
): boolean {
  const routine = buildRoutineFromPlan(null, plan, profile);
  const occurrences: Partial<Record<Exclude<WorkoutType, 'rest'>, number>> = {};
  return routine.schedule.some((workoutType) => {
    const occurrenceIndex = occurrences[workoutType] ?? 0;
    occurrences[workoutType] = occurrenceIndex + 1;
    const sets = getChainsForRoutine(routine, workoutType, occurrenceIndex)
      .reduce((sum, chain) => sum + (chain.sets ?? 0), 0);
    return sets > sessionSetCap;
  });
}

function getSessionSetCap(profile: UserProfile | null): number {
  const maxWorkoutMinutes = profile?.maxWorkoutMinutes ?? 105;
  return Math.min(MAX_SESSION_SET_CAP, Math.max(16, Math.floor(maxWorkoutMinutes / SET_MINUTES), DEFAULT_SESSION_SET_CAP));
}

function getStationKey(exerciseKey: ExerciseKey): string {
  const required = getRequiredEquipment(exerciseKey).filter((entry) => entry !== 'none');
  return required.length === 0 ? 'bodyweight' : [...required].sort().join('+');
}

function selectExerciseForCandidate(candidate: FrontierCandidate, profile: UserProfile | null): ExerciseKey {
  const tier = profile?.tiers?.[candidate.slotId] ?? 0;
  const clamped = Math.max(0, Math.min(tier, candidate.exercises.length - 1));
  return candidate.exercises[clamped];
}

function describeRoutineSlots(routine: RoutineConfig, fallbackSets: number): FrontierOptimizerResult['selectedSlots'] {
  return routine.tierChains.map((chain) => ({
    slotId: chain.slotId,
    exercise: EXERCISES.find((entry) => entry.key === getSelectedExerciseKey(chain))?.name ?? getSelectedExerciseKey(chain),
    sets: chain.sets ?? fallbackSets,
    cadence: chain.cadence ?? 'both',
    priority: chain.priority,
  }));
}

function getOptimizerReasons(
  baseScore: RoutineScoreResult,
  score: RoutineScoreResult,
  routine: RoutineConfig,
  data: WorkoutData,
  fallbackSets: number,
  sessionSetCap: number
): string[] {
  const sideDelt = score.breakdown.side_delt;
  const lats = score.breakdown.lats;
  const sessions = Object.values(data).filter((session) => session.logged_at).length;
  return [
    `Optimized ${routine.tierChains.length} slots with a ${sessionSetCap}-set session cap from your max workout time.`,
    `Adjusted score moved from ${baseScore.total.toFixed(1)} to ${score.total.toFixed(1)} after progress and cost weighting.`,
    `Side delts ${sideDelt?.sets ?? 0}/${sideDelt?.target ?? 0} and lats ${lats?.sets ?? 0}/${lats?.target ?? 0} are prioritized because they have the highest current SMV return.`,
    `${sessions} logged sessions are used for exercise response multipliers; missing exercise history stays neutral.`,
    `Default set fallback remains ${fallbackSets}, but optimized slots store their own set counts.`,
  ];
}
