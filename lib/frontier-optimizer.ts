import { EXERCISES } from './constants';
import { EquipmentKey, getRequiredEquipment, getUnavailableProfileEquipment } from './equipment';
import { getChainsForRoutine, getSelectedExerciseKey } from './tiers';
import { getExerciseMuscleContribution, scoreWeeklyVolume, RoutineScoreResult, MUSCLE_MIN_WEEKLY_SETS } from './smv';
import { scoreSessionSets } from './progress-insights';
import { getSessionHardSetFloor, INCLUDED_EXERCISE_MIN_SETS } from './session-volume-constraints';
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
  order: number;
  fatigueClass: 'skill_compound' | 'stable_compound' | 'isolation' | 'joint_tissue' | 'systemic_lower';
  localFatigue: number;
  systemicFatigue: number;
  jointFatigue: number;
  progressionReliability: number;
  smvRoi: number;
  rationale: string;
  prescription: Omit<NonNullable<TierChain['prescription']>, 'sets'>;
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
  weeklyStructure: string[];
  sessionDurations: { workoutType: string; minutes: number; sets: number }[];
  weeklyEffectiveSets: Partial<Record<MuscleGroup, number>>;
  allocationRationale: string[];
  progressionAssumptions: string[];
  recoveryBottlenecks: string[];
  weakPointRisks: string[];
  longTermExpectations: string[];
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
const SET_MINUTES = 4;
function prescription(
  minReps: number,
  maxReps: number,
  restLabel: string,
  restSeconds: number,
  cue: string,
  finalSetRir?: string,
): FrontierCandidate['prescription'] {
  return {
    minReps,
    maxReps,
    targetRir: '1-2 RIR',
    targetRirMin: 1,
    targetRirMax: 2,
    finalSetRir,
    restSeconds,
    restLabel,
    cue,
  };
}

