import { Exercise, MobilityExercise, MicroBreakExercise } from './types';

// PUSH DAY EXERCISES
export const PUSH_EXERCISES: Exercise[] = [
  {
    key: 'trx_t_raise',
    name: 'TRX T RAISE',
    unit: 'reps',
    instruction: 'Face anchor, lean back at 45°. Arms straight at sides, thumbs up. Raise both arms out to a T shape — shoulder height, no higher. Squeeze rear delts at top. Lower slowly. Primarily trains posterior deltoids and rotator cuff — critical for shoulder width from behind and healthy shoulder posture.',
    youtubeId: 'tO9uZImsiRw',
    workoutType: 'push',
  },
  {
    key: 'pike_pushup',
    name: 'PIKE PUSH-UP',
    unit: 'reps',
    instruction: 'Pike position, hips high. Bend elbows, lower head toward floor. Press back up. Targets shoulders.',
    youtubeId: 'XckEEwa1BPI',
    workoutType: 'push',
  },
  {
    key: 'trx_y_raise',
    name: 'TRX Y RAISE',
    unit: 'reps',
    instruction: 'Face anchor, lean back. Raise arms into a Y overhead, thumbs up. Squeeze shoulder blades at top. Slow and controlled. Builds upper back width and rear delts.',
    youtubeId: 'SdSZwVpun28',
    workoutType: 'push',
  },
  {
    key: 'trx_pushup',
    name: 'TRX PUSH-UP',
    unit: 'reps',
    instruction: 'Hands in TRX handles, body straight. Lower chest between handles, press back up. Harder than regular pushups.',
    youtubeId: 'OlUqeytSoxE',
    workoutType: 'push',
  },
  {
    key: 'incline_pushup',
    name: 'INCLINE PUSH-UP',
    unit: 'reps',
    instruction: 'Hands in TRX handles at mid-height or against a wall. Body straight. Lower chest toward hands, press back up. Easier angle — build pushing mechanics here before going horizontal.',
    youtubeId: '4dF580BTZRY',
    workoutType: 'push',
  },
  {
    key: 'decline_pike_pushup',
    name: 'DECLINE PIKE PUSH-UP',
    unit: 'reps',
    instruction: 'Feet elevated on chair. Hips high in pike. Lower crown toward floor, press back up. Heavier overhead load than standard pike push-up.',
    youtubeId: 'XckEEwa1BPI',
    workoutType: 'push',
  },
];

// PULL DAY EXERCISES
export const PULL_EXERCISES: Exercise[] = [
  {
    key: 'trx_kneeling_lat_pulldown',
    name: 'TRX KNEELING LAT PULLDOWN',
    unit: 'reps',
    instruction: 'Kneel facing the anchor. Reach both arms overhead and grip handles. Pull elbows down and back to ribs — like a lat pulldown. Full stretch overhead at top is key for lat width. Walk knees back to make it harder.',
    youtubeId: 't2xgvi9BU1Q',
    workoutType: 'pull',
  },
  {
    key: 'trx_straight_arm_pulldown',
    name: 'TRX STRAIGHT-ARM PULLDOWN',
    unit: 'reps',
    instruction: 'Face anchor high above. Arms straight, lean forward slightly. Drive arms down to hips keeping elbows locked. Squeeze lats hard at bottom. This isolates the lats with a full stretch.',
    youtubeId: 'MrL7odiwMEY',
    workoutType: 'pull',
  },
  {
    key: 'trx_row',
    name: 'TRX ROW',
    unit: 'reps',
    instruction: 'Hang under TRX, body straight. Pull chest to handles, squeeze shoulder blades. Lower with control.',
    youtubeId: 'fW_jdwZT804',
    workoutType: 'pull',
  },
  {
    key: 'face_pull',
    name: 'TRX FACE PULL',
    unit: 'reps',
    instruction: 'Lean back holding TRX. Pull handles to face, elbows high and wide. Squeeze rear delts.',
    youtubeId: 'Jbyoxer58j4',
    workoutType: 'pull',
  },
  {
    key: 'trx_row_steep',
    name: 'TRX ROW (STEEP)',
    unit: 'reps',
    instruction: 'Body nearly upright under TRX — feet only slightly in front of anchor. Pull chest to handles, squeeze shoulder blades. Easiest row angle. Build the pull pattern before going more horizontal.',
    youtubeId: 'fW_jdwZT804',
    workoutType: 'pull',
  },
];

