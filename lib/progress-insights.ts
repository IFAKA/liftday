import { EXERCISES } from './constants';
import { RoutineScoreResult } from './smv';
import { DailyLog, Exercise, ExerciseKey, SetEntry, setEntryReps, setEntryWeight, WorkoutData, WorkoutSession } from './types';
import { getNutritionAdjustment } from './smv';

export interface ProgressSignal {
  label: string;
  summary: string;
  nextAction: string;
  tone: string;
}

export interface ProgressFrontierPoint {
  week: string;
  actual: number | null;
  projected: number | null;
  frontier: number | null;
}

export interface ProgressFrontier {
  points: ProgressFrontierPoint[];
  current: number | null;
  projected: number | null;
  frontier: number | null;
  weeklyTrend: number;
  frontierGap: number | null;
  action: ProgressSignal;
}

export interface ExerciseProgressDiagnosis {
  key: ExerciseKey;
  name: string;
  muscle: string;
  latest: number;
  previous: number;
  best: number;
  changePct: number;
  latestLabel: string;
  previousLabel: string;
  bestLabel: string;
  status: 'up' | 'flat' | 'down';
  action: string;
}

export interface MuscleVolumeDiagnosis {
  muscle: string;
  sets: number;
  target: number;
  deficit: number;
  action: string;
}

export interface ProgressDiagnosis {
  label: string;
  summary: string;
  tone: string;
  averageChangePct: number | null;
  improvingCount: number;
  flatCount: number;
  decliningCount: number;
  trackedCount: number;
  priorityExercises: ExerciseProgressDiagnosis[];
  volumeGaps: MuscleVolumeDiagnosis[];
  nextActions: string[];
}

export interface BodyTrendSummary {
  weightTrendKgPerWeek: number | null;
  waistTrendCmPerWeek: number | null;
  nutritionAction: string;
  recoveryAlert: string | null;
}

export interface RoutineAdjustmentDecision {
  label: string;
  summary: string;
  nextAction: string;
  automation: string;
  tone: string;
}

export function getProgressSignal(data: WorkoutData, exercises: Exercise[]): ProgressSignal {
  const tracked = exercises
    .filter((exercise) => ['lats', 'side_delt', 'chest', 'biceps', 'triceps'].includes(exercise.primaryMuscle))
    .map((exercise) => getExerciseProgress(data, exercise.key))
    .filter((entry): entry is { latest: number; previous: number } => entry !== null);

  if (tracked.length < 3) {
    return {
      label: 'Progress data',
      summary: 'Not enough logged history yet.',
      nextAction: 'Log 3 hard sets per exercise for two full weeks.',
      tone: 'text-white/40',
    };
  }

  const improving = tracked.filter((entry) => entry.latest > entry.previous * 1.02).length;
  const regressing = tracked.filter((entry) => entry.latest < entry.previous * 0.98).length;

  if (regressing >= 3) {
    return {
      label: 'Recovery limit',
      summary: 'Several priority lifts are trending down.',
      nextAction: 'Hold volume. Improve sleep, protein, and load selection.',
      tone: 'text-red-400',
    };
  }

  if (improving >= Math.ceil(tracked.length / 2)) {
    return {
      label: 'Frontier push',
      summary: 'Priority lifts are progressing.',
      nextAction: 'Keep the routine and add load or reps when targets are hit.',
      tone: 'text-green-400',
    };
  }

  return {
    label: 'Stable',
    summary: 'Progress is flat but not crashing.',
    nextAction: 'Keep volume fixed. Chase cleaner reps before adding exercises.',
    tone: 'text-yellow-400',
  };
}

