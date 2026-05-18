import type { ExerciseKey } from './types';

export type EquipmentKey =
  | 'none'
  | 'trx'
  | 'pullup_bar'
  | 'dip_bars'
  | 'barbell'
  | 'dumbbells'
  | 'cable_machine'
  | 'bench'
  | 'squat_rack'
  | 'smith_machine'
  | 'hack_squat_machine'
  | 'shoulder_press_machine'
  | 'chest_press_machine'
  | 'row_machine'
  | 'lateral_raise_machine'
  | 'pec_deck'
  | 'reverse_pec_deck'
  | 'preacher_curl_station'
  | 'lat_pulldown_machine'
  | 'leg_curl_machine'
  | 'leg_extension_machine'
  | 'calf_raise_machine'
  | 'leg_press_machine'
  | 'hip_abduction_machine';

export const EXERCISE_EQUIPMENT: Record<ExerciseKey, EquipmentKey[]> = {
  // Bodyweight
  incline_pushup: ['none'],
  pushup: ['none'],
  pushup_feet_elevated: ['none'],
  pike_pushup: ['none'],
  decline_pike_pushup: ['none'],
  glute_bridge: ['none'],
  pistol_squat_progression: ['none'],
  neck_iso_flex: ['none'],
  neck_iso_ext: ['none'],
  nordic_curl: ['none'],
  calf_raise: ['none'],
  bulgarian_split_squat: ['none'],
  // Bench
  bench_dip: ['bench'],
  hip_thrust: ['bench'],
  // TRX
  trx_pushup: ['trx'],
  trx_y_raise: ['trx'],
  trx_upright_row: ['trx'],
  trx_shrug: ['trx'],
  trx_curl_assisted: ['trx'],
  trx_curl: ['trx'],
  trx_row_steep: ['trx'],
  trx_kneeling_lat_pulldown: ['trx'],
  trx_straight_arm_pulldown: ['trx'],
  trx_row: ['trx'],
  face_pull: ['trx'],
  trx_t_raise: ['trx'],
  trx_reverse_curl_assisted: ['trx'],
  trx_reverse_curl: ['trx'],
  trx_assisted_squat: ['trx'],
  trx_hamstring_curl: ['trx'],
  // Bar
  negative_pullup: ['pullup_bar'],
  dip: ['dip_bars'],
  pullup: ['pullup_bar'],
  // Gym — barbell
  barbell_bench_press: ['barbell', 'bench', 'squat_rack'],
  smith_incline_press: ['smith_machine', 'bench'],
  barbell_ohp: ['barbell', 'squat_rack'],
  barbell_row: ['barbell'],
  barbell_squat: ['barbell', 'squat_rack'],
  barbell_deadlift: ['barbell'],
  romanian_deadlift: ['barbell'],
  front_squat: ['barbell', 'squat_rack'],
  sumo_deadlift: ['barbell'],
  barbell_curl: ['barbell'],
  // Gym — dumbbells
  db_incline_press: ['dumbbells', 'bench'],
  high_incline_machine_press: ['chest_press_machine'],
  machine_shoulder_press: ['shoulder_press_machine'],
  db_shoulder_press: ['dumbbells'],
  db_lateral_raise: ['dumbbells'],
  db_shrug: ['dumbbells'],
  machine_lateral_raise: ['lateral_raise_machine'],
  db_curl: ['dumbbells'],
  db_incline_curl: ['dumbbells', 'bench'],
  db_reverse_curl: ['dumbbells'],
  goblet_squat: ['dumbbells'],
  // Gym — cable
  cable_tricep_pushdown: ['cable_machine'],
  overhead_tricep_ext: ['cable_machine'],
  cable_row: ['cable_machine'],
  one_arm_cable_lat_row: ['cable_machine'],
  braced_cable_row: ['cable_machine'],
  cable_face_pull: ['cable_machine'],
  cable_rear_delt_fly: ['cable_machine'],
  cable_y_raise: ['cable_machine'],
  straight_arm_pulldown_cable: ['cable_machine'],
  cable_fly: ['cable_machine'],
  pec_deck: ['pec_deck'],
  cable_curl: ['cable_machine'],
  lat_pulldown: ['lat_pulldown_machine'],
  neutral_grip_pulldown: ['lat_pulldown_machine'],
  // Gym — dumbbells/free
  hammer_curl: ['dumbbells'],
  // Gym — machines
  chest_supported_row: ['row_machine'],
  machine_row: ['row_machine'],
  reverse_pec_deck: ['reverse_pec_deck'],
  preacher_curl: ['preacher_curl_station'],
  leg_curl_machine: ['leg_curl_machine'],
  leg_extension_machine: ['leg_extension_machine'],
  standing_calf_raise_machine: ['calf_raise_machine'],
  hack_squat: ['hack_squat_machine'],
  smith_squat: ['smith_machine'],
  leg_press: ['leg_press_machine'],
  cable_lateral_raise: ['cable_machine'],
  cable_glute_kickback: ['cable_machine'],
  hip_abduction_machine: ['hip_abduction_machine'],
};

export function getRequiredEquipment(key: ExerciseKey): EquipmentKey[] {
  return EXERCISE_EQUIPMENT[key] ?? ['none'];
}

export function canPerformExercise(key: ExerciseKey, unavailable: EquipmentKey[]): boolean {
  if (unavailable.length === 0) return true;
  const required = EXERCISE_EQUIPMENT[key] ?? ['none'];
  return !required.some((eq) => eq !== 'none' && unavailable.includes(eq));
}