const SMV_ALLOCATION_CANDIDATES: FrontierCandidate[] = [
  { slotId: 'push_a_lateral', workoutType: 'push_a', fixed: true, priority: 'critical', order: 10, minSets: 3, maxSets: 4, exercises: ['cable_lateral_raise', 'db_lateral_raise', 'machine_lateral_raise'], fatigueClass: 'isolation', localFatigue: 0.7, systemicFatigue: 0.05, jointFatigue: 0.35, progressionReliability: 0.9, smvRoi: 1.3, rationale: 'Side delts are the highest clothed width ROI and tolerate early-session priority better than fatigued pressing.', prescription: prescription(12, 20, '60-90 sec', 75, 'Side delt first. Clean arc, no trap heave.', '0-1 RIR') },
  { slotId: 'push_a_upper_chest', workoutType: 'push_a', fixed: true, priority: 'critical', order: 20, minSets: 4, maxSets: 4, exercises: ['db_incline_press', 'barbell_bench_press', 'high_incline_machine_press', 'smith_incline_press'], fatigueClass: 'stable_compound', localFatigue: 1.0, systemicFatigue: 0.45, jointFatigue: 0.55, progressionReliability: 0.85, smvRoi: 1.15, rationale: 'Upper chest gets productive growth volume, but pressing also counts toward triceps and front-delt fatigue.', prescription: prescription(6, 10, '2.5-3 min', 165, 'Upper chest fullness. Stop before press quality degrades.') },
  { slotId: 'push_a_fly', workoutType: 'push_a', fixed: true, priority: 'high', order: 40, minSets: 2, maxSets: 2, exercises: ['cable_fly', 'pec_deck'], fatigueClass: 'isolation', localFatigue: 0.55, systemicFatigue: 0.05, jointFatigue: 0.25, progressionReliability: 0.8, smvRoi: 0.75, rationale: 'Small chest isolation dose fills the stimulus gap without adding much triceps or shoulder fatigue.', prescription: prescription(10, 15, '90 sec', 90, 'Stretch and squeeze. No shoulder roll.') },
  { slotId: 'push_a_triceps', workoutType: 'push_a', fixed: true, priority: 'support', order: 50, minSets: 1, maxSets: 1, exercises: ['overhead_tricep_ext', 'cable_tricep_pushdown'], fatigueClass: 'joint_tissue', localFatigue: 0.75, systemicFatigue: 0.05, jointFatigue: 0.65, progressionReliability: 0.75, smvRoi: 0.55, rationale: 'Direct triceps is capped because pressing already supplies effective triceps stimulus and elbow tissue has limited tolerance.', prescription: prescription(10, 15, '90 sec', 90, 'Long-head work only if elbows feel clean.') },

  { slotId: 'pull_a_vertical', workoutType: 'pull_a', fixed: true, priority: 'critical', order: 10, minSets: 3, maxSets: 4, exercises: ['lat_pulldown', 'neutral_grip_pulldown', 'pullup'], fatigueClass: 'stable_compound', localFatigue: 1.0, systemicFatigue: 0.3, jointFatigue: 0.35, progressionReliability: 0.9, smvRoi: 1.2, rationale: 'Vertical pulling drives V-taper and gives indirect biceps before any direct arm allocation.', prescription: prescription(8, 12, '2.5-3 min', 165, 'Elbows to ribs. Full stretch, stable torso.') },
  { slotId: 'pull_a_row', workoutType: 'pull_a', fixed: true, priority: 'critical', order: 20, minSets: 2, maxSets: 3, exercises: ['braced_cable_row', 'cable_row', 'barbell_row'], fatigueClass: 'stable_compound', localFatigue: 0.9, systemicFatigue: 0.25, jointFatigue: 0.25, progressionReliability: 0.85, smvRoi: 1.0, rationale: 'Rows protect posture/frame while braced options avoid wasting recovery on low-back fatigue.', prescription: prescription(8, 12, '2.5 min', 150, 'Pull through elbows. Keep torso quiet.') },
  { slotId: 'pull_a_rear_delt', workoutType: 'pull_a', fixed: true, priority: 'high', order: 35, minSets: 2, maxSets: 3, exercises: ['cable_rear_delt_fly', 'cable_face_pull', 'reverse_pec_deck'], fatigueClass: 'isolation', localFatigue: 0.65, systemicFatigue: 0.05, jointFatigue: 0.35, progressionReliability: 0.85, smvRoi: 0.85, rationale: 'Rear delts support posture but are capped because every row already contributes indirect rear-delt work.', prescription: prescription(15, 25, '60-90 sec', 75, 'Wide sweep. Rear delts, not traps.', '0-1 RIR') },
  { slotId: 'pull_a_biceps', workoutType: 'pull_a', fixed: true, priority: 'support', order: 45, minSets: 1, maxSets: 2, exercises: ['cable_curl', 'db_incline_curl', 'barbell_curl'], fatigueClass: 'joint_tissue', localFatigue: 0.7, systemicFatigue: 0.05, jointFatigue: 0.45, progressionReliability: 0.8, smvRoi: 0.7, rationale: 'Direct biceps fills sleeve volume only after pulldowns and rows have supplied indirect stimulus.', prescription: prescription(10, 15, '90 sec', 90, 'Strict curl. Keep elbows quiet.') },

  { slotId: 'legs_quads', workoutType: 'legs_maintenance', fixed: true, priority: 'support', order: 10, minSets: 2, maxSets: 3, exercises: ['leg_press', 'goblet_squat', 'barbell_squat', 'front_squat'], fatigueClass: 'systemic_lower', localFatigue: 1.0, systemicFatigue: 0.8, jointFatigue: 0.55, progressionReliability: 0.75, smvRoi: 0.45, rationale: 'Quads stay at maintenance-support volume because lower body is visually ahead and heavy leg fatigue competes with upper-body recovery.', prescription: prescription(8, 12, '2.5-3 min', 165, 'Maintenance quad work. Hard, but no grinders.') },
  { slotId: 'legs_hinge', workoutType: 'legs_maintenance', fixed: true, priority: 'support', order: 20, minSets: 2, maxSets: 3, exercises: ['cable_pull_through', 'glute_machine', 'leg_curl_machine'], fatigueClass: 'systemic_lower', localFatigue: 0.85, systemicFatigue: 0.35, jointFatigue: 0.35, progressionReliability: 0.8, smvRoi: 0.4, rationale: 'Cable pull-through keeps the hip-extension hinge for glutes and hamstrings with lower skill demand, lower free-weight friction, and less spinal fatigue; leg curls cover knee-flexion hamstrings.', prescription: prescription(10, 15, '2 min', 120, 'Hips back, slight knee bend. Controlled eccentric; do not squat it or hyperextend the lower back.') },
  { slotId: 'legs_calf', workoutType: 'legs_maintenance', fixed: true, priority: 'aesthetic', order: 40, minSets: 2, maxSets: 3, exercises: ['standing_calf_raise_machine', 'calf_raise'], fatigueClass: 'isolation', localFatigue: 0.55, systemicFatigue: 0.05, jointFatigue: 0.2, progressionReliability: 0.8, smvRoi: 0.35, rationale: 'Calves get enough direct work to avoid neglect without stealing high-ROI recovery.', prescription: prescription(8, 15, '90 sec', 90, 'Full stretch, hard peak.', '0-1 RIR') },

  { slotId: 'push_b_upper_chest', workoutType: 'push_b', fixed: true, priority: 'critical', order: 10, minSets: 4, maxSets: 4, exercises: ['db_incline_press', 'barbell_bench_press', 'high_incline_machine_press', 'smith_incline_press'], fatigueClass: 'stable_compound', localFatigue: 1.0, systemicFatigue: 0.45, jointFatigue: 0.55, progressionReliability: 0.85, smvRoi: 1.15, rationale: 'Second upper-chest exposure keeps weekly stimulus productive without turning chest into recovery sink.', prescription: prescription(8, 12, '2.5-3 min', 165, 'Upper chest. Match sides. No failure reps.') },
  { slotId: 'push_b_lateral', workoutType: 'push_b', fixed: true, priority: 'critical', order: 20, minSets: 3, maxSets: 4, exercises: ['cable_lateral_raise', 'db_lateral_raise', 'machine_lateral_raise'], fatigueClass: 'isolation', localFatigue: 0.7, systemicFatigue: 0.05, jointFatigue: 0.35, progressionReliability: 0.9, smvRoi: 1.3, rationale: 'Side delts get a second high-quality slot because width is the top visible silhouette lever.', prescription: prescription(12, 20, '60-90 sec', 75, 'Strict side delt work. Stop before traps take over.', '0-1 RIR') },
  { slotId: 'push_b_triceps', workoutType: 'push_b', fixed: true, priority: 'support', order: 45, minSets: 1, maxSets: 1, exercises: ['cable_tricep_pushdown', 'overhead_tricep_ext'], fatigueClass: 'joint_tissue', localFatigue: 0.7, systemicFatigue: 0.05, jointFatigue: 0.55, progressionReliability: 0.8, smvRoi: 0.55, rationale: 'One direct triceps top-up is enough because presses already cover maintenance-to-growth stimulus.', prescription: prescription(10, 15, '90 sec', 90, 'Lockout without shoulder movement.') },

  { slotId: 'pull_b_vertical', workoutType: 'pull_b', fixed: true, priority: 'critical', order: 10, minSets: 3, maxSets: 4, exercises: ['neutral_grip_pulldown', 'lat_pulldown', 'pullup'], fatigueClass: 'stable_compound', localFatigue: 1.0, systemicFatigue: 0.3, jointFatigue: 0.35, progressionReliability: 0.9, smvRoi: 1.2, rationale: 'Second lat exposure is kept high because V-taper compounds clothing fit and frame width.', prescription: prescription(8, 12, '2.5-3 min', 165, 'Neutral if available. Drive elbows down.') },
  { slotId: 'pull_b_row', workoutType: 'pull_b', fixed: true, priority: 'critical', order: 20, minSets: 2, maxSets: 3, exercises: ['braced_cable_row', 'cable_row', 'barbell_row'], fatigueClass: 'stable_compound', localFatigue: 0.9, systemicFatigue: 0.25, jointFatigue: 0.25, progressionReliability: 0.85, smvRoi: 1.0, rationale: 'Horizontal pulling keeps upper-back posture without chasing unnecessary back volume.', prescription: prescription(8, 12, '2.5 min', 150, 'Chest tall. Pull through elbows.') },
  { slotId: 'pull_b_rear_delt', workoutType: 'pull_b', fixed: true, priority: 'high', order: 35, minSets: 1, maxSets: 2, exercises: ['cable_face_pull', 'cable_rear_delt_fly', 'reverse_pec_deck'], fatigueClass: 'isolation', localFatigue: 0.6, systemicFatigue: 0.05, jointFatigue: 0.3, progressionReliability: 0.8, smvRoi: 0.8, rationale: 'Rear delt specialization is deliberately below maximal recoverable volume to protect shoulder connective tissue.', prescription: prescription(15, 25, '60-90 sec', 75, 'Posture work. Smooth external rotation.', '0-1 RIR') },
  { slotId: 'pull_b_biceps', workoutType: 'pull_b', fixed: true, priority: 'support', order: 45, minSets: 1, maxSets: 2, exercises: ['hammer_curl', 'cable_curl', 'db_incline_curl'], fatigueClass: 'joint_tissue', localFatigue: 0.65, systemicFatigue: 0.05, jointFatigue: 0.4, progressionReliability: 0.75, smvRoi: 0.65, rationale: 'Hammer curl adds sleeve thickness with lower overlap than another supinated curl.', prescription: prescription(10, 15, '90 sec', 90, 'Controlled reps. No swing.') },

  { slotId: 'delts_arms_lateral', workoutType: 'delts_arms', fixed: true, priority: 'critical', order: 10, minSets: 3, maxSets: 4, exercises: ['cable_y_raise', 'db_lateral_raise', 'cable_lateral_raise', 'machine_lateral_raise'], fatigueClass: 'isolation', localFatigue: 0.7, systemicFatigue: 0.05, jointFatigue: 0.35, progressionReliability: 0.9, smvRoi: 1.25, rationale: 'Saturday is a small specialization dose, not a junk-volume dump; side delts remain first because they are priority and fatigue-sensitive.', prescription: prescription(12, 20, '60-90 sec', 75, 'Scapular-plane side delts. Quality over load.', '0-1 RIR') },
  { slotId: 'delts_arms_rear', workoutType: 'delts_arms', fixed: true, priority: 'high', order: 20, minSets: 1, maxSets: 2, exercises: ['cable_rear_delt_fly', 'cable_face_pull', 'reverse_pec_deck'], fatigueClass: 'isolation', localFatigue: 0.6, systemicFatigue: 0.05, jointFatigue: 0.3, progressionReliability: 0.8, smvRoi: 0.75, rationale: 'Rear delt gets a posture top-up only; rows already provide indirect rear-delt stimulus.', prescription: prescription(15, 25, '60-90 sec', 75, 'Rear delts only. Stop if traps dominate.', '0-1 RIR') },
  { slotId: 'delts_arms_biceps', workoutType: 'delts_arms', fixed: true, priority: 'support', order: 35, minSets: 1, maxSets: 2, exercises: ['cable_curl', 'db_incline_curl', 'hammer_curl'], fatigueClass: 'joint_tissue', localFatigue: 0.65, systemicFatigue: 0.05, jointFatigue: 0.45, progressionReliability: 0.8, smvRoi: 0.65, rationale: 'Direct biceps is limited because two pull days already contribute enough effective arm stimulus.', prescription: prescription(10, 15, '90 sec', 90, 'Strict sleeve work. Keep elbow quiet.') },
  { slotId: 'delts_arms_triceps', workoutType: 'delts_arms', fixed: true, priority: 'support', order: 40, minSets: 1, maxSets: 2, exercises: ['overhead_tricep_ext', 'cable_tricep_pushdown'], fatigueClass: 'joint_tissue', localFatigue: 0.65, systemicFatigue: 0.05, jointFatigue: 0.5, progressionReliability: 0.75, smvRoi: 0.6, rationale: 'Triceps receives enough direct work for sleeve fill after pressing overlap, without elbow overuse.', prescription: prescription(10, 15, '90 sec', 90, 'Smooth extension. No joint pain reps.') },
  { slotId: 'delts_arms_neck', workoutType: 'delts_arms', fixed: true, priority: 'aesthetic', order: 50, minSets: 1, maxSets: 2, exercises: ['neck_iso_ext', 'neck_iso_flex'], fatigueClass: 'joint_tissue', localFatigue: 0.35, systemicFatigue: 0, jointFatigue: 0.2, progressionReliability: 0.7, smvRoi: 0.45, rationale: 'Neck/trap presentation gets a conservative dose because the ROI is real but tolerance is unproven.', prescription: prescription(20, 40, '60 sec', 60, 'Gentle iso. No strain.') },
];