export function getProgressDiagnosis(
  data: WorkoutData,
  exercises: Exercise[],
  score: RoutineScoreResult
): ProgressDiagnosis {
  const exerciseProgress = exercises
    .map((exercise) => getExerciseDiagnosis(data, exercise))
    .filter((entry): entry is ExerciseProgressDiagnosis => entry !== null);
  const meaningful = exerciseProgress.filter((entry) => Math.abs(entry.changePct) >= 1);
  const averageChangePct = meaningful.length === 0
    ? null
    : roundOneDecimal(average(meaningful.map((entry) => entry.changePct)));
  const improving = exerciseProgress.filter((entry) => entry.status === 'up');
  const flat = exerciseProgress.filter((entry) => entry.status === 'flat');
  const declining = exerciseProgress.filter((entry) => entry.status === 'down');
  const volumeGaps = getVolumeGaps(score);
  const priorityExercises = [
    ...declining.sort((a, b) => a.changePct - b.changePct),
    ...flat.sort((a, b) => a.changePct - b.changePct),
    ...improving.sort((a, b) => b.changePct - a.changePct),
  ].slice(0, 5);

  const nextActions = getDiagnosisActions(priorityExercises, volumeGaps);

  if (exerciseProgress.length < 3) {
    return {
      label: 'Need more logs',
      summary: 'Log the same exercises for two weeks before judging progress.',
      tone: 'text-white/45',
      averageChangePct,
      improvingCount: improving.length,
      flatCount: flat.length,
      decliningCount: declining.length,
      trackedCount: exerciseProgress.length,
      priorityExercises,
      volumeGaps,
      nextActions,
    };
  }

  if (declining.length >= 3 || (averageChangePct !== null && averageChangePct < -2)) {
    return {
      label: 'Underperforming',
      summary: `${declining.length} tracked exercises dropped versus last time.`,
      tone: 'text-red-400',
      averageChangePct,
      improvingCount: improving.length,
      flatCount: flat.length,
      decliningCount: declining.length,
      trackedCount: exerciseProgress.length,
      priorityExercises,
      volumeGaps,
      nextActions,
    };
  }

  if (averageChangePct !== null && averageChangePct >= 8 && improving.length >= Math.ceil(exerciseProgress.length / 2)) {
    return {
      label: 'Overperforming',
      summary: 'Progress is moving fast. Keep jumps small so form does not decay.',
      tone: 'text-sky-400',
      averageChangePct,
      improvingCount: improving.length,
      flatCount: flat.length,
      decliningCount: declining.length,
      trackedCount: exerciseProgress.length,
      priorityExercises,
      volumeGaps,
      nextActions,
    };
  }

  if (improving.length >= Math.ceil(exerciseProgress.length / 2)) {
    return {
      label: 'Doing well',
      summary: `${improving.length} of ${exerciseProgress.length} tracked exercises improved.`,
      tone: 'text-green-400',
      averageChangePct,
      improvingCount: improving.length,
      flatCount: flat.length,
      decliningCount: declining.length,
      trackedCount: exerciseProgress.length,
      priorityExercises,
      volumeGaps,
      nextActions,
    };
  }

  return {
    label: 'Flat',
    summary: 'Progress is not falling, but most exercises are not moving up yet.',
    tone: 'text-yellow-400',
    averageChangePct,
    improvingCount: improving.length,
    flatCount: flat.length,
    decliningCount: declining.length,
    trackedCount: exerciseProgress.length,
    priorityExercises,
    volumeGaps,
    nextActions,
  };
}

export function getRoutineAdjustmentDecision(
  data: WorkoutData,
  diagnosis: ProgressDiagnosis,
  score: RoutineScoreResult,
  progressSignal: ProgressSignal | null
): RoutineAdjustmentDecision {
  const loggedSessions = Object.values(data).filter((session) => session.logged_at).length;
  const priorityDeficit = getPriorityDeficit(score);
  const costly = score.cost.longSessionSets > 0 || score.cost.equipmentChanges > 24 || score.cost.totalSets > 126;

  if (loggedSessions < 12 || diagnosis.trackedCount < 3) {
    return {
      label: 'Build baseline',
      summary: 'Do not tweak the routine yet.',
      nextAction: 'Repeat the same slots until two full weeks are logged.',
      automation: 'Auto-update reps and load only.',
      tone: 'text-white/45',
    };
  }

  if (progressSignal?.label === 'Recovery limit' || diagnosis.label === 'Underperforming') {
    return {
      label: 'Hold structure',
      summary: 'Progress is limited by recovery, not exercise choice.',
      nextAction: 'Keep exercises fixed. Reduce load jumps and protect sleep, food, and rest.',
      automation: 'Block added volume for now.',
      tone: 'text-red-400',
    };
  }

  if (progressSignal?.label === 'Frontier push' || diagnosis.label === 'Doing well' || diagnosis.label === 'Overperforming') {
    return {
      label: 'No routine tweak',
      summary: 'Priority lifts are moving.',
      nextAction: 'Keep the split and let targets climb when sets hit the rep range.',
      automation: 'Auto-progress load/reps, not slots.',
      tone: 'text-green-400',
    };
  }

  if (priorityDeficit && diagnosis.decliningCount === 0) {
    return {
      label: 'Review volume',
      summary: `${priorityDeficit.label} is below target.`,
      nextAction: `If this stays flat for two more sessions, add targeted ${priorityDeficit.label} work.`,
      automation: 'Recommend before changing.',
      tone: 'text-yellow-400',
    };
  }

  if (costly) {
    return {
      label: 'Trim cost',
      summary: 'The routine is more expensive than it needs to be.',
      nextAction: 'Keep priority lifts. Remove low-priority work only if sessions run long.',
      automation: 'Ask before removing slots.',
      tone: 'text-yellow-400',
    };
  }

  return {
    label: 'Hold routine',
    summary: 'Progress is stable enough to keep the plan.',
    nextAction: 'Chase cleaner reps before adding exercises or swapping slots.',
    automation: 'Auto-update targets only.',
    tone: 'text-yellow-400',
  };
}

