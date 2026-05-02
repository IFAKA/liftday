'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { EXERCISES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getRoutine } from '@/lib/routines';
import { scoreRoutine } from '@/lib/routine-score';
import { RoutineScoreResult } from '@/lib/smv';
import { getChainsForWorkout, resolveExerciseKey } from '@/lib/tiers';
import { ExerciseKey, RoutineConfig, UserProfile } from '@/lib/types';
import { getFirstSessionDate, loadUserProfile } from '@/lib/storage';
import { getSetsForWeek, getWeekNumber } from '@/lib/workout-utils';
import { WatchPanel, WatchSection } from './WatchSurface';

export function ProgramDetailScreen() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [{ smvScore, routine, profile, setsPerExercise }] = useState<{
    smvScore: RoutineScoreResult | null;
    routine: RoutineConfig | null;
    profile: UserProfile | null;
    setsPerExercise: number;
  }>(() => {
    if (typeof window === 'undefined') {
      return { smvScore: null, routine: null, profile: null, setsPerExercise: 3 };
    }

    const today = new Date();
    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'calisthenics');
    const weekNumber = getWeekNumber(getFirstSessionDate(), today);
    const setsPerExercise = getSetsForWeek(weekNumber, profile?.setsPerExercise);
    const tiers = profile?.tiers ?? {};

    return {
      smvScore: scoreRoutine(routine, { tiers, setsPerExercise }),
      routine,
      profile,
      setsPerExercise,
    };
  });

  async function handleCopyRoutine() {
    await copyText(formatRoutineForPrompt(routine, profile, setsPerExercise));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push('/program')} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Program Detail</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 no-scrollbar select-text flex flex-col gap-5">
        {smvScore && (
          <WatchSection title="Efficiency">
            <SmvOverview score={smvScore} verdict={getSmvVerdict(smvScore)} />
          </WatchSection>
        )}

        {routine && (
          <WatchSection title="Exercises">
            <RoutineSlots routine={routine} profile={profile} />
          </WatchSection>
        )}

        {smvScore && (
          <WatchSection title="Muscle Volume">
            <MuscleVolumeList score={smvScore} />
          </WatchSection>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopyRoutine}
          className={cn(
            'w-full rounded-xl border bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98]',
            copied && 'text-green-400 border-green-400/30 bg-green-400/10'
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="text-[11px] font-black uppercase tracking-widest font-mono">{copied ? 'Copied' : 'Copy Routine'}</span>
        </Button>
      </div>
    </div>
  );
}

function SmvOverview({
  score,
  verdict,
}: {
  score: RoutineScoreResult;
  verdict: { label: string; summary: string; nextAction: string; tone: string };
}) {
  return (
    <WatchPanel>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <span className={cn('text-fluid-label font-mono uppercase', verdict.tone)}>
            {verdict.label}
          </span>
          <p className="mt-1 text-fluid-ui font-black uppercase text-white">
            {verdict.summary}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums text-white">{formatOneDecimal(score.total)}</div>
          <div className="text-fluid-label font-mono text-white/30">{formatOneDecimal(score.efficiency)}/set</div>
        </div>
      </div>

      <p className="mb-4 text-fluid-label font-mono uppercase text-white/35">
        {verdict.nextAction}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <SmvMetric label="sets" value={formatOneDecimal(score.cost.totalSets)} />
        <SmvMetric label="moves" value={formatOneDecimal(score.cost.equipmentChanges)} />
        <SmvMetric label={score.penalty > 0 ? 'penalty' : 'cost'} value={score.penalty > 0 ? `-${formatOneDecimal(score.penalty)}` : formatOneDecimal(score.cost.total)} />
      </div>
    </WatchPanel>
  );
}

function RoutineSlots({ routine, profile }: { routine: RoutineConfig; profile: UserProfile | null }) {
  const tiers = profile?.tiers ?? {};

  return (
    <div className="flex flex-col gap-3">
      {(['push', 'pull', 'legs'] as const).map((workoutType) => {
        const chains = getChainsForWorkout(workoutType, routine.id);
        if (chains.length === 0) return null;

        return (
          <WatchPanel key={workoutType} subtle>
            <p className={cn('mb-3 text-fluid-label font-black uppercase', getWorkoutTone(workoutType))}>
              {workoutType}
            </p>
            <div className="flex flex-col gap-2">
              {chains.map((chain) => {
                const activeKey = resolveExerciseKey(chain, tiers);
                const active = getExerciseName(activeKey);
                return (
                  <div key={chain.slotId} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-fluid-label font-black uppercase text-white/70">{active}</p>
                      <p className="text-xs font-mono uppercase text-white/25">
                        {[chain.priority, formatCadence(chain.cadence)].filter(Boolean).join(' - ')}
                      </p>
                    </div>
                    <span className="shrink-0 text-fluid-label font-mono tabular-nums text-white/30">
                      T{tiers[chain.slotId] ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </WatchPanel>
        );
      })}
    </div>
  );
}

function MuscleVolumeList({ score }: { score: RoutineScoreResult }) {
  const muscles = Object.entries(score.breakdown)
    .filter(([, v]) => v.sets > 0 || v.penalty > 0)
    .sort(([, a], [, b]) => b.net - a.net);

  return (
    <WatchPanel subtle>
      <div className="flex flex-col gap-2">
        {muscles.map(([muscle, v]) => {
          const max = score.gross > 0 ? score.gross : 1;
          const barWidth = Math.max(4, Math.round((v.gross / max) * 100));
          const hasPenalty = v.penalty > 0;
          return (
            <div key={muscle} className="flex items-center gap-3">
              <span className="text-fluid-label font-mono text-white/30 w-20 shrink-0 uppercase truncate">
                {muscle.replace('_', ' ')}
              </span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', hasPenalty ? 'bg-red-400' : 'bg-white/40')}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className={cn('text-fluid-label font-mono tabular-nums w-8 text-right shrink-0', hasPenalty ? 'text-red-400' : 'text-white/40')}>
                {formatOneDecimal(v.net)}
              </span>
              <span className="text-fluid-label font-mono tabular-nums w-12 text-right shrink-0 text-white/25">
                {formatSetCount(v.sets)}/{v.target}
              </span>
            </div>
          );
        })}
      </div>
    </WatchPanel>
  );
}

function getSmvVerdict(score: RoutineScoreResult): { label: string; summary: string; nextAction: string; tone: string } {
  const lats = score.breakdown.lats;
  const sideDelt = score.breakdown.side_delt;
  const vTaperDeficit = (lats && lats.sets < lats.target) || (sideDelt && sideDelt.sets < sideDelt.target);
  const highVolume = score.cost.longSessionSets > 0 || score.cost.totalSets > 126;
  const highFriction = score.cost.equipmentChanges > 24;

  if (vTaperDeficit) {
    return {
      label: 'Needs tuning',
      summary: 'V-taper muscles are under target.',
      nextAction: 'Prioritize lats and side delts before adding chest or legs.',
      tone: 'text-yellow-400',
    };
  }

  if (highVolume || highFriction) {
    return {
      label: 'Good but costly',
      summary: highVolume ? 'The routine has high weekly volume.' : 'The routine has too many station changes.',
      nextAction: 'Keep the score, but trim low-priority sets if workouts feel long.',
      tone: 'text-yellow-400',
    };
  }

  return {
    label: 'Efficient',
    summary: 'Priority muscles are covered without excess cost.',
    nextAction: 'Keep progressing the current routine.',
    tone: 'text-green-400',
  };
}

function formatRoutineForPrompt(routine: RoutineConfig | null, profile: UserProfile | null, setsPerExercise: number): string {
  if (!routine) return 'No routine is currently selected.';
  const tiers = profile?.tiers ?? {};
  const lines = [
    '# Current training routine',
    '',
    `Routine: ${routine.name} (${routine.id})`,
    `Goal: ${profile?.goal ?? 'Not set'}`,
    `Profile: ${profile?.age ?? '?'} year old ${profile?.sex ?? 'unknown'}, ${profile?.heightCm ?? '?'} cm, ${profile?.weightKg ?? '?'} kg, ${profile?.bodyComposition ?? 'body composition not set'}`,
    `Training background: ${profile?.trainingBackground ?? 'Not set'}`,
    `Injuries/pain: ${profile?.injuryStatus ?? 'Not set'}`,
    `Gym access: ${profile?.gymAccess === false ? 'No' : 'Yes'}`,
    `Max workout time: ${profile?.maxWorkoutMinutes ?? '?'} minutes`,
    `Sets per exercise this week: ${setsPerExercise}`,
    `Weekly schedule: ${routine.schedule.map((wt, index) => `${dayName(index)} ${wt}`).join(', ')}, Sunday rest`,
    '',
    '## Exercise slots',
  ];

  for (const workoutType of ['push', 'pull', 'legs'] as const) {
    lines.push('', `### ${workoutType.toUpperCase()}`);
    const chains = getChainsForWorkout(workoutType, routine.id);
    for (const chain of chains) {
      const activeKey = resolveExerciseKey(chain, tiers);
      const active = getExerciseName(activeKey);
      const options = chain.exercises.map(getExerciseName).join(' -> ');
      const cadence = chain.cadence ? `; ${formatCadence(chain.cadence)}` : '';
      lines.push(`- ${chain.slotId}: ${active}; priority ${chain.priority}; ${chain.fixed ? 'fixed' : 'progression'}${cadence}; options ${options}`);
    }
  }

  return lines.join('\n');
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that expose the API but reject without a secure context.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function dayName(index: number): string {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index] ?? `Day ${index + 1}`;
}

function formatCadence(cadence?: RoutineConfig['tierChains'][number]['cadence']): string {
  if (cadence === 'first') return 'first weekly';
  if (cadence === 'second') return 'second weekly';
  return '';
}

function getExerciseName(key: ExerciseKey): string {
  return EXERCISES.find((exercise) => exercise.key === key)?.name ?? key;
}

function getWorkoutTone(workoutType: string): string {
  if (workoutType === 'push') return 'text-orange-400';
  if (workoutType === 'pull') return 'text-blue-400';
  return 'text-green-400';
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

function formatSetCount(value: number): string {
  const roundedUp = Math.ceil(value * 10) / 10;
  return roundedUp.toFixed(1);
}

function SmvMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2">
      <div className="text-fluid-label font-mono uppercase text-white/25">{label}</div>
      <div className="text-fluid-ui font-black tabular-nums text-white/70">{value}</div>
    </div>
  );
}
