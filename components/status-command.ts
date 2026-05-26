import type { OptimizationContext } from '@/lib/types';
import type { ProgressDiagnosis, ProgressFrontier, ProgressSignal, RoutineAdjustmentDecision } from '@/lib/progress-insights';

export interface ProgramStatusCommand {
  label: string;
  title: string;
  summary: string;
  action: string;
  routineTitle: string;
  routineSummary: string;
  routineAction: string;
  tone: string;
}

export interface ProgressStatusCommand {
  label: string;
  title: string;
  summary: string;
  action: string;
  tone: string;
  mixedPace: boolean;
}

export function getProgramStatusCommand(
  adaptation: OptimizationContext,
  routineDecision: RoutineAdjustmentDecision | null
): ProgramStatusCommand {
  const recommendation = adaptation.recommendations[0];

  if (recommendation.action === 'deload' || recommendation.title === 'Deload First') {
    return {
      label: 'Command',
      title: 'Deload today',
      summary: 'Recent output is down and risk is elevated. Train lighter before pushing again.',
      action: 'Same exercises. Reduce load or effort. No PR attempts. No added volume.',
      routineTitle: 'Keep routine',
      routineSummary: 'Routine is fine. Make today easier, don\'t redesign the plan.',
      routineAction: routineDecision?.automation ?? 'Block added volume for now.',
      tone: 'text-red-400',
    };
  }

  return {
    label: 'Command',
    title: renameRoutineVerdict(recommendation.title),
    summary: recommendation.summary,
    action: recommendation.reason,
    routineTitle: renameRoutineVerdict(routineDecision?.label ?? 'Keep routine'),
    routineSummary: routineDecision?.summary ?? 'Keep today simple and follow the current plan.',
    routineAction: routineDecision?.nextAction ?? 'Progress load or reps only when the target is hit.',
    tone: recommendation.action === 'add_volume'
      ? 'text-green-400'
      : recommendation.action === 'reduce_volume' || recommendation.action === 'swap_exercise'
        ? 'text-yellow-400'
        : routineDecision?.tone ?? 'text-white/45',
  };
}

export function getProgressStatusCommand(
  signal: ProgressSignal,
  diagnosis: ProgressDiagnosis,
  frontier: ProgressFrontier
): ProgressStatusCommand {
  const cautious = signal.label === 'Recovery limit' || diagnosis.label === 'Underperforming' || diagnosis.decliningCount >= 3;
  const aheadPace = isAheadPace(frontier);

  if (cautious && aheadPace) {
    return {
      label: 'Command',
      title: 'Score up, lifts down',
      summary: 'Your weekly score rose, but recent priority lifts dropped.',
      action: 'Hold routine. Keep jumps small and improve recovery.',
      tone: 'text-yellow-400',
      mixedPace: true,
    };
  }

  if (cautious) {
    return {
      label: 'Command',
      title: 'Recover first',
      summary: signal.summary,
      action: signal.nextAction,
      tone: 'text-red-400',
      mixedPace: false,
    };
  }

  return {
    label: 'Command',
    title: signal.summary,
    summary: diagnosis.summary,
    action: signal.nextAction,
    tone: signal.tone,
    mixedPace: false,
  };
}

function isAheadPace(frontier: ProgressFrontier): boolean {
  if (frontier.current === null || frontier.frontier === null) return false;
  const idealPace = (frontier.frontier - frontier.current) / 4;
  return idealPace - frontier.weeklyTrend < -1;
}

function renameRoutineVerdict(label: string): string {
  if (label === 'Hold structure') return 'Keep routine';
  if (label === 'No routine tweak') return 'Keep routine';
  if (label === 'Hold Course') return 'Keep routine';
  return label;
}
