'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronUp, Pencil, Ruler, Scale, TrendingUp, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TopBar } from '@/components/TopBar';
import { DailyLog, UserProfile } from '@/lib/types';
import { formatDateKey } from '@/lib/workout-utils';
import { getDefaultProfile, loadDailyLogs, loadUserProfile, saveDailyLog, setBodyProfileFallbacks } from '@/lib/storage';
import { WatchListItem, WatchMetricCell, WatchMetricGrid, WatchPanel, WatchSignalPanel } from './WatchSurface';

const CURRENT_WEIGHT_KG = 68.6;
const CURRENT_WAIST_CM = 76.5;

interface BodySnapshot {
  profile: UserProfile;
  logs: Record<string, DailyLog>;
}

export function BodyDetailScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<BodySnapshot>(() => ({
    profile: getDefaultProfile(),
    logs: {},
  }));
  const [isEditing, setIsEditing] = useState(false);
  const [showMoreStats, setShowMoreStats] = useState(false);
  const [draft, setDraft] = useState({
    weightKg: '',
    waistCm: '',
    shoulderCm: '',
    chestCm: '',
    hipCm: '',
    neckCm: '',
    heightCm: '',
  });

  function reloadSnapshot() {
    setSnapshot({
      profile: loadUserProfile() ?? getDefaultProfile(),
      logs: loadDailyLogs(),
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadSnapshot();
  }, []);

  const body = useMemo(() => getBodyModel(snapshot.profile, snapshot.logs), [snapshot]);

  function openEditor() {
    setDraft({
      weightKg: formatNumber(body.weightKg, 1),
      waistCm: formatNumber(body.waistCmValue, 1),
      shoulderCm: formatNumber(body.shoulderCmValue, 1),
      chestCm: formatNumber(body.chestCmValue, 1),
      hipCm: formatNumber(body.hipCmValue, 1),
      neckCm: formatNumber(body.neckCmValue, 1),
      heightCm: String(body.heightCm),
    });
    setIsEditing(true);
  }

  function saveBodyMeasurements() {
    const weightKg = parseMeasurement(draft.weightKg);
    const waistCm = parseMeasurement(draft.waistCm);
    const shoulderCm = parseMeasurement(draft.shoulderCm);
    const chestCm = parseMeasurement(draft.chestCm);
    const hipCm = parseMeasurement(draft.hipCm);
    const neckCm = parseMeasurement(draft.neckCm);
    const heightCm = parseMeasurement(draft.heightCm);
    if (weightKg === null || waistCm === null || shoulderCm === null || chestCm === null || hipCm === null || neckCm === null || heightCm === null) return;

    const dateKey = formatDateKey(new Date());
    saveDailyLog(dateKey, {
      dateKey,
      morningWeightKg: roundMeasurement(weightKg),
      heightCm: roundMeasurement(heightCm),
      waistCm: roundMeasurement(waistCm),
      shoulderCm: roundMeasurement(shoulderCm),
      chestCm: roundMeasurement(chestCm),
      hipCm: roundMeasurement(hipCm),
      neckCm: roundMeasurement(neckCm),
    });
    setBodyProfileFallbacks({
      heightCm: roundMeasurement(heightCm),
      weightKg: roundMeasurement(weightKg),
      waistCircumferenceCm: roundMeasurement(waistCm),
      shoulderCircumferenceCm: roundMeasurement(shoulderCm),
      chestCircumferenceCm: roundMeasurement(chestCm),
      hipCircumferenceCm: roundMeasurement(hipCm),
      neckCircumferenceCm: roundMeasurement(neckCm),
    });
    reloadSnapshot();
    setIsEditing(false);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black pb-safe">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push('/history')} className="-ml-2 size-11 text-white/50 hover:bg-transparent hover:text-white active:text-white">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Body</span>}
      />

      <div className="mt-2 flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8 no-scrollbar">
        <WatchSignalPanel
          label="Measure"
          title={body.frameLabel}
          summary={body.frameSummary}
          metric={body.shoulderWaistRatio}
          metricLabel="Ratio"
          tone={body.frameTone}
          active
        />

        <WatchPanel subtle className="py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-fluid-label font-mono font-black uppercase text-white/35">Current</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openEditor}
              className="h-9 shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest">Update</span>
            </Button>
          </div>
          {isEditing && (
            <div className="mb-3 rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="grid grid-cols-2 gap-2">
                <BodyMetricInput label="Weight" unit="kg" value={draft.weightKg} onChange={(weightKg) => setDraft((current) => ({ ...current, weightKg }))} />
                <BodyMetricInput label="Waist" unit="cm" value={draft.waistCm} onChange={(waistCm) => setDraft((current) => ({ ...current, waistCm }))} />
                <BodyMetricInput label="Shoulder" unit="cm" value={draft.shoulderCm} onChange={(shoulderCm) => setDraft((current) => ({ ...current, shoulderCm }))} />
                <BodyMetricInput label="Chest" unit="cm" value={draft.chestCm} onChange={(chestCm) => setDraft((current) => ({ ...current, chestCm }))} />
                <BodyMetricInput label="Hip" unit="cm" value={draft.hipCm} onChange={(hipCm) => setDraft((current) => ({ ...current, hipCm }))} />
                <BodyMetricInput label="Neck" unit="cm" value={draft.neckCm} onChange={(neckCm) => setDraft((current) => ({ ...current, neckCm }))} />
                <BodyMetricInput label="Height" unit="cm" value={draft.heightCm} onChange={(heightCm) => setDraft((current) => ({ ...current, heightCm }))} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="h-10 rounded-lg border border-white/10 bg-white/5 text-fluid-label font-mono font-black uppercase text-white/55 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={saveBodyMeasurements}
                  className="h-10 rounded-lg bg-white text-fluid-label font-mono font-black uppercase text-black hover:bg-white/90"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
          <WatchMetricGrid columns={2}>
            <WatchMetricCell label="Weight" value={`${formatNumber(body.weightKg, 1)}kg`} />
            <WatchMetricCell label="Waist" value={body.waistCm} />
            <WatchMetricCell label="Shoulder" value={body.shoulderCm} />
            <WatchMetricCell label="BMI" value={body.bmi} tone={body.bmiTone} />
          </WatchMetricGrid>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowMoreStats((current) => !current)}
            aria-expanded={showMoreStats}
            className="mt-3 h-10 w-full justify-between rounded-lg border border-white/5 bg-black/25 px-3 text-fluid-label font-mono font-black uppercase text-white/45 hover:bg-white/10 hover:text-white"
          >
            More body stats
            {showMoreStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showMoreStats && (
            <WatchMetricGrid columns={2} className="mt-2">
              <WatchMetricCell label="Height" value={`${body.heightCm}cm`} />
              <WatchMetricCell label="Body ratio" value={body.shoulderWaistRatio} />
              <WatchMetricCell label="Chest" value={body.chestCm} />
              <WatchMetricCell label="Hip" value={body.hipCm} />
              <WatchMetricCell label="Neck" value={body.neckCm} />
              <WatchMetricCell label="Chest/Waist" value={body.chestWaistRatio} />
            </WatchMetricGrid>
          )}
        </WatchPanel>

        <WatchPanel subtle className="py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0 text-white/35" />
              <p className="truncate text-fluid-label font-mono font-black uppercase text-white/35">Ratio progress</p>
            </div>
            <p className="shrink-0 text-fluid-label font-mono uppercase text-white/35">
              {body.ratioHistory.length} {body.ratioHistory.length === 1 ? 'log' : 'logs'}
            </p>
          </div>
          <WatchMetricGrid columns={2}>
            <WatchMetricCell label="Now" value={body.shoulderWaistRatio} tone={body.frameTone} />
            <WatchMetricCell label="Change" value={body.ratioChange} tone={body.ratioTone} />
          </WatchMetricGrid>
          <RatioTrendChart entries={body.ratioHistory} className="mt-3" />
          <div className="mt-3 flex flex-col gap-2">
            {body.history.slice(-6).reverse().map((entry) => (
              <BodyHistoryRow key={entry.dateKey} entry={entry} />
            ))}
          </div>
        </WatchPanel>

        <div className="flex flex-col gap-2">
          <WatchListItem icon={Utensils} title="Nutrition" subtitle={body.nutrition} trailing={null} subtle className="py-3" />
          <WatchListItem icon={Scale} title="Profile" subtitle={body.profileLine} trailing={null} subtle className="py-3" />
          <WatchListItem icon={Ruler} title="Context" subtitle={body.contextLine} trailing={null} subtle className="py-3" />
        </div>
      </div>
    </div>
  );
}

