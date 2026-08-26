'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { WatchBackButton, WatchMetricCell, WatchMetricGrid, WatchPanel, WatchScreen, WatchSignalPanel } from '@/components/WatchSurface';
import {
  formatBodyChange,
  formatBodyMeasurement,
  getBodyMeasurementDefinition,
  getLatestMeasurementValue,
  getMeasurementHistory,
  getWeeklyMeasurementSeries,
  roundBodyValue,
  type BodyMeasurementPoint,
  type BodyWeeklyPoint,
} from '@/lib/body-progress';
import { getDefaultProfile, loadDailyLogs, loadUserProfile } from '@/lib/storage';
import type { DailyLog, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BodyMeasurementSnapshot {
  profile: UserProfile;
  logs: Record<string, DailyLog>;
}

export function BodyMeasurementDetailScreen() {
  const { measurement } = useParams<{ measurement: string }>();
  const [snapshot, setSnapshot] = useState<BodyMeasurementSnapshot>(() => ({
    profile: getDefaultProfile(),
    logs: {},
  }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot({
      profile: loadUserProfile() ?? getDefaultProfile(),
      logs: loadDailyLogs(),
    });
  }, []);

  const definition = getBodyMeasurementDefinition(measurement);
  const model = useMemo(() => {
    if (!definition) return null;
    const history = getMeasurementHistory(definition, snapshot.profile, snapshot.logs);
    const weekly = getWeeklyMeasurementSeries(definition, snapshot.logs);
    const latestValue = getLatestMeasurementValue(definition, snapshot.profile, snapshot.logs);
    const firstValue = history[0]?.value;
    const totalChange = typeof firstValue === 'number' && history.length > 1
      ? roundBodyValue(latestValue - firstValue)
      : null;
    const latestWeeklyChange = weekly[weekly.length - 1]?.change ?? null;

    return {
      history,
      weekly,
      latestValue,
      totalChange,
      latestWeeklyChange,
    };
  }, [definition, snapshot]);

  if (!definition || !model) {
    return (
      <WatchScreen
        top={(
          <TopBar
            leftAction={<WatchBackButton href="/history/body" />}
            center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Not Found</span>}
          />
        )}
        bodyClassName="pt-2 flex flex-col gap-3"
      >
        <WatchSignalPanel
          label="Body"
          title="Not Found"
          summary="That measurement is not tracked."
          active
        />
        <Button asChild
          className="min-h-12 w-full rounded-xl bg-white text-fluid-label font-mono font-black uppercase text-black hover:bg-white/90"
        >
          <Link href="/history/body">Back</Link>
        </Button>
      </WatchScreen>
    );
  }

  return (
    <WatchScreen
      top={(
        <TopBar
            leftAction={<WatchBackButton href="/history/body" />}
          center={<span className="max-w-48 truncate text-fluid-ui font-black uppercase tracking-tight text-white">{definition.label}</span>}
        />
      )}
      bodyClassName="pt-2 flex flex-col gap-3"
    >
      <WatchSignalPanel
        label="Weekly"
        title={`${definition.label} progress`}
        summary={model.weekly.length > 0 ? `${model.weekly.length} weekly ${model.weekly.length === 1 ? 'point' : 'points'} from logged values.` : 'No weekly logs yet.'}
        metric={formatBodyMeasurement(model.latestValue, definition.unit)}
        metricLabel="Latest"
        active
      />

        <WatchPanel subtle className="py-3">
          <WatchMetricGrid columns={3}>
            <WatchMetricCell label="Latest" value={formatBodyMeasurement(model.latestValue, definition.unit)} />
            <WatchMetricCell label="Total" value={model.totalChange === null ? '0' : formatBodyChange(model.totalChange, definition.unit)} tone={getChangeTone(model.totalChange)} />
            <WatchMetricCell label="Week" value={model.latestWeeklyChange === null ? '0' : formatBodyChange(model.latestWeeklyChange, definition.unit)} tone={getChangeTone(model.latestWeeklyChange)} />
          </WatchMetricGrid>
        </WatchPanel>

        <WatchPanel subtle className="py-3">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-white/35" />
            <p className="truncate text-fluid-label font-mono font-black uppercase text-white/35">Weekly chart</p>
          </div>
          <MeasurementTrendChart entries={model.weekly} unit={definition.unit} label={definition.label} />
        </WatchPanel>

        <WatchPanel subtle className="py-3">
          <p className="mb-3 text-fluid-label font-mono font-black uppercase text-white/35">Weekly rows</p>
          {model.weekly.length > 0 ? (
            <div className="flex flex-col gap-2">
              {model.weekly.slice().reverse().map((entry) => (
                <WeeklyMeasurementRow key={entry.weekKey} entry={entry} unit={definition.unit} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-white/5 bg-black/25 px-3 py-3 text-fluid-label text-white/45">Add a logged measurement to build weekly progress.</p>
          )}
        </WatchPanel>

      <WatchPanel subtle className="py-3">
        <p className="mb-3 text-fluid-label font-mono font-black uppercase text-white/35">History</p>
        <div className="flex flex-col gap-2">
          {model.history.slice().reverse().map((entry) => (
            <HistoryMeasurementRow key={`${entry.dateKey}-${entry.source}`} entry={entry} unit={definition.unit} />
          ))}
        </div>
      </WatchPanel>
    </WatchScreen>
  );
}

function WeeklyMeasurementRow({ entry, unit }: { entry: BodyWeeklyPoint; unit: 'kg' | 'cm' }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/25 px-3 py-2">
      <p className="min-w-0 truncate text-fluid-label font-mono uppercase text-white/40">{entry.label}</p>
      <div className="shrink-0 text-right">
        <p className="text-fluid-label font-mono font-black tabular-nums uppercase text-white/75">{formatBodyMeasurement(entry.value, unit)}</p>
        <p className={cn('text-fluid-label font-mono tabular-nums uppercase', getChangeTone(entry.change))}>
          {entry.change === null ? 'First week' : formatBodyChange(entry.change, unit)}
        </p>
      </div>
    </div>
  );
}

function HistoryMeasurementRow({ entry, unit }: { entry: BodyMeasurementPoint; unit: 'kg' | 'cm' }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/25 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-fluid-label font-mono uppercase text-white/40">{entry.label}</p>
        <p className="text-[10px] font-mono uppercase text-white/25">{entry.source}</p>
      </div>
      <p className="shrink-0 text-fluid-label font-mono font-black tabular-nums uppercase text-white/75">{formatBodyMeasurement(entry.value, unit)}</p>
    </div>
  );
}

function MeasurementTrendChart({ entries, unit, label }: { entries: BodyWeeklyPoint[]; unit: 'kg' | 'cm'; label: string }) {
  const width = 280;
  const height = 108;
  const padding = 12;
  const chart = getChartPoints(entries, width, height, padding);

  return (
    <div className="rounded-lg border border-white/5 bg-black/30 px-2 py-3">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} weekly progress chart`} className="h-28 w-full overflow-visible">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {chart.path && <path d={chart.path} fill="none" stroke="rgb(125,211,252)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {chart.points.map((point) => <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="3" fill="rgb(125,211,252)" />)}
      </svg>
      <div className="mt-2 px-1 text-fluid-label font-mono uppercase text-white/40">{entries.length > 0 ? `${entries.length} weeks · ${unit}` : 'No logged weeks'}</div>
    </div>
  );
}

function getChartPoints(
  entries: BodyWeeklyPoint[],
  width: number,
  height: number,
  padding: number
): { points: { x: number; y: number }[]; path: string } {
  const values = entries.map((entry) => entry.value);
  if (values.length === 0) return { points: [], path: '' };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const midpoint = (min + max) / 2;
  const domainMin = midpoint - span / 2;
  const plotted = entries.map((entry, index) => {
    const x = entries.length === 1
      ? width / 2
      : padding + (index / (entries.length - 1)) * (width - padding * 2);
    const y = height - padding - ((entry.value - domainMin) / span) * (height - padding * 2);
    return { x: roundChartPoint(x), y: roundChartPoint(y) };
  });

  return {
    points: plotted,
    path: plotted.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '),
  };
}

function getChangeTone(value: number | null): string {
  if (value === null || value === 0) return 'text-white/45';
  return value > 0 ? 'text-green-300' : 'text-amber-300';
}

function roundChartPoint(value: number): number {
  return Math.round(value * 10) / 10;
}