export function optimizeRoutineForFrontier(
  routine: RoutineConfig,
  profile: UserProfile | null,
  data: WorkoutData,
  fallbackSets: number
): FrontierOptimizerResult {
  if (routine.id !== 'gym') return describeStaticRoutine(routine, data, fallbackSets, ['Optimizer is currently enabled for the gym routine only.']);
  if (profile?.goal === '__generated_frontier__') {
    return optimizeGeneratedRoutineForFrontier(routine, profile, data, fallbackSets);
  }

  const score = scoreRoutineWithProgress(routine, data, fallbackSets);
  const sessionDurations = estimateSessionDurations(routine, fallbackSets);
  return {
    routine,
    score,
    baseScore: score,
    reasons: getCanonicalRoutineReasons(score, routine, data, fallbackSets, sessionDurations),
    weeklyStructure: getWeeklyStructure(routine, fallbackSets),
    sessionDurations,
    weeklyEffectiveSets: getWeeklyEffectiveSets(score),
    allocationRationale: getCanonicalAllocationRationale(score),
    progressionAssumptions: getProgressionAssumptions(),
    recoveryBottlenecks: getCanonicalRecoveryBottlenecks(score, routine, fallbackSets),
    weakPointRisks: getWeakPointRisks(score),
    longTermExpectations: getLongTermExpectations(),
    selectedSlots: describeRoutineSlots(routine, fallbackSets),
  };
}

