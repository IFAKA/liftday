import { ExerciseKey, RoutineConfig, TierChain } from '../types';

function prescription(sets: number, minReps: number, maxReps: number, restLabel: string, cue: string, finalSetRir?: string): NonNullable<TierChain['prescription']> {
  const restSeconds = restLabel.includes('2 min') ? 120 : 75;
  return { sets, minReps, maxReps, targetRir: '1-2 RIR', targetRirMin: 1, targetRirMax: 2, finalSetRir, restSeconds, restLabel, cue };
}

function slot(slotId: string, workoutType: 'upper_a' | 'lower_aesthetic' | 'upper_b' | 'aesthetic', exerciseKey: ExerciseKey, priority: TierChain['priority'], sets: number, minReps: number, maxReps: number, rest: string, cue: string, alternatives: ExerciseKey[] = [], finalSetRir?: string): TierChain {
  return { slotId, workoutType, fixed: true, priority, selectedExercise: exerciseKey, alternatives, exercises: [exerciseKey], prescription: prescription(sets, minReps, maxReps, rest, cue, finalSetRir) };
}

export const gymRoutine: RoutineConfig = {
  id: 'gym',
  name: 'Four-Day Max-SNR Routine',
  description: 'A fixed four-day gym routine with upper, lower, and aesthetic-focused sessions.',
  icon: 'dumbbell',
  schedule: ['upper_a', 'lower_aesthetic', 'upper_b', 'aesthetic'],
  trainingWeekdays: [0, 1, 3, 4],
  tierChains: [
    // Monday — UPPER A
    slot('upper_a_high_incline_press', 'upper_a', 'high_incline_machine_press', 'critical', 3, 6, 10, '2 min', 'Stable upper-chest pressing.', ['db_incline_press', 'smith_incline_press']),
    slot('upper_a_neutral_pulldown', 'upper_a', 'neutral_grip_pulldown', 'critical', 3, 6, 10, '2 min', 'Drive elbows toward ribs.', ['lat_pulldown', 'pullup']),
    slot('upper_a_lateral_raise', 'upper_a', 'cable_lateral_raise', 'critical', 3, 10, 20, '60-90 sec', 'Clean side-delt arc.', ['machine_lateral_raise', 'db_lateral_raise'], '0-1 RIR'),
    slot('upper_a_braced_row', 'upper_a', 'braced_cable_row', 'high', 2, 8, 12, '2 min', 'Brace the torso and pull through the elbows.', ['chest_supported_row', 'machine_row', 'cable_row']),
    slot('upper_a_overhead_triceps', 'upper_a', 'overhead_tricep_ext', 'high', 2, 8, 15, '60-90 sec', 'Fixed elbows through the lengthened position.', ['cable_tricep_pushdown']),
    slot('upper_a_cable_curl', 'upper_a', 'cable_curl', 'high', 2, 8, 15, '60-90 sec', 'Pin elbows and control the stretch.', ['preacher_curl', 'db_curl']),

    // Tuesday — LOWER + AESTHETIC
    slot('lower_leg_press', 'lower_aesthetic', 'leg_press', 'support', 3, 6, 10, '2 min', 'Contained quad work.', ['hack_squat']),
    slot('lower_leg_curl', 'lower_aesthetic', 'leg_curl_machine', 'support', 3, 8, 12, '60-90 sec', 'Controlled hamstring curl.'),
    slot('lower_leg_extension', 'lower_aesthetic', 'leg_extension_machine', 'support', 2, 10, 15, '60-90 sec', 'Pain-free direct quad work.'),
    slot('lower_calf_raise', 'lower_aesthetic', 'standing_calf_raise_machine', 'support', 3, 8, 15, '60-90 sec', 'Full stretch and peak.', ['calf_raise']),
    slot('lower_lateral_raise', 'lower_aesthetic', 'cable_lateral_raise', 'critical', 3, 10, 20, '60-90 sec', 'Clean side-delt arc.', ['machine_lateral_raise', 'db_lateral_raise'], '0-1 RIR'),
    slot('lower_neck_front', 'lower_aesthetic', 'neck_iso_flex', 'aesthetic', 2, 10, 20, '60-90 sec', 'Gentle controlled neck flexion.'),
    slot('lower_neck_back', 'lower_aesthetic', 'neck_iso_ext', 'aesthetic', 2, 10, 20, '60-90 sec', 'Gentle controlled neck extension.'),

    // Thursday — UPPER B
    slot('upper_b_incline_db_press', 'upper_b', 'db_incline_press', 'critical', 3, 6, 10, '2 min', 'Controlled incline pressing.', ['high_incline_machine_press', 'smith_incline_press']),
    slot('upper_b_lat_pulldown', 'upper_b', 'lat_pulldown', 'critical', 3, 8, 12, '2 min', 'Full overhead reach, elbows down.', ['neutral_grip_pulldown', 'pullup']),
    slot('upper_b_pec_deck', 'upper_b', 'pec_deck', 'high', 2, 10, 15, '60-90 sec', 'Squeeze the chest.', ['cable_fly']),
    slot('upper_b_braced_row', 'upper_b', 'braced_cable_row', 'high', 2, 8, 12, '2 min', 'Brace and pull through the elbows.', ['chest_supported_row', 'machine_row', 'cable_row']),
    slot('upper_b_reverse_pec_deck', 'upper_b', 'reverse_pec_deck', 'critical', 3, 10, 20, '60-90 sec', 'Keep the traps quiet.', ['cable_rear_delt_fly', 'cable_face_pull'], '0-1 RIR'),
    slot('upper_b_overhead_triceps', 'upper_b', 'overhead_tricep_ext', 'high', 2, 8, 15, '60-90 sec', 'Fixed elbows through the stretch.', ['cable_tricep_pushdown']),
    slot('upper_b_preacher_curl', 'upper_b', 'preacher_curl', 'high', 2, 8, 15, '60-90 sec', 'Keep the upper arm fixed.', ['cable_curl', 'db_curl']),

    // Friday — AESTHETIC
    slot('aesthetic_lateral_raise', 'aesthetic', 'cable_lateral_raise', 'critical', 3, 10, 20, '60-90 sec', 'Clean side-delt arc.', ['machine_lateral_raise', 'db_lateral_raise'], '0-1 RIR'),
    slot('aesthetic_reverse_pec_deck', 'aesthetic', 'reverse_pec_deck', 'critical', 2, 10, 20, '60-90 sec', 'Keep the traps quiet.', ['cable_rear_delt_fly', 'cable_face_pull'], '0-1 RIR'),
    slot('aesthetic_cable_fly', 'aesthetic', 'cable_fly', 'high', 2, 10, 15, '60-90 sec', 'Controlled stretch and squeeze.', ['pec_deck']),
    slot('aesthetic_straight_arm_pulldown', 'aesthetic', 'straight_arm_pulldown_cable', 'critical', 2, 10, 15, '60-90 sec', 'Drive straight arms to the hips.'),
    slot('aesthetic_tricep_pushdown', 'aesthetic', 'cable_tricep_pushdown', 'high', 2, 8, 15, '60-90 sec', 'Pin elbows and finish the lockout.', ['overhead_tricep_ext']),
    slot('aesthetic_hammer_curl', 'aesthetic', 'hammer_curl', 'high', 2, 8, 15, '60-90 sec', 'Neutral grip, controlled eccentric.', ['db_reverse_curl', 'cable_curl']),
    slot('aesthetic_db_shrug', 'aesthetic', 'db_shrug', 'aesthetic', 3, 8, 15, '60-90 sec', 'Elevate straight up without rolling.'),
    slot('aesthetic_wrist_extension', 'aesthetic', 'db_wrist_extension', 'aesthetic', 2, 12, 20, '60-90 sec', 'Light, controlled forearm work.'),
  ],
};