export function getProgressFrontier(
  data: WorkoutData,
  exercises: Exercise[],
  score: RoutineScoreResult,
  progressSignal: ProgressSignal | null
): ProgressFrontier {
  const actual = getWeeklyProgressIndex(data, exercises);
  const lastActual = actual[actual.length - 1];
  const previousActual = actual[actual.length - 2];
  const trend = lastActual && previousActual ? clamp(lastActual.actual - previousActual.actual, -4, 6) : 0;
  const baselineTrend = Math.max(1.5, trend);
  const frontierTrend = getFrontierTrend(score, progressSignal);
  const current = lastActual?.actual ?? null;
  const projectedEnd = current === null ? null : roundOneDecimal(current + baselineTrend * 4);
  const frontierEnd = current === null ? null : roundOneDecimal(current + frontierTrend * 4);
  const futurePoints = current === null
    ? []
    : Array.from({ length: 4 }, (_, index) => {
      const weekNumber = actual.length + index + 1;
      return {
        week: `W${weekNumber}`,
        actual: null,
        projected: roundOneDecimal(current + baselineTrend * (index + 1)),
        frontier: roundOneDecimal(current + frontierTrend * (index + 1)),
      };
    });

  const points: ProgressFrontierPoint[] = [
    ...actual.map((point, index) => ({
      week: `W${index + 1}`,
      actual: point.actual,
      projected: index === actual.length - 1 ? point.actual : null,
      frontier: index === actual.length - 1 ? point.actual : null,
    })),
    ...futurePoints,
  ];

  return {
    points,
    current,
    projected: projectedEnd,
    frontier: frontierEnd,
    weeklyTrend: roundOneDecimal(trend),
    frontierGap: projectedEnd === null || frontierEnd === null ? null : roundOneDecimal(frontierEnd - projectedEnd),
    action: getFrontierAction(score, progressSignal, projectedEnd, frontierEnd),
  };
}