function optimizeGeneratedRoutineForFrontier(
  routine: RoutineConfig,
  profile: UserProfile | null,
  data: WorkoutData,
  fallbackSets: number
): FrontierOptimizerResult {
  const sessionSetCap = getSessionSetCap(profile);
  const candidates = getAvailableCandidates(profile);
  const basePlan = candidates.map((candidate) => ({
    candidate,
    sets: Math.max(candidate.minSets, INCLUDED_EXERCISE_MIN_SETS),
  }));
  const optimizedPlan = enforceSessionHardSetFloors(
    enforceMuscleFloors(greedyOptimize(basePlan, data, profile, fallbackSets, sessionSetCap), data, profile, fallbackSets, sessionSetCap),
    sessionSetCap
  );
  const optimizedRoutine = buildRoutineFromPlan(routine, optimizedPlan, profile);
  const score = scoreRoutineWithProgress(optimizedRoutine, data, fallbackSets);
  const baseScore = scoreRoutineWithProgress(routine, data, fallbackSets);
  const sessionDurations = estimateSessionDurations(optimizedRoutine, fallbackSets);

  return {
    routine: optimizedRoutine,
    score,
    baseScore,
    reasons: getOptimizerReasons(baseScore, score, optimizedRoutine, data, fallbackSets, sessionSetCap, sessionDurations),
    weeklyStructure: getWeeklyStructure(optimizedRoutine, fallbackSets),
    sessionDurations,
    weeklyEffectiveSets: getWeeklyEffectiveSets(score),
    allocationRationale: getAllocationRationale(optimizedPlan, score),
    progressionAssumptions: getProgressionAssumptions(),
    recoveryBottlenecks: getRecoveryBottlenecks(optimizedPlan),
    weakPointRisks: getWeakPointRisks(score),
    longTermExpectations: getLongTermExpectations(),
    selectedSlots: describeRoutineSlots(optimizedRoutine, fallbackSets),
  };
}

