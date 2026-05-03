'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressFrontierGraph } from '@/components/ProgressFrontierGraph';
import { TopBar } from '@/components/TopBar';
import { EXERCISES } from '@/lib/constants';
import { formatProgressForPrompt, getProgressDiagnosis, getProgressFrontier, getProgressSignal } from '@/lib/progress-insights';
import { optimizeRoutineForFrontier } from '@/lib/frontier-optimizer';
import { getRoutine } from '@/lib/routines';
import { getFirstSessionDate, loadUserProfile } from '@/lib/storage';
import { resolveExerciseKey } from '@/lib/tiers';
import { WorkoutData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getSetsForWeek, getWeekNumber, getWorkoutPatterns } from '@/lib/workout-utils';
import { WatchPanel } from './WatchSurface';

export function ProgressDetailScreen({ data }: { data: WorkoutData }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const patterns = useMemo(() => getWorkoutPatterns(data), [data]);
  const progress = useMemo(() => {
    if (!mounted) return getDefaultProgress(data);
    const today = new Date();
    const profile = loadUserProfile();
    const baseRoutine = getRoutine(profile?.activeRoutine ?? 'calisthenics');
    const weekNumber = getWeekNumber(getFirstSessionDate(), today);
    const setsPerExercise = getSetsForWeek(weekNumber, profile?.setsPerExercise);
    const tiers = profile?.tiers ?? {};
    const optimizer = optimizeRoutineForFrontier(baseRoutine, profile, data, setsPerExercise);
    const routine = optimizer.routine;
    const weeklyExercises = routine.tierChains
      .map((chain) => {
        const key = resolveExerciseKey(chain, tiers);
        return EXERCISES.find((e) => e.key === key)!;
      })
      .filter(Boolean);
    const score = optimizer.score;
    const signal = getProgressSignal(data, weeklyExercises);
    const diagnosis = getProgressDiagnosis(data, weeklyExercises, score);

    return {
      diagnosis,
      frontier: getProgressFrontier(data, weeklyExercises, score, signal),
      prompt: formatProgressForPrompt(data, weeklyExercises, signal),
    };
  }, [data, mounted]);

  async function handleCopyProgress() {
    await copyText(progress.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push('/history')} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Progress Detail</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopyProgress}
          className={cn(
            'mb-3 w-full rounded-xl border bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98]',
            copied && 'text-green-400 border-green-400/30 bg-green-400/10'
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="text-[11px] font-black uppercase tracking-widest font-mono">{copied ? 'Copied' : 'Copy Progress'}</span>
        </Button>

        <WatchPanel subtle className="bg-black/30">
          <ProgressFrontierGraph frontier={progress.frontier} diagnosis={progress.diagnosis} />
        </WatchPanel>

        {patterns.sessionCount >= 3 && (
          <WatchPanel subtle className="mt-3 space-y-2">
            <p className="text-xs text-white/35 uppercase font-mono">Patterns</p>
            {patterns.usualDays.length > 0 && (
              <p className="text-fluid-label text-white/45 font-mono">
                Usually trains <span className="text-white">{patterns.usualDays.join(' · ')}</span>
              </p>
            )}
            {patterns.avgStartHour !== null && (
              <p className="text-fluid-label text-white/45 font-mono flex items-center gap-2">
                <span>Usually at <span className="text-white">{formatHour(patterns.avgStartHour)}</span></span>
                {patterns.isPeakHour && (
                  <span className="text-[10px] text-amber-400 border border-amber-400/30 rounded px-1.5 py-0.5">
                    peak hours
                  </span>
                )}
              </p>
            )}
            {patterns.avgDurationMin !== null && (
              <p className="text-fluid-label text-white/45 font-mono">
                Avg session <span className="text-white">{patterns.avgDurationMin} min</span>
              </p>
            )}
          </WatchPanel>
        )}
      </div>
    </div>
  );
}

function getDefaultProgress(data: WorkoutData) {
  const routine = getRoutine('gym');
  const weeklyExercises = routine.tierChains
    .map((chain) => EXERCISES.find((e) => e.key === resolveExerciseKey(chain, {}))!)
    .filter(Boolean);
  const score = optimizeRoutineForFrontier(routine, null, data, 3).score;
  const signal = getProgressSignal(data, weeklyExercises);

  return {
    diagnosis: getProgressDiagnosis(data, weeklyExercises, score),
    frontier: getProgressFrontier(data, weeklyExercises, score, signal),
    prompt: formatProgressForPrompt(data, weeklyExercises, signal),
  };
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

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${period}`;
}
