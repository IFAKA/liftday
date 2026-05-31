import type { Exercise, ExerciseKey } from './types';
import { getRequiredEquipment } from './equipment';

type SnapDirection = 'nearest' | 'down' | 'up';

const DEFAULT_WEIGHTED_LOAD = 20;

const DEFAULT_LOAD_BY_EXERCISE: Partial<Record<ExerciseKey, number>> = {
  db_lateral_raise: 5,
  cable_lateral_raise: 5,
  cable_y_raise: 5,
  cable_rear_delt_fly: 5,
  cable_face_pull: 10,
  cable_curl: 10,
  cable_tricep_pushdown: 10,
  overhead_tricep_ext: 10,
  cable_fly: 10,
  straight_arm_pulldown_cable: 10,
  hammer_curl: 10,
  db_curl: 10,
  db_incline_curl: 10,
  db_reverse_curl: 7.5,
  db_wrist_extension: 5,
};

const FIVE_KG_STACK_EXERCISES = new Set<ExerciseKey>([
  'lat_pulldown',
  'neutral_grip_pulldown',
  'cable_row',
  'one_arm_cable_lat_row',
  'braced_cable_row',
  'chest_supported_row',
  'machine_row',
  'high_incline_machine_press',
  'machine_shoulder_press',
  'machine_lateral_raise',
  'pec_deck',
  'reverse_pec_deck',
  'preacher_curl',
  'hack_squat',
  'leg_press',
  'leg_curl_machine',
  'leg_extension_machine',
  'standing_calf_raise_machine',
  'glute_machine',
  'hip_abduction_machine',
]);

export function getExerciseLoadStep(exerciseKey: ExerciseKey | null | undefined): number {
  if (!exerciseKey) return 2.5;
  const equipment = getRequiredEquipment(exerciseKey);
  if (equipment.includes('barbell')) return 2.5;
  if (equipment.includes('dumbbells')) return 2.5;
  if (equipment.includes('cable_machine')) return FIVE_KG_STACK_EXERCISES.has(exerciseKey) ? 5 : 2.5;
  if (FIVE_KG_STACK_EXERCISES.has(exerciseKey)) return 5;
  if (equipment.some((item) => item.includes('machine') || item === 'pec_deck' || item === 'reverse_pec_deck' || item === 'preacher_curl_station')) {
    return 5;
  }
  return 2.5;
}

export function getDefaultLoadTarget(exerciseKey: ExerciseKey | null | undefined, unit: Exercise['unit'] = 'weighted'): number {
  if (unit !== 'weighted' || !exerciseKey) return 0;
  return snapLoadTarget(exerciseKey, DEFAULT_LOAD_BY_EXERCISE[exerciseKey] ?? DEFAULT_WEIGHTED_LOAD, 'nearest') ?? DEFAULT_WEIGHTED_LOAD;
}

export function snapLoadTarget(
  exerciseKey: ExerciseKey | null | undefined,
  weight: number | null | undefined,
  direction: SnapDirection = 'nearest'
): number | null {
  if (weight === null || weight === undefined) return null;
  if (weight <= 0) return 0;
  const step = getExerciseLoadStep(exerciseKey);
  const scaled = weight / step;
  const units = direction === 'down'
    ? Math.floor(scaled)
    : direction === 'up'
      ? Math.ceil(scaled)
      : Math.round(scaled);
  return roundLoad(Math.max(0, units * step));
}

export function getNextLowerLoad(exerciseKey: ExerciseKey | null | undefined, weight: number | null): number | null {
  if (weight === null || weight <= 0) return weight;
  const step = getExerciseLoadStep(exerciseKey);
  const snappedDown = snapLoadTarget(exerciseKey, weight, 'down') ?? 0;
  const next = Math.abs(snappedDown - weight) < 0.001 ? snappedDown - step : snappedDown;
  return roundLoad(Math.max(0, next));
}

export function getNextHigherLoad(exerciseKey: ExerciseKey | null | undefined, weight: number | null): number | null {
  if (weight === null) return null;
  const step = getExerciseLoadStep(exerciseKey);
  const snappedUp = snapLoadTarget(exerciseKey, weight, 'up') ?? 0;
  const next = Math.abs(snappedUp - weight) < 0.001 ? snappedUp + step : snappedUp;
  return roundLoad(next);
}

export function formatLoadTarget(weight: number | null): string {
  if (weight === null) return 'bodyweight';
  return `${Number.isInteger(weight) ? weight : weight.toFixed(1)}kg`;
}

function roundLoad(value: number): number {
  return Math.round(value * 10) / 10;
}