function describeStaticRoutine(
  routine: RoutineConfig,
  data: WorkoutData,
  fallbackSets: number,
  reasons: string[]
): FrontierOptimizerResult {
  const score = scoreRoutineWithProgress(routine, data, fallbackSets);
  return {
    routine,
    score,
    baseScore: score,
    reasons,
    weeklyStructure: routine.schedule.map((workoutType) => `${workoutType}: existing routine`),
    sessionDurations: estimateSessionDurations(routine, fallbackSets),
    weeklyEffectiveSets: getWeeklyEffectiveSets(score),
    allocationRationale: [],
    progressionAssumptions: [],
    recoveryBottlenecks: [],
    weakPointRisks: [],
    longTermExpectations: [],
    selectedSlots: describeRoutineSlots(routine, fallbackSets),
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
  let currentScore = scoreConstrainedPlan(plan, data, profile, fallbackSets);

  while (true) {
    const best = plan
      .map((slot, index) => {
        if (slot.sets >= slot.candidate.maxSets) return null;
        const next = plan.map((entry, entryIndex) => (
          entryIndex === index ? { ...entry, sets: entry.sets + 1 } : { ...entry }
        ));
        if (exceedsSessionSetCap(next, sessionSetCap, profile)) return null;
        const nextScore = scoreConstrainedPlan(next, data, profile, fallbackSets);
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
    description: 'Deterministic hypertrophy gym routine.',
    icon: 'dumbbell' as const,
    schedule: ['push_a', 'pull_a', 'legs_maintenance', 'push_b', 'pull_b', 'delts_arms'] as Exclude<WorkoutType, 'rest'>[],
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
          prescription: {
            ...candidate.prescription,
            sets,
          },
          exercises: candidate.exercises,
        };
      })
      .sort((a, b) => getCandidateOrder(a.slotId) - getCandidateOrder(b.slotId)),
  };
}

function scoreConstrainedPlan(
  plan: FrontierPlanSlot[],
  data: WorkoutData,
  profile: UserProfile | null,
  fallbackSets: number
): number {
  const raw = scorePlan(plan, data, profile, fallbackSets).total;
  const effectiveSets = scorePlan(plan, data, profile, fallbackSets).breakdown;
  const recoverabilityCost = plan.reduce((sum, slot) => {
    const weeklyMultiplier = getWeeklyOccurrenceCount(slot.candidate.workoutType);
    return sum + slot.sets * weeklyMultiplier * (
      slot.candidate.localFatigue +
      slot.candidate.systemicFatigue * 1.5 +
      slot.candidate.jointFatigue * 1.1
    );
  }, 0);
  const rearDeltExcess = Math.max(0, (effectiveSets.rear_delt?.sets ?? 0) - 12);
  const armExcess = Math.max(0, (effectiveSets.biceps?.sets ?? 0) - 12) + Math.max(0, (effectiveSets.triceps?.sets ?? 0) - 10);
  const legExcess = Math.max(0, (effectiveSets.quads?.sets ?? 0) - 7) + Math.max(0, (effectiveSets.hamstrings?.sets ?? 0) - 7);
  return raw - recoverabilityCost * 0.55 - rearDeltExcess * 4 - armExcess * 3 - legExcess * 4;
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
  if (ratio <= 0.95 && hasTwoConsecutivePerformanceDrops(sessions, key)) return 0.92;
  return 1;
}

