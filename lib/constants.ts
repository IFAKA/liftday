import { Exercise, MobilityExercise } from './types';

// PUSH DAY EXERCISES
export const PUSH_EXERCISES: Exercise[] = [
  {
    key: 'incline_pushup',
    name: 'INCLINE PUSH-UP',
    unit: 'reps',
    instruction: 'Hands in TRX handles at mid-height or against a wall. Body straight. Lower chest toward hands, press back up. Easier angle — build pushing mechanics here before going horizontal.',
    youtubeId: '4dF580BTZRY',
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
    key: 'pike_pushup',
    name: 'PIKE PUSH-UP',
    unit: 'reps',
    instruction: 'Pike position, hips high. Bend elbows, lower head toward floor. Press back up. Targets shoulders.',
    youtubeId: 'XckEEwa1BPI',
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
  {
    key: 'trx_y_raise',
    name: 'TRX Y RAISE',
    unit: 'reps',
    instruction: 'Face anchor, lean back. Raise arms into a Y overhead, thumbs up. Squeeze shoulder blades at top. Slow and controlled. Builds upper back width and rear delts.',
    youtubeId: 'SdSZwVpun28',
    workoutType: 'push',
  },
  {
    key: 'trx_upright_row',
    name: 'TRX UPRIGHT ROW',
    unit: 'reps',
    instruction: 'Face anchor, lean back 30°, overhand grip. Pull handles up to chin, elbows high and flared wide. Pause at top. Directly loads side delts and upper traps — the two muscles that widen the shoulder silhouette from the front.',
    workoutType: 'push',
  },
  {
    key: 'trx_shrug',
    name: 'TRX SHRUG',
    unit: 'reps',
    instruction: 'Face anchor, lean back 45°, arms straight. Keeping arms extended, elevate shoulders as high as possible. Hold 1 sec at top, lower slowly. Upper trap isolation — key for neck-to-shoulder thickness perceived as physical dominance.',
    workoutType: 'push',
  },
];

// PULL DAY EXERCISES
export const PULL_EXERCISES: Exercise[] = [
  {
    key: 'trx_row_steep',
    name: 'TRX ROW (STEEP)',
    unit: 'reps',
    instruction: 'Body nearly upright under TRX — feet only slightly in front of anchor. Pull chest to handles, squeeze shoulder blades. Easiest row angle. Build the pull pattern before going more horizontal.',
    youtubeId: 'fW_jdwZT804',
    workoutType: 'pull',
  },
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
    key: 'trx_t_raise',
    name: 'TRX T RAISE',
    unit: 'reps',
    instruction: 'Face anchor, lean back at 45°. Arms straight at sides, thumbs up. Raise both arms out to a T shape — shoulder height, no higher. Squeeze rear delts at top. Lower slowly. Primarily trains posterior deltoids and rotator cuff — critical for shoulder width from behind and healthy shoulder posture.',
    youtubeId: 'tO9uZImsiRw',
    workoutType: 'pull',
  },
  {
    key: 'trx_reverse_curl_assisted',
    name: 'TRX REVERSE CURL (ASSISTED)',
    unit: 'reps',
    instruction: 'Stand nearly upright facing anchor, slight lean back only. Palms down, arms extended. Curl handles toward shoulders. Upright angle reduces load — build the movement pattern here before adding weight via body angle. Brachioradialis + forearm extensors.',
    workoutType: 'pull',
  },
  {
    key: 'trx_reverse_curl',
    name: 'TRX REVERSE CURL',
    unit: 'reps',
    instruction: 'Face anchor, lean back to 45°, palms facing down, arms extended. Curl handles toward shoulders keeping wrists neutral. Full load version. Brachioradialis and forearm extensors — creates the visible forearm thickness seen in short sleeves.',
    workoutType: 'pull',
  },
];

// LEGS DAY EXERCISES
export const LEGS_EXERCISES: Exercise[] = [
  {
    key: 'trx_assisted_squat',
    name: 'TRX ASSISTED SQUAT',
    unit: 'reps',
    instruction: 'Hold TRX lightly for balance only — legs do all the work, TRX does NOT pull you up. Feet hip-width. Sit back and down to depth. Builds squat mechanics before unassisted work.',
    youtubeId: 'ul-yPBFwhnw',
    workoutType: 'legs',
  },
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
    key: 'glute_bridge',
    name: 'GLUTE BRIDGE',
    unit: 'reps',
    instruction: 'Lie on back, feet flat, knees bent. Drive hips up, squeeze glutes 1 second at top. Lower slowly with control. Foundation for TRX Hamstring Curl. Start with your weaker side if doing single-leg — match the rep count on both sides.',
    youtubeId: 'OB3jcUgqUSU',
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
    key: 'neck_iso_flex',
    name: 'NECK ISO — FRONT',
    unit: 'seconds',
    instruction: 'Sit tall. Both hands on forehead. Press head forward against hand resistance. Do NOT let head move — pure isometric. Hold 10 seconds per rep. Builds sternocleidomastoid and anterior neck — the visible front neck thickness.',
    workoutType: 'legs',
  },
  {
    key: 'neck_iso_ext',
    name: 'NECK ISO — BACK',
    unit: 'seconds',
    instruction: 'Clasp hands behind head. Press head backward against hand resistance. Hold 10 seconds per rep. Builds posterior neck extensors — directly increases neck circumference perceived as formidability.',
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