export function scoreSessionSets(sets: SetEntry[]): number {
  if (sets.length === 0) return 0;
  const scores = sets.map((entry) => {
    const reps = setEntryReps(entry);
    const weight = setEntryWeight(entry);
    return weight === null ? reps : reps * Math.max(1, weight);
  });
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function getBodyTrendSummary(logs: Record<string, DailyLog>): BodyTrendSummary {
  const ordered = Object.values(logs).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const latest14 = ordered.slice(-14);
  const first7 = latest14.slice(0, 7);
  const last7 = latest14.slice(-7);
  const weightTrendKgPerWeek = getTrend(first7, last7, 'morningWeightKg');
  const waistTrendCmPerWeek = getTrend(first7, last7, 'waistCm');
  const highWaistWeeks = waistTrendCmPerWeek !== null && waistTrendCmPerWeek > 0.5 ? 2 : 0;
  const nutrition = getNutritionAdjustment(waistTrendCmPerWeek ?? 0, highWaistWeeks);
  const fatigueDays = ordered.slice(-3).filter((log) => (log.fatigue ?? 0) >= 4).length;
  const poorSleepDays = ordered.slice(-3).filter((log) => (log.sleepHours ?? 8) < 6.5).length;
  const jointPain = ordered.slice(-3).some((log) => log.jointPain);

  return {
    weightTrendKgPerWeek,
    waistTrendCmPerWeek,
    nutritionAction: nutrition.calorieDelta < 0 ? 'Reduce calories by 100-150/day.' : 'Keep +200-300 kcal and 140-160 g protein.',
    recoveryAlert: jointPain
      ? 'Joint pain logged: deload now.'
      : fatigueDays >= 3 || poorSleepDays >= 3
        ? 'Recovery warning: cut sets 30-50% and use 3-4 RIR.'
        : null,
  };
}

function getTrend(logsA: DailyLog[], logsB: DailyLog[], key: 'morningWeightKg' | 'waistCm'): number | null {
  const avgA = averageDefined(logsA.map((log) => log[key]));
  const avgB = averageDefined(logsB.map((log) => log[key]));
  if (avgA === null || avgB === null) return null;
  return roundOneDecimal(avgB - avgA);
}

function averageDefined(values: (number | undefined)[]): number | null {
  const present = values.filter((value): value is number => typeof value === 'number');
  if (present.length === 0) return null;
  return average(present);
}

export function formatProgressForPrompt(data: WorkoutData, exercises: Exercise[], progressSignal: ProgressSignal | null): string {
  const sessions = Object.entries(data)
    .filter(([, session]) => session.logged_at)
    .sort(([a], [b]) => b.localeCompare(a));

  const lines = [
    '# Current training progress',
    '',
    `Logged sessions: ${sessions.length}`,
  ];

  if (progressSignal) {
    lines.push(`Progress signal: ${progressSignal.label} - ${progressSignal.summary} ${progressSignal.nextAction}`);
  }

  lines.push('', '## Best sets');
  const bestSets = getBestSets(data, exercises);
  if (bestSets.length === 0) {
    lines.push('- No logged sets yet.');
  } else {
    for (const entry of bestSets) {
      lines.push(`- ${entry.exercise}: ${entry.value}`);
    }
  }

  lines.push('', '## Recent sessions');
  if (sessions.length === 0) {
    lines.push('- No logged sessions yet.');
  } else {
    for (const [date, session] of sessions.slice(0, 12)) {
      lines.push(`- ${date} ${session.workout_type}: ${formatSessionSummary(session)}`);
    }
  }

  return lines.join('\n');
}

function getExerciseProgress(data: WorkoutData, key: ExerciseKey): { latest: number; previous: number } | null {
  const scored = Object.keys(data)
    .filter((date) => data[date]?.[key]?.length)
    .sort()
    .map((date) => {
      const sets = data[date]?.[key] ?? [];
      return scoreSessionSets(sets);
    })
    .filter((score) => score > 0);

  if (scored.length < 2) return null;
  return {
    previous: scored[scored.length - 2],
    latest: scored[scored.length - 1],
  };
}

function getExerciseDiagnosis(data: WorkoutData, exercise: Exercise): ExerciseProgressDiagnosis | null {
  const sessions = Object.keys(data)
    .filter((date) => data[date]?.[exercise.key]?.length)
    .sort()
    .map((date) => {
      const sets = data[date]?.[exercise.key] ?? [];
      return {
        score: scoreSessionSets(sets),
        bestSet: getBestSetScore(sets),
        label: formatBestSet(sets, exercise),
      };
    })
    .filter((entry) => entry.score > 0);

  if (sessions.length < 2) return null;

  const previous = sessions[sessions.length - 2];
  const latest = sessions[sessions.length - 1];
  const best = sessions.reduce((max, entry) => Math.max(max, entry.bestSet), 0);
  const bestLabel = sessions
    .filter((entry) => entry.bestSet === best)
    .at(-1)?.label ?? latest.label;
  const changePct = previous.score === 0 ? 0 : roundOneDecimal(((latest.score - previous.score) / previous.score) * 100);
  const status = changePct > 2 ? 'up' : changePct < -2 ? 'down' : 'flat';

  return {
    key: exercise.key,
    name: exercise.name,
    muscle: formatMuscleName(exercise.primaryMuscle),
    latest: roundOneDecimal(latest.score),
    previous: roundOneDecimal(previous.score),
    best: roundOneDecimal(best),
    changePct,
    latestLabel: latest.label,
    previousLabel: previous.label,
    bestLabel,
    status,
    action: getExerciseAction(status, exercise),
  };
}

function getWeeklyProgressIndex(data: WorkoutData, exercises: Exercise[]): { actual: number }[] {
  const exerciseKeys = new Set(exercises.map((exercise) => exercise.key));
  const baselineByExercise: Partial<Record<ExerciseKey, number>> = {};
  const weekScores: Record<string, number[]> = {};

  for (const [date, session] of Object.entries(data).sort(([a], [b]) => a.localeCompare(b))) {
    if (!session.logged_at) continue;
    const week = getProgressWeekKey(date);

    for (const key of exerciseKeys) {
      const sets = session[key];
      if (!sets || sets.length === 0) continue;
      const sessionScore = scoreSessionSets(sets);
      if (sessionScore <= 0) continue;
      baselineByExercise[key] ??= sessionScore;
      const baseline = baselineByExercise[key];
      if (!baseline) continue;
      weekScores[week] ??= [];
      weekScores[week].push((sessionScore / baseline) * 100);
    }
  }

  return Object.keys(weekScores)
    .sort()
    .slice(-8)
    .map((week) => ({
      actual: roundOneDecimal(average(weekScores[week])),
    }));
}

function getBestSetScore(sets: SetEntry[]): number {
  return Math.max(...sets.map((entry) => {
    const reps = setEntryReps(entry);
    const weight = setEntryWeight(entry);
    return weight === null ? reps : reps * Math.max(1, weight);
  }));
}

function formatBestSet(sets: SetEntry[], exercise: Exercise): string {
  const best = sets
    .map((entry) => {
      const reps = setEntryReps(entry);
      const weight = setEntryWeight(entry);
      const score = weight === null ? reps : reps * Math.max(1, weight);
      const label = weight === null
        ? `${reps} ${exercise.unit === 'seconds' ? 'sec' : 'reps'}`
        : `${weight}kg x ${reps}`;
      return { score, label };
    })
    .sort((a, b) => b.score - a.score)[0];

  return best?.label ?? '--';
}

function getExerciseAction(status: ExerciseProgressDiagnosis['status'], exercise: Exercise): string {
  if (status === 'up') return 'Keep the same slot. Add the smallest load or rep jump only after all sets hit target.';
  if (status === 'down') return exercise.unit === 'weighted'
    ? 'Repeat the previous weight next session. Stop adding load until reps return.'
    : 'Repeat the same variation next session. Stop advancing tiers until reps return.';
  return exercise.unit === 'weighted'
    ? 'Use the same weight and add 1 rep across the first working sets.'
    : 'Use the same variation and add 1 clean rep or 5 seconds total.';
}

function getVolumeGaps(score: RoutineScoreResult): MuscleVolumeDiagnosis[] {
  return Object.entries(score.breakdown)
    .map(([muscle, entry]) => {
      if (!entry) return null;
      const deficit = roundOneDecimal(Math.max(0, entry.target - entry.sets));
      if (deficit === 0) return null;
      const label = formatMuscleName(muscle as Exercise['primaryMuscle']);
      return {
        muscle: label,
        sets: entry.sets,
        target: entry.target,
        deficit,
        action: `Add ${deficit} quality set${deficit === 1 ? '' : 's'} per week for ${label}.`,
      };
    })
    .filter((entry): entry is MuscleVolumeDiagnosis => entry !== null)
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 4);
}

