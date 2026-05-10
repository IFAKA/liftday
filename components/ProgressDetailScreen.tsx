'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressFrontierGraph } from '@/components/ProgressFrontierGraph';
import { TopBar } from '@/components/TopBar';
import { getDefaultProgramSummary, loadProgramSummaryForData } from '@/lib/program-summary';
import { EffectiveVolumeEntry, OptimizationContext, WorkoutData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getWorkoutPatterns } from '@/lib/workout-utils';
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
    const summary = mounted ? loadProgramSummaryForData(data) : getDefaultProgramSummary(data);

    return {
      adaptation: summary.adaptation,
      diagnosis: summary.diagnosis,
      frontier: summary.frontier,
      prompt: summary.progressPrompt,
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

        <AdaptiveProgressPanel adaptation={progress.adaptation} />

        <WatchPanel subtle className="mt-3 bg-black/30">
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

function AdaptiveProgressPanel({ adaptation }: { adaptation: OptimizationContext }) {
  const topVolumes = adaptation.effectiveVolume
    .filter((entry) => entry.priorityRank <= 7)
    .slice(0, 5);
  const bottleneck = adaptation.recovery.bottleneck;
  const trend = adaptation.progression.find((entry) => entry.trend !== 'insufficient_data') ?? adaptation.progression[0];

  return (
    <WatchPanel subtle className="mt-3 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MetricCell label="velocity" value={adaptation.objectiveScore.toFixed(1)} />
        <MetricCell label="system" value={`${Math.round(adaptation.recovery.systemic * 100)}%`} />
        <MetricCell label="fatigue" value={`${Math.round(adaptation.fatigue.systemicFatigue * 100)}%`} />
      </div>

      <div>
        <p className="text-xs text-white/35 uppercase font-mono">Progression</p>
        <p className="mt-1 text-fluid-label font-mono uppercase text-white/55">
          {formatTrend(trend?.trend)} {trend?.velocity ? `${trend.velocity > 0 ? '+' : ''}${trend.velocity.toFixed(1)}%` : ''}
        </p>
        {bottleneck && (
          <p className="mt-1 text-fluid-label font-mono uppercase text-white/35">
            Bottleneck {bottleneck.muscle.replace('_', ' ')} at {Math.round(bottleneck.recoveryState * 100)}%
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/35 uppercase font-mono">Effective Volume</p>
        {topVolumes.map((entry) => (
          <VolumeRow key={entry.muscle} entry={entry} />
        ))}
      </div>
    </WatchPanel>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/25 px-2 py-2">
      <div className="text-[10px] font-mono uppercase text-white/25">{label}</div>
      <div className="text-fluid-ui font-black tabular-nums text-white/75">{value}</div>
    </div>
  );
}

function VolumeRow({ entry }: { entry: EffectiveVolumeEntry }) {
  const width = Math.max(5, Math.min(100, Math.round((entry.sets / entry.target) * 100)));
  const tone = entry.status === 'low' ? 'bg-amber-400' : entry.status === 'high' ? 'bg-red-400' : 'bg-green-400';

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate text-fluid-label font-mono uppercase text-white/35">
        {entry.muscle.replace('_', ' ')}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${width}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-fluid-label font-mono tabular-nums text-white/45">
        {entry.sets.toFixed(1)}
      </span>
    </div>
  );
}

function formatTrend(trend: string | undefined): string {
  return (trend ?? 'insufficient_data').replace('_', ' ');
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