// LEGS DAY EXERCISES
export const LEGS_EXERCISES: Exercise[] = [
  {
    key: 'bulgarian_split_squat',
    name: 'BULGARIAN SPLIT SQUAT',
    unit: 'reps',
    instruction: 'Rear foot elevated on chair/couch. Lower front knee to 90°. Press back up. Start with your weaker leg — match the rep count on both sides, weaker side sets the cap.',
    youtubeId: 'hiLF_pF3EJM',
    workoutType: 'legs',
  },
  {
    key: 'pistol_squat_progression',
    name: 'PISTOL SQUAT PROGRESSION',
    unit: 'reps',
    instruction: 'One leg, hold TRX for balance. Lower slowly on one leg. Press back up. Switch legs each rep.',
    youtubeId: 'ul-yPBFwhnw',
    workoutType: 'legs',
  },
  {
    key: 'trx_hamstring_curl',
    name: 'TRX HAMSTRING CURL',
    unit: 'reps',
    instruction: 'Heels in TRX cradles, face up. Lift hips, curl heels to glutes. Extend legs. Keep hips up entire set.',
    youtubeId: 'JcJ2i2gUW3o',
    workoutType: 'legs',
  },
  {
    key: 'calf_raise',
    name: 'CALF RAISE',
    unit: 'reps',
    instruction: 'Stand on edge of step, hold TRX for balance. Raise up on toes. Lower heels below step. Full range.',
    youtubeId: 'k8ipHzKeAkQ',
    workoutType: 'legs',
  },
  {
    key: 'trx_assisted_squat',
    name: 'TRX ASSISTED SQUAT',
    unit: 'reps',
    instruction: 'Hold TRX lightly for balance only — legs do all the work, TRX does NOT pull you up. Feet hip-width. Sit back and down to depth. Builds squat mechanics before unassisted work.',
    youtubeId: 'ul-yPBFwhnw',
    workoutType: 'legs',
  },
  {
    key: 'glute_bridge',
    name: 'GLUTE BRIDGE',
    unit: 'reps',
    instruction: 'Lie on back, feet flat, knees bent. Drive hips up, squeeze glutes 1 second at top. Lower slowly with control. Foundation for TRX Hamstring Curl. Start with your weaker side if doing single-leg — match the rep count on both sides.',
    youtubeId: 'OB3jcUgqUSU',
    workoutType: 'legs',
  },
];

// All exercises combined
export const EXERCISES: Exercise[] = [...PUSH_EXERCISES, ...PULL_EXERCISES, ...LEGS_EXERCISES];

export const STORAGE_KEY = 'traindaily_sessions';
export const FIRST_SESSION_KEY = 'traindaily_first_session';
export const MOBILITY_DONE_KEY = 'traindaily_mobility_done';
export const USER_PROFILE_KEY = 'liftday_user_profile';

export const REST_DURATION = 90;

export const DEFAULT_TARGETS_REPS = [8, 8, 8] as const;

// Evidence-based mobility routine (2x/week, 10-15 min)
export const MOBILITY_EXERCISES: MobilityExercise[] = [
  {
    name: 'CAT-COW (DYNAMIC)',
    duration: 60,
    sides: false,
    instruction: 'On hands and knees. Arch back (cow), then round spine (cat). 20 slow reps. Breathe with movement.',
    youtubeId: 'iZ1eZBY4fwM',
  },
  {
    name: 'HIP FLEXOR STRETCH',
    duration: 60,
    sides: true,
    instruction: 'Kneel on one knee, push hips forward. Pulse gently 10x, then hold 20s. Active stretch.',
    youtubeId: 'iZ1eZBY4fwM',
  },
  {
    name: 'THORACIC ROTATION',
    duration: 60,
    sides: true,
    instruction: 'On all fours, hand behind head. Rotate open 15x each side. Full range, controlled.',
    youtubeId: 'QWwiOHexU8I',
  },
  {
    name: 'SCAPULAR CARS',
    duration: 60,
    sides: false,
    instruction: 'Standing. Move shoulder blades: up, back, down, forward. 10 circles each direction. Slow, controlled.',
    youtubeId: 'a9rqTzZaI7s',
  },
  {
    name: 'WRIST & ANKLE CIRCLES',
    duration: 60,
    sides: false,
    instruction: '10 circles each wrist (both directions). 10 circles each ankle. Shake out hands/feet after.',
    youtubeId: 'oMSVe7PWJ3o',
  },
  {
    name: 'DEEP SQUAT HOLD',
    duration: 60,
    sides: false,
    instruction: 'Deep squat, heels down if possible. Hold 30s. Stand, shake out. Repeat. Opens hips.',
    youtubeId: 'wPM8icPu6H8',
  },
  {
    name: 'CHEST OPENER (DYNAMIC)',
    duration: 60,
    sides: false,
    instruction: 'Clasp hands behind back. Lift arms up 20x. Then doorway stretch, pulse gently 15x. Active mobilization.',
    youtubeId: '8wiZpixdHPU',
  },
];

// Evidence-based micro-breaks (every 30 min, 2-3 min duration)
export const MICRO_BREAK_EXERCISES: MicroBreakExercise[] = [
  {
    name: 'WALK + ARM CIRCLES',
    duration: 150,
    instruction: 'Walk around room. Every 10 steps: 5 big arm circles forward, 5 backward. Keep moving entire time.',
    youtubeId: 'oMSVe7PWJ3o',
  },
  {
    name: 'WALK + LEG SWINGS',
    duration: 150,
    instruction: 'Walk 20 steps. Stop, hold wall. 10 leg swings each leg (forward/back). Repeat. Stay active.',
    youtubeId: 'QWwiOHexU8I',
  },
  {
    name: 'WALK + TORSO TWISTS',
    duration: 150,
    instruction: 'Walk while twisting torso side to side. Every 10 steps: 5 deep squats. Keep moving.',
    youtubeId: 'iZ1eZBY4fwM',
  },
  {
    name: 'STAIRS OR MARCHING',
    duration: 150,
    instruction: 'Walk up/down stairs if available. Otherwise: march in place, knees high. Add arm pumps. Continuous.',
    youtubeId: '8wiZpixdHPU',
  },
  {
    name: 'WALK + SHOULDER ROLLS',
    duration: 150,
    instruction: 'Walk continuously. Roll shoulders backward 10x, forward 10x. Shake arms out. Repeat while walking.',
    youtubeId: 'oMSVe7PWJ3o',
  },
];