function getDiagnosisActions(
  exercises: ExerciseProgressDiagnosis[],
  volumeGaps: MuscleVolumeDiagnosis[]
): string[] {
  const actions: string[] = [];
  const declining = exercises.find((entry) => entry.status === 'down');
  const flat = exercises.find((entry) => entry.status === 'flat');

  if (declining) actions.push(`${declining.name}: ${declining.action}`);
  if (flat) actions.push(`${flat.name}: ${flat.action}`);
  if (volumeGaps[0]) actions.push(volumeGaps[0].action);
  if (actions.length === 0) actions.push('Keep the routine fixed and progress load or reps gradually.');

  return actions.slice(0, 3);
}

function formatMuscleName(muscle: Exercise['primaryMuscle']): string {
  return muscle.replaceAll('_', ' ');
}

function getProgressWeekKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - yearStart.getTime()) / 86400000);
  return `${date.getFullYear()}-${String(Math.floor(days / 7) + 1).padStart(2, '0')}`;
}

function getFrontierTrend(score: RoutineScoreResult, progressSignal: ProgressSignal | null): number {
  const recoveryLimited = progressSignal?.label === 'Recovery limit';
  const underTarget = Object.values(score.breakdown).filter((entry) => entry && entry.sets < entry.target).length;
  const costly = score.cost.longSessionSets > 0 || score.cost.equipmentChanges > 24 || score.cost.totalSets > 126;

  if (recoveryLimited) return 1.2;
  if (underTarget >= 4) return 3.2;
  if (costly) return 2.2;
  return 2.6;
}