interface BodyHistoryEntry {
  dateKey: string;
  label: string;
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  shoulderCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
  neckCm: number | null;
}

interface RatioHistoryEntry {
  dateKey: string;
  label: string;
  shoulderCm: number;
  ratio: number;
}

function BodyMetricInput({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="block truncate text-fluid-label font-mono uppercase text-white/30">{label}</span>
      <div className="mt-1 flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={value}
          aria-label={`${label} ${unit}`}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 border-0 bg-transparent px-0 text-fluid-label font-black tabular-nums text-white shadow-none focus-visible:ring-0"
        />
        <span className="shrink-0 text-[10px] font-mono uppercase text-white/30">{unit}</span>
      </div>
    </label>
  );
}

function BodyHistoryRow({ entry }: { entry: BodyHistoryEntry }) {
  const metrics = [
    { label: 'Wt', value: formatMeasurement(entry.weightKg, 'kg') },
    { label: 'Waist', value: formatMeasurement(entry.waistCm, 'cm') },
    { label: 'Sh', value: formatMeasurement(entry.shoulderCm, 'cm') },
    { label: 'Chest', value: formatMeasurement(entry.chestCm, 'cm') },
    { label: 'Hip', value: formatMeasurement(entry.hipCm, 'cm') },
    { label: 'Neck', value: formatMeasurement(entry.neckCm, 'cm') },
  ].filter((metric) => metric.value !== null);

  return (
    <div className="rounded-lg border border-white/5 bg-black/25 px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-fluid-label font-mono uppercase text-white/35">{entry.label}</p>
        {entry.heightCm && (
          <p className="shrink-0 text-fluid-label font-mono font-black tabular-nums uppercase text-white/35">
            {formatNumber(entry.heightCm, 1)}cm height
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-md bg-white/[0.03] px-2 py-1">
            <p className="truncate text-[9px] font-mono uppercase text-white/25">{metric.label}</p>
            <p className="truncate text-[11px] font-mono font-black tabular-nums uppercase text-white/65">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getBodyModel(profile: UserProfile, logs: Record<string, DailyLog>) {
  const heightCm = getLatestBodyValue(logs, 'heightCm') ?? profile.heightCm ?? 172;
  const weightKg = getLatestBodyValue(logs, 'morningWeightKg') ?? profile.weightKg ?? CURRENT_WEIGHT_KG;
  const waistCm = getLatestBodyValue(logs, 'waistCm') ?? profile.waistCircumferenceCm ?? CURRENT_WAIST_CM;
  const shoulderCm = getLatestBodyValue(logs, 'shoulderCm') ?? profile.shoulderCircumferenceCm ?? 111.76;
  const chestCm = getLatestBodyValue(logs, 'chestCm') ?? profile.chestCircumferenceCm ?? 89.5;
  const hipCm = getLatestBodyValue(logs, 'hipCm') ?? profile.hipCircumferenceCm ?? 85;
  const neckCm = getLatestBodyValue(logs, 'neckCm') ?? profile.neckCircumferenceCm ?? 37;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const bodyBaseline = getBodyBaseline(profile);
  const history = getBodyHistory(logs, {
    heightCm,
    weightKg,
    waistCm,
    shoulderCm,
    chestCm,
    hipCm,
    neckCm,
  }, bodyBaseline);
  const ratioHistory = getRatioHistory(history, shoulderCm, waistCm);
  const ratioDelta = ratioHistory.length > 1 ? ratioHistory[ratioHistory.length - 1].ratio - ratioHistory[0].ratio : 0;
  const shoulderWaist = shoulderCm / waistCm;
  const chestWaist = chestCm / waistCm;
  const proteinTarget = profile.proteinTargetGrams ?? [140, 160];
  const surplusTarget = profile.calorieSurplusTarget ?? [200, 300];

  return {
    heightCm,
    weightKg,
    bmi: bmi.toFixed(1),
    bmiTone: bmi >= 18.5 && bmi <= 24.9 ? 'text-green-300' : 'text-amber-300',
    shoulderCm: `${formatNumber(shoulderCm, 1)}cm`,
    shoulderCmValue: shoulderCm,
    chestCm: `${formatNumber(chestCm, 1)}cm`,
    chestCmValue: chestCm,
    waistCm: `${formatNumber(waistCm, 1)}cm`,
    waistCmValue: waistCm,
    hipCm: `${formatNumber(hipCm, 1)}cm`,
    hipCmValue: hipCm,
    neckCm: `${formatNumber(neckCm, 1)}cm`,
    neckCmValue: neckCm,
    shoulderWaistRatio: shoulderWaist.toFixed(2),
    chestWaistRatio: chestWaist.toFixed(2),
    frameLabel: 'Body metrics',
    frameSummary: `Shoulder ${formatNumber(shoulderCm, 1)}cm, waist ${formatNumber(waistCm, 1)}cm, chest ${formatNumber(chestCm, 1)}cm.`,
    frameTone: 'text-white',
    history,
    ratioHistory,
    ratioChange: formatRatioChange(ratioDelta),
    ratioTone: ratioDelta >= 0 ? 'text-green-300' : 'text-amber-300',
    nutrition: `Protein ${proteinTarget[0]}-${proteinTarget[1]}g. Surplus +${surplusTarget[0]}-${surplusTarget[1]} kcal/day. Creatine 5g/day, water only.`,
    profileLine: `${profile.age ?? 26}y ${profile.sex ?? 'male'} · ${formatBodyComposition(profile.bodyComposition)} · ${profile.injuryStatus ?? 'No injuries or pain'}`,
    contextLine: `${profile.trainingBackground ?? 'Rugby background'} · ${profile.maxWorkoutMinutes ?? 105} min cap · commercial gym`,
  };
}

function parseMeasurement(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function roundMeasurement(value: number): number {
  return Math.round(value * 10) / 10;
}

type BodyMeasurementKey = 'heightCm' | 'morningWeightKg' | 'waistCm' | 'shoulderCm' | 'chestCm' | 'hipCm' | 'neckCm';

interface BodyMeasurementFallbacks {
  heightCm: number;
  weightKg: number;
  waistCm: number;
  shoulderCm: number;
  chestCm: number;
  hipCm: number;
  neckCm: number;
}

type BodyBaseline = Partial<BodyMeasurementFallbacks> & { dateKey?: string };

function getLatestBodyValue(logs: Record<string, DailyLog>, key: BodyMeasurementKey): number | undefined {
  return Object.values(logs)
    .filter((log) => typeof log[key] === 'number')
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0]?.[key];
}

function RatioTrendChart({ entries, className = '' }: { entries: RatioHistoryEntry[]; className?: string }) {
  const width = 280;
  const height = 108;
  const padding = 12;
  const ratioPoints = getRatioChartPoints(entries, width, height, padding);

  return (
    <div className={`rounded-lg border border-white/5 bg-black/30 px-2 py-3 ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Body ratio progress chart" className="h-28 w-full overflow-visible">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {ratioPoints.path && <path d={ratioPoints.path} fill="none" stroke="rgb(74,222,128)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {ratioPoints.points.map((point) => <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="3" fill="rgb(74,222,128)" />)}
      </svg>
      <div className="mt-2 flex items-center gap-4 px-1">
        <ChartLegend tone="bg-green-400" label="Body ratio" />
      </div>
    </div>
  );
}

function ChartLegend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-fluid-label font-mono uppercase text-white/40">
      <span className={`h-1.5 w-4 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function getRatioChartPoints(
  entries: RatioHistoryEntry[],
  width: number,
  height: number,
  padding: number
): { points: { x: number; y: number }[]; path: string } {
  const values = entries.map((entry) => entry.ratio);
  if (values.length === 0) return { points: [], path: '' };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const minimumVisualSpan = 0.08;
  const rawSpan = max - min;
  const span = Math.max(rawSpan, minimumVisualSpan);
  const midpoint = (min + max) / 2;
  const domainMin = midpoint - span / 2;
  const plotted = entries.map((entry, index) => {
    const x = entries.length === 1
      ? width / 2
      : padding + (index / (entries.length - 1)) * (width - padding * 2);
    const y = height - padding - ((entry.ratio - domainMin) / span) * (height - padding * 2);
    return { x: roundChartPoint(x), y: roundChartPoint(y) };
  });

  return {
    points: plotted,
    path: plotted.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '),
  };
}

function getBodyHistory(
  logs: Record<string, DailyLog>,
  fallbacks: BodyMeasurementFallbacks,
  baseline: BodyBaseline
): BodyHistoryEntry[] {
  const entries = Object.values(logs)
    .filter((log) => hasBodyMeasurement(log))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((log) => ({
      dateKey: log.dateKey,
      label: formatHistoryDate(log.dateKey),
      heightCm: typeof log.heightCm === 'number' ? log.heightCm : null,
      weightKg: typeof log.morningWeightKg === 'number' ? log.morningWeightKg : null,
      waistCm: typeof log.waistCm === 'number' ? log.waistCm : null,
      shoulderCm: typeof log.shoulderCm === 'number' ? log.shoulderCm : null,
      chestCm: typeof log.chestCm === 'number' ? log.chestCm : null,
      hipCm: typeof log.hipCm === 'number' ? log.hipCm : null,
      neckCm: typeof log.neckCm === 'number' ? log.neckCm : null,
    }));

  if (entries.length > 0) {
    const baselineEntry = getBaselineHistoryEntry(baseline, entries[0].dateKey);
    if (baselineEntry) {
      return [baselineEntry, ...entries];
    }

    const [first, ...rest] = entries;
    return [{
      ...first,
      heightCm: first.heightCm ?? fallbacks.heightCm,
      weightKg: first.weightKg ?? fallbacks.weightKg,
      waistCm: first.waistCm ?? fallbacks.waistCm,
      shoulderCm: first.shoulderCm ?? baseline.shoulderCm ?? fallbacks.shoulderCm,
      chestCm: first.chestCm ?? baseline.chestCm ?? fallbacks.chestCm,
      hipCm: first.hipCm ?? baseline.hipCm ?? fallbacks.hipCm,
      neckCm: first.neckCm ?? baseline.neckCm ?? fallbacks.neckCm,
    }, ...rest];
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const dateKey = baseline.dateKey ?? todayKey;
  return [{
    dateKey,
    label: dateKey === todayKey ? 'Today' : formatHistoryDate(dateKey),
    heightCm: baseline.heightCm ?? fallbacks.heightCm,
    weightKg: baseline.weightKg ?? fallbacks.weightKg,
    waistCm: baseline.waistCm ?? fallbacks.waistCm,
    shoulderCm: baseline.shoulderCm ?? fallbacks.shoulderCm,
    chestCm: baseline.chestCm ?? fallbacks.chestCm,
    hipCm: baseline.hipCm ?? fallbacks.hipCm,
    neckCm: baseline.neckCm ?? fallbacks.neckCm,
  }];
}

function getBaselineHistoryEntry(
  baseline: BodyBaseline,
  firstLogDateKey: string
): BodyHistoryEntry | null {
  if (!baseline.dateKey || baseline.dateKey >= firstLogDateKey) return null;
  if (!hasBaselineMeasurement(baseline)) return null;

  return {
    dateKey: baseline.dateKey,
    label: formatHistoryDate(baseline.dateKey),
    heightCm: typeof baseline.heightCm === 'number' ? baseline.heightCm : null,
    weightKg: typeof baseline.weightKg === 'number' ? baseline.weightKg : null,
    waistCm: typeof baseline.waistCm === 'number' ? baseline.waistCm : null,
    shoulderCm: typeof baseline.shoulderCm === 'number' ? baseline.shoulderCm : null,
    chestCm: typeof baseline.chestCm === 'number' ? baseline.chestCm : null,
    hipCm: typeof baseline.hipCm === 'number' ? baseline.hipCm : null,
    neckCm: typeof baseline.neckCm === 'number' ? baseline.neckCm : null,
  };
}

function getBodyBaseline(profile: UserProfile): BodyBaseline {
  return {
    dateKey: getProfileCreatedDateKey(profile.createdAt),
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    waistCm: profile.waistCircumferenceCm,
    shoulderCm: profile.shoulderCircumferenceCm,
    chestCm: profile.chestCircumferenceCm,
    hipCm: profile.hipCircumferenceCm,
    neckCm: profile.neckCircumferenceCm,
  };
}

function hasBodyMeasurement(log: DailyLog): boolean {
  return typeof log.morningWeightKg === 'number'
    || typeof log.heightCm === 'number'
    || typeof log.waistCm === 'number'
    || typeof log.shoulderCm === 'number'
    || typeof log.chestCm === 'number'
    || typeof log.hipCm === 'number'
    || typeof log.neckCm === 'number';
}

function hasBaselineMeasurement(baseline: BodyBaseline): boolean {
  return typeof baseline.weightKg === 'number'
    || typeof baseline.heightCm === 'number'
    || typeof baseline.waistCm === 'number'
    || typeof baseline.shoulderCm === 'number'
    || typeof baseline.chestCm === 'number'
    || typeof baseline.hipCm === 'number'
    || typeof baseline.neckCm === 'number';
}

function getRatioHistory(entries: BodyHistoryEntry[], fallbackShoulderCm: number, fallbackWaistCm: number): RatioHistoryEntry[] {
  let lastShoulderCm = fallbackShoulderCm;
  let lastWaistCm = fallbackWaistCm;

  return entries.map((entry) => {
    if (typeof entry.shoulderCm === 'number') lastShoulderCm = entry.shoulderCm;
    if (typeof entry.waistCm === 'number') lastWaistCm = entry.waistCm;
    return {
      dateKey: entry.dateKey,
      label: entry.label,
      shoulderCm: lastShoulderCm,
      ratio: lastShoulderCm / lastWaistCm,
    };
  });
}

function getProfileCreatedDateKey(value: string): string | undefined {
  const dateKey = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : undefined;
}

function formatNumber(value: number, fractionDigits: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(fractionDigits);
}

function formatMeasurement(value: number | null, unit: 'kg' | 'cm'): string | null {
  return typeof value === 'number' ? `${formatNumber(value, 1)}${unit}` : null;
}

function formatRatioChange(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

function formatHistoryDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function roundChartPoint(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatBodyComposition(value: UserProfile['bodyComposition']): string {
  return (value ?? 'skinny_fat').replace('_', ' ');
}