function hasTwoConsecutivePerformanceDrops(
  sessions: [string, WorkoutData[string]][],
  key: ExerciseKey
): boolean {
  if (sessions.length < 3) return false;
  const scores = sessions.slice(0, 3).map(([, session]) => scoreSessionSets(session[key] as SetEntry[]));
  return scores[0] < scores[1] * 0.95 && scores[1] < scores[2] * 0.95;
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

function enforceSessionHardSetFloors(
  initialPlan: FrontierPlanSlot[],
  sessionSetCap: number
): FrontierPlanSlot[] {
  let plan = initialPlan.map((slot) => ({ ...slot, sets: Math.max(slot.sets, INCLUDED_EXERCISE_MIN_SETS) }));
  const workoutTypes = [...new Set(plan.map((slot) => slot.candidate.workoutType))];

  for (const workoutType of workoutTypes) {
    const floor = getSessionHardSetFloor(workoutType);
    if (floor <= 0) continue;
    const order = plan
      .map((slot, index) => slot.candidate.workoutType === workoutType ? { index, slot } : null)
      .filter((entry): entry is { index: number; slot: FrontierPlanSlot } => Boolean(entry))
      .sort((a, b) => (
        b.slot.candidate.smvRoi - a.slot.candidate.smvRoi ||
        a.slot.candidate.order - b.slot.candidate.order
      ));
    let cursor = 0;
    while (getPlanSessionSets(plan, workoutType) < floor && getPlanSessionSets(plan, workoutType) < sessionSetCap) {
      const best = order[cursor % order.length];
      if (!best) break;
      plan = plan.map((entry, index) => (
        index === best.index ? { ...entry, sets: entry.sets + 1 } : entry
      ));
      cursor++;
    }
  }

  return plan;
}

function getPlanSessionSets(
  plan: FrontierPlanSlot[],
  workoutType: Exclude<WorkoutType, 'rest'>
): number {
  return plan
    .filter((slot) => slot.candidate.workoutType === workoutType)
    .reduce((sum, slot) => sum + slot.sets, 0);
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
  const unavailable = getUnavailableEquipment(profile);
  const compatible = candidate.exercises.filter((key) => isExerciseCompatible(key, profile, unavailable));
  const path = compatible.length > 0 ? compatible : candidate.exercises;
  const tier = profile?.tiers?.[candidate.slotId] ?? 0;
  const clamped = Math.max(0, Math.min(tier, path.length - 1));
  return path[clamped];
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
  sessionSetCap: number,
  sessionDurations: FrontierOptimizerResult['sessionDurations']
): string[] {
  const sideDelt = score.breakdown.side_delt;
  const lats = score.breakdown.lats;
  const triceps = score.breakdown.triceps;
  const biceps = score.breakdown.biceps;
  const longestSession = sessionDurations.reduce((max, session) => Math.max(max, session.minutes), 0);
  const sessions = Object.values(data).filter((session) => session.logged_at).length;
  return [
    `Optimized ${routine.tierChains.length} slots with a ${sessionSetCap}-set cap and ${longestSession}-minute longest estimated session.`,
    `Adjusted score moved from ${baseScore.total.toFixed(1)} to ${score.total.toFixed(1)} after progress and cost weighting.`,
    `Side delts ${sideDelt?.sets ?? 0}/${sideDelt?.target ?? 0} and lats ${lats?.sets ?? 0}/${lats?.target ?? 0} get priority because they move clothed width and V-taper fastest per recoverable fatigue unit.`,
    `Arms are indirect-set-aware: biceps ${biceps?.sets ?? 0}/${biceps?.target ?? 0}, triceps ${triceps?.sets ?? 0}/${triceps?.target ?? 0}; direct work is capped after pulls and presses.`,
    `Default unavailable equipment excludes Smith incline, machine shoulder press, and machine lateral raise unless the profile explicitly lists those as available.`,
    `${sessions} logged sessions are used for exercise response multipliers; missing exercise history stays neutral.`,
    `Default set fallback remains ${fallbackSets}, but optimized slots store their own recoverability-constrained set counts.`,
  ];
}

function getCanonicalRoutineReasons(
  score: RoutineScoreResult,
  routine: RoutineConfig,
  data: WorkoutData,
  fallbackSets: number,
  sessionDurations: FrontierOptimizerResult['sessionDurations']
): string[] {
  const sideDelt = score.breakdown.side_delt;
  const lats = score.breakdown.lats;
  const rearDelt = score.breakdown.rear_delt;
  const longestSession = sessionDurations.reduce((max, session) => Math.max(max, session.minutes), 0);
  const sessions = Object.values(data).filter((session) => session.logged_at).length;

  return [
    `Using the canonical hypertrophy routine from the supplied context: ${routine.tierChains.length} slots, ${score.cost.totalSets} weekly sets, and ${longestSession}-minute longest estimated session.`,
    `Side delts ${sideDelt?.sets ?? 0}/${sideDelt?.target ?? 0}, lats ${lats?.sets ?? 0}/${lats?.target ?? 0}, and rear delts ${rearDelt?.sets ?? 0}/${rearDelt?.target ?? 0} lead because shoulder width, V-taper, and posture are the top program priorities.`,
    'Legs are maintenance-support, not a growth focus; heavy lower-body work is capped so recoverability stays available for upper-body visual change.',
    'Default exercise choices avoid unavailable Smith incline, machine shoulder press, and machine lateral raise while preserving cable, dumbbell, pulldown, row, hack squat, and leg press work.',
    `Indirect-set-aware scoring is active with ${fallbackSets} fallback sets; ${sessions} logged sessions can still influence progression, fatigue, and recommendation logic.`,
  ];
}

function getCanonicalAllocationRationale(score: RoutineScoreResult): string[] {
  return [
    `Side delts are first priority at ${score.breakdown.side_delt?.sets ?? 0} effective sets because shoulder width changes the clothed frame fastest.`,
    `Upper chest and lats are trained twice because torso thickness and V-taper compound the visual effect through clothing.`,
    `Rear delts and face pulls are kept high enough for posture without turning the shoulder joint into the bottleneck.`,
    `Direct arm work is distributed after pressing and pulling because triceps and biceps already receive meaningful indirect volume.`,
    `Legs are maintenance-support: quads ${score.breakdown.quads?.sets ?? 0}, hamstrings ${score.breakdown.hamstrings?.sets ?? 0}, glutes ${score.breakdown.glutes?.sets ?? 0}, calves ${score.breakdown.calves?.sets ?? 0}.`,
  ];
}

function getCanonicalRecoveryBottlenecks(
  score: RoutineScoreResult,
  routine: RoutineConfig,
  fallbackSets: number
): string[] {
  const shoulderIsolationSets = routine.tierChains
    .filter((chain) => chain.slotId.includes('lateral') || chain.slotId.includes('rear') || chain.slotId.includes('face_pull'))
    .reduce((sum, chain) => sum + getChainSetCountLocal(chain, fallbackSets), 0);
  const directArmSets = routine.tierChains
    .filter((chain) => chain.slotId.includes('triceps') || chain.slotId.includes('pressdown') || chain.slotId.includes('curl'))
    .reduce((sum, chain) => sum + getChainSetCountLocal(chain, fallbackSets), 0);

  return [
    `Shoulder local tissue is the first likely bottleneck at ${shoulderIsolationSets} direct side/rear-delt sets.`,
    `Elbow/connective tissue is monitored through ${directArmSets} direct arm sets plus pressing and pulling overlap.`,
    `Lower-body systemic fatigue is intentionally bounded while quads ${score.breakdown.quads?.sets ?? 0}/${score.breakdown.quads?.target ?? 0} and hamstrings ${score.breakdown.hamstrings?.sets ?? 0}/${score.breakdown.hamstrings?.target ?? 0} stay near maintenance.`,
  ];
}

function getAvailableCandidates(profile: UserProfile | null): FrontierCandidate[] {
  const unavailable = getUnavailableEquipment(profile);
  return SMV_ALLOCATION_CANDIDATES
    .map((candidate) => ({
      ...candidate,
      exercises: candidate.exercises.filter((key) => isExerciseCompatible(key, profile, unavailable)),
    }))
    .filter((candidate) => candidate.exercises.length > 0);
}

function getUnavailableEquipment(profile: UserProfile | null): EquipmentKey[] {
  return getUnavailableProfileEquipment(profile?.availableEquipment);
}

function isExerciseCompatible(exerciseKey: ExerciseKey, profile: UserProfile | null, unavailable: EquipmentKey[]): boolean {
  const required = getRequiredEquipment(exerciseKey).filter((equipment) => equipment !== 'none');
  if (required.some((equipment) => unavailable.includes(equipment))) return false;
  if (!profile?.availableEquipment?.length) return true;
  const available = new Set(profile.availableEquipment);
  return required.every((equipment) => available.has(equipment));
}

function getCandidateOrder(slotId: string): number {
  return SMV_ALLOCATION_CANDIDATES.find((candidate) => candidate.slotId === slotId)?.order ?? 100;
}

function getWeeklyOccurrenceCount(workoutType: Exclude<WorkoutType, 'rest'>): number {
  return SMV_ALLOCATION_CANDIDATES.some((candidate) => candidate.workoutType === workoutType) ? 1 : 2;
}

function getWeeklyEffectiveSets(score: RoutineScoreResult): Partial<Record<MuscleGroup, number>> {
  return Object.fromEntries(
    Object.entries(score.breakdown).map(([muscle, entry]) => [muscle, entry.sets])
  ) as Partial<Record<MuscleGroup, number>>;
}

function estimateSessionDurations(routine: RoutineConfig, fallbackSets: number): FrontierOptimizerResult['sessionDurations'] {
  return routine.schedule.map((workoutType) => {
    const chains = getChainsForRoutine(routine, workoutType);
    const sets = chains.reduce((sum, chain) => sum + getChainSetCountLocal(chain, fallbackSets), 0);
    const workMinutes = chains.reduce((sum, chain) => {
      const setCount = getChainSetCountLocal(chain, fallbackSets);
      const restSeconds = chain.prescription?.restSeconds ?? 90;
      return sum + setCount * 0.75 + Math.max(0, setCount - 1) * (restSeconds / 60);
    }, 0);
    const transitions = Math.max(0, chains.length - 1) * 2;
    const warmup = chains.some((chain) => (chain.prescription?.restSeconds ?? 90) >= 150) ? 10 : 6;
    return {
      workoutType,
      sets,
      minutes: Math.min(105, Math.round(workMinutes + transitions + warmup)),
    };
  });
}

function getChainSetCountLocal(chain: TierChain, fallbackSets: number): number {
  return chain.sets ?? chain.prescription?.sets ?? fallbackSets;
}

function getWeeklyStructure(routine: RoutineConfig, fallbackSets: number): string[] {
  return routine.schedule.map((workoutType) => {
    const chains = getChainsForRoutine(routine, workoutType);
    const sets = chains.reduce((sum, chain) => sum + getChainSetCountLocal(chain, fallbackSets), 0);
    const names = chains.slice(0, 3).map((chain) => EXERCISES.find((exercise) => exercise.key === getSelectedExerciseKey(chain))?.name ?? chain.slotId);
    return `${workoutType}: ${sets} sets; ${names.join(', ')}`;
  });
}

function getAllocationRationale(plan: FrontierPlanSlot[], score: RoutineScoreResult): string[] {
  const rationale = plan
    .filter((slot) => slot.sets > 0)
    .sort((a, b) => b.candidate.smvRoi - a.candidate.smvRoi)
    .slice(0, 8)
    .map((slot) => `${slot.candidate.slotId}: ${slot.sets} sets because ${slot.candidate.rationale}`);
  rationale.push(`Legs are maintenance-support: quads ${score.breakdown.quads?.sets ?? 0}, hamstrings ${score.breakdown.hamstrings?.sets ?? 0}, glutes ${score.breakdown.glutes?.sets ?? 0}, calves ${score.breakdown.calves?.sets ?? 0}.`);
  return rationale;
}

function getProgressionAssumptions(): string[] {
  return [
    'Progress only when all sets hit the top of the rep range at target RIR; load jumps are not forced through fatigue.',
    'Early-session priority slots receive the cleanest progression stimulus; low-skill isolations can run later.',
    'A flat or dropping progression multiplier reduces marginal allocation instead of adding more sets.',
  ];
}

function getRecoveryBottlenecks(plan: FrontierPlanSlot[]): string[] {
  const systemicLower = plan.filter((slot) => slot.candidate.fatigueClass === 'systemic_lower').reduce((sum, slot) => sum + slot.sets, 0);
  const jointTissue = plan.filter((slot) => slot.candidate.fatigueClass === 'joint_tissue').reduce((sum, slot) => sum + slot.sets, 0);
  const shoulderIsolation = plan.filter((slot) => slot.candidate.slotId.includes('lateral') || slot.candidate.slotId.includes('rear')).reduce((sum, slot) => sum + slot.sets, 0);
  return [
    `Shoulder local tissue from lateral/rear-delt work is the first likely bottleneck at ${shoulderIsolation} direct sets.`,
    `Elbow/connective tissue is monitored through ${jointTissue} direct arm/neck slots plus pressing and pulling overlap.`,
    `Lower-body systemic fatigue is intentionally capped at ${systemicLower} direct leg sets.`,
  ];
}

function getWeakPointRisks(score: RoutineScoreResult): string[] {
  const risks: string[] = [];
  if ((score.breakdown.calves?.sets ?? 0) < 4) risks.push('Calves may drift toward minimum maintenance if calf raises are skipped.');
  if ((score.breakdown.neck?.sets ?? 0) < 2) risks.push('Neck/trap presentation is conservative and may lag visible shoulder width.');
  if ((score.breakdown.rear_delt?.sets ?? 0) > 14) risks.push('Rear delt volume is near the upper recoverable edge; shoulder irritation should reduce direct rear-delt sets first.');
  if (risks.length === 0) risks.push('Main weak-point risk is execution quality, not missing muscle coverage.');
  return risks;
}

function getLongTermExpectations(): string[] {
  return [
    'First 4-8 weeks should show faster shoulder width, upper-chest, and V-taper progression than leg or arm specialization.',
    'After visible width improves, arms and calves can receive marginal sets only if progression quality stays high.',
    'If sessions exceed 90 minutes or joint pain rises, remove Saturday arm/rear-delt top-ups before touching priority lats or upper chest.',
  ];
}