function getFrontierAction(
  score: RoutineScoreResult,
  progressSignal: ProgressSignal | null,
  projected: number | null,
  frontier: number | null
): ProgressSignal {
  const priorityDeficit = getPriorityDeficit(score);

  if (progressSignal?.label === 'Recovery limit') {
    return {
      label: 'Reach the line',
      summary: 'Projection is recovery-limited.',
      nextAction: 'Hold sets steady. Fix sleep, protein, and load jumps before adding work.',
      tone: 'text-red-400',
    };
  }

  if (priorityDeficit) {
    return {
      label: 'Reach the line',
      summary: `${priorityDeficit.label} is below efficient volume.`,
      nextAction: `Add quality work for ${priorityDeficit.label}, then reassess after 2 weeks.`,
      tone: 'text-yellow-400',
    };
  }

  if (projected !== null && frontier !== null && frontier - projected > 5) {
    return {
      label: 'Reach the line',
      summary: 'Your trend is below the efficient frontier.',
      nextAction: 'Keep exercise count fixed and progress load or reps on priority lifts first.',
      tone: 'text-yellow-400',
    };
  }

  return {
    label: 'On frontier',
    summary: 'Your routine score and progress trend are aligned.',
    nextAction: 'Keep the current split. Add weight or reps only when form stays clean.',
    tone: 'text-green-400',
  };
}

function getPriorityDeficit(score: RoutineScoreResult): { label: string; deficit: number } | null {
  const priority: [keyof RoutineScoreResult['breakdown'], string][] = [
    ['lats', 'lats'],
    ['side_delt', 'side delts'],
    ['chest', 'chest'],
    ['biceps', 'biceps'],
    ['glutes', 'glutes'],
  ];

  return priority
    .map(([muscle, label]) => {
      const entry = score.breakdown[muscle];
      return entry && entry.sets < entry.target ? { label, deficit: entry.target - entry.sets } : null;
    })
    .filter((entry): entry is { label: string; deficit: number } => entry !== null)
    .sort((a, b) => b.deficit - a.deficit)[0] ?? null;
}

function getBestSets(data: WorkoutData, exercises: Exercise[]): { exercise: string; value: string }[] {
  return exercises
    .map((exercise) => {
      let bestScore = 0;
      let bestValue = '';
      for (const session of Object.values(data)) {
        const sets = session[exercise.key];
        if (!sets) continue;
        for (const set of sets) {
          const reps = setEntryReps(set);
          const weight = setEntryWeight(set);
          const score = weight === null ? reps : weight * reps;
          if (score > bestScore) {
            bestScore = score;
            bestValue = weight === null ? `${reps} ${exercise.unit === 'seconds' ? 'sec' : 'reps'}` : `${weight}kg x ${reps}`;
          }
        }
      }
      return bestValue ? { exercise: exercise.name, value: bestValue } : null;
    })
    .filter((entry): entry is { exercise: string; value: string } => entry !== null);
}

function formatSessionSummary(session: WorkoutSession): string {
  const entries = EXERCISES
    .map((exercise) => {
      const sets = session[exercise.key];
      if (!sets || sets.length === 0) return null;
      const formatted = sets
        .map((set) => {
          const reps = setEntryReps(set);
          const weight = setEntryWeight(set);
          return weight === null ? String(reps) : `${weight}kgx${reps}`;
        })
        .join('/');
      return `${exercise.name} ${formatted}`;
    })
    .filter((entry): entry is string => entry !== null);
  return entries.length > 0 ? entries.join('; ') : 'no set details';
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
