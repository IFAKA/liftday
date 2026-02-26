import { Exercise, MobilityExercise, MicroBreakExercise } from './types';

// PUSH DAY EXERCISES
export const PUSH_EXERCISES: Exercise[] = [
  {
    key: 'band_lateral_raise',
    name: 'BAND LATERAL RAISE',
    unit: 'reps',
    instruction: 'Stand on band, arms at sides. Raise arms out to sides to shoulder height, slight bend in elbows. Lower with control. 15-20 reps. #1 side delt width exercise.',
    youtubeId: '7_bIc8s_YDY',
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
];

// PULL DAY EXERCISES
export const PULL_EXERCISES: Exercise[] = [
  {
    key: 'pull_up',
    name: 'PULL-UP',
    unit: 'reps',
    instruction: 'Dead hang, hands shoulder-width or wider. Pull chest to bar, elbows drive down and back. Lower fully — full stretch at bottom is key for lat width. If needed, use a chair for assistance.',
    youtubeId: 'Hdc7Mw6BIEE',
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
];

// LEGS DAY EXERCISES
export const LEGS_EXERCISES: Exercise[] = [
  {
    key: 'bulgarian_split_squat',
    name: 'BULGARIAN SPLIT SQUAT',
    unit: 'reps',
    instruction: 'Rear foot elevated on chair/couch. Lower front knee to 90°. Press back up. Do all reps, switch legs.',
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
];

// All exercises combined
export const EXERCISES: Exercise[] = [...PUSH_EXERCISES, ...PULL_EXERCISES, ...LEGS_EXERCISES];

export const STORAGE_KEY = 'traindaily_sessions';
export const FIRST_SESSION_KEY = 'traindaily_first_session';
export const MOBILITY_DONE_KEY = 'traindaily_mobility_done';

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
