'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pencil, Ruler, Scale, TrendingUp, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TopBar } from '@/components/TopBar';
import { DailyLog, UserProfile } from '@/lib/types';
import { formatDateKey } from '@/lib/workout-utils';
import { getDefaultProfile, loadDailyLogs, loadUserProfile, saveDailyLog, setBodyProfileFallbacks } from '@/lib/storage';
import {
  BODY_MEASUREMENT_DEFINITIONS,
  formatBodyChange,
  formatBodyMeasurement,
  getBodyProgressSummary,
  getLatestMeasurementValue,
  getMeasurementHistory,
  roundBodyValue,
} from '@/lib/body-progress';
import { WatchListItem, WatchMetricCell, WatchMetricGrid, WatchPanel, WatchSignalPanel } from './WatchSurface';

const CURRENT_WEIGHT_KG = 68.6;
const CURRENT_WAIST_CM = 76.5;
const ADONIS_INDEX_TARGET = 1.62;

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
  const [draft, setDraft] = useState({
    weightKg: '',
    waistCm: '',
    shoulderCm: '',
    chestCm: '',
    hipCm: '',
    neckCm: '',
    quadCm: '',
    calfCm: '',
    forearmCm: '',
    wristCm: '',
    ankleCm: '',
    bicepsCm: '',
    targetWeightKg: '',
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
      quadCm: formatNumber(body.quadCmValue, 1),
      calfCm: formatNumber(body.calfCmValue, 1),
      forearmCm: formatNumber(body.forearmCmValue, 1),
      wristCm: formatNumber(body.wristCmValue, 1),
      ankleCm: formatNumber(body.ankleCmValue, 1),
      bicepsCm: formatNumber(body.bicepsCmValue, 1),
      targetWeightKg: formatNumber(body.targetWeightKgValue, 1),
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
    const quadCm = parseMeasurement(draft.quadCm);
    const calfCm = parseMeasurement(draft.calfCm);
    const forearmCm = parseMeasurement(draft.forearmCm);
    const wristCm = parseMeasurement(draft.wristCm);
    const ankleCm = parseMeasurement(draft.ankleCm);
    const bicepsCm = parseMeasurement(draft.bicepsCm);
    const targetWeightKg = parseMeasurement(draft.targetWeightKg);
    const heightCm = parseMeasurement(draft.heightCm);
    if (weightKg === null || waistCm === null || shoulderCm === null || chestCm === null || hipCm === null || neckCm === null || quadCm === null || calfCm === null || forearmCm === null || wristCm === null || ankleCm === null || bicepsCm === null || targetWeightKg === null || heightCm === null) return;

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
      quadCm: roundMeasurement(quadCm),
      calfCm: roundMeasurement(calfCm),
      forearmCm: roundMeasurement(forearmCm),
      wristCm: roundMeasurement(wristCm),
      ankleCm: roundMeasurement(ankleCm),
      bicepsCm: roundMeasurement(bicepsCm),
    });
    setBodyProfileFallbacks({
      heightCm: roundMeasurement(heightCm),
      weightKg: roundMeasurement(weightKg),
      waistCircumferenceCm: roundMeasurement(waistCm),
      shoulderCircumferenceCm: roundMeasurement(shoulderCm),
      chestCircumferenceCm: roundMeasurement(chestCm),
      hipCircumferenceCm: roundMeasurement(hipCm),
      neckCircumferenceCm: roundMeasurement(neckCm),
      quadCircumferenceCm: roundMeasurement(quadCm),
      calfCircumferenceCm: roundMeasurement(calfCm),
      forearmCircumferenceCm: roundMeasurement(forearmCm),
      wristCircumferenceCm: roundMeasurement(wristCm),
      ankleCircumferenceCm: roundMeasurement(ankleCm),
      bicepsCircumferenceCm: roundMeasurement(bicepsCm),
      targetWeightKg: roundMeasurement(targetWeightKg),
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
          title="Body progress"
          summary={body.progressSummary}
          metric={body.progressMetric}
          metricLabel="Changed"
          tone="text-white/45"
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
                <BodyMetricInput label="Quad" unit="cm" value={draft.quadCm} onChange={(quadCm) => setDraft((current) => ({ ...current, quadCm }))} />
                <BodyMetricInput label="Calf" unit="cm" value={draft.calfCm} onChange={(calfCm) => setDraft((current) => ({ ...current, calfCm }))} />
                <BodyMetricInput label="Forearm" unit="cm" value={draft.forearmCm} onChange={(forearmCm) => setDraft((current) => ({ ...current, forearmCm }))} />
                <BodyMetricInput label="Wrist" unit="cm" value={draft.wristCm} onChange={(wristCm) => setDraft((current) => ({ ...current, wristCm }))} />
                <BodyMetricInput label="Ankle" unit="cm" value={draft.ankleCm} onChange={(ankleCm) => setDraft((current) => ({ ...current, ankleCm }))} />
                <BodyMetricInput label="Biceps" unit="cm" value={draft.bicepsCm} onChange={(bicepsCm) => setDraft((current) => ({ ...current, bicepsCm }))} />
                <BodyMetricInput label="Ideal weight" unit="kg" value={draft.targetWeightKg} onChange={(targetWeightKg) => setDraft((current) => ({ ...current, targetWeightKg }))} />
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
          <div className="flex flex-col gap-2">
            {body.measurements.map((measurement) => (
              <WatchListItem
                key={measurement.id}
                href={`/history/body/${measurement.id}`}
                title={measurement.label}
                subtitle={measurement.subtitle}
                metric={measurement.value}
                subtle
                className="min-h-14 rounded-lg px-3 py-3"
              />
            ))}
          </div>
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
            <WatchMetricCell label="Shoulder/waist" value={body.adonisIndex} tone={body.adonisTone} />
            <WatchMetricCell label="To target" value={body.adonisGap} tone={body.adonisGapTone} />
            <WatchMetricCell label="Change" value={body.ratioChange} tone={body.ratioTone} />
          </WatchMetricGrid>
          <p className="mt-2 px-1 text-fluid-label leading-snug text-white/45">
            Shoulder width divided by waist. To target is the remaining ratio points.
          </p>
          <div className="mt-3 rounded-lg border border-white/5 bg-black/25 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-fluid-label font-mono font-black uppercase text-white/35">Ratio targets</p>
              <p className="shrink-0 text-fluid-label font-mono uppercase text-white/25">
                {body.ratiosAtTarget}/{body.ratios.length}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {body.ratios.map((ratio) => (
                <RatioTargetRow key={ratio.id} ratio={ratio} />
              ))}
            </div>
          </div>
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
  quadCm: number | null;
  calfCm: number | null;
  forearmCm: number | null;
  wristCm: number | null;
  ankleCm: number | null;
  bicepsCm: number | null;
}

interface RatioHistoryEntry {
  dateKey: string;
  label: string;
  shoulderCm: number;
  ratio: number;
}

interface BodyRatioTarget {
  id: string;
  label: string;
  value: string;
  target: string;
  gap: string;
  percent: number;
  tone: string;
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
    { label: 'Quad', value: formatMeasurement(entry.quadCm, 'cm') },
    { label: 'Calf', value: formatMeasurement(entry.calfCm, 'cm') },
    { label: 'Fore', value: formatMeasurement(entry.forearmCm, 'cm') },
    { label: 'Wrist', value: formatMeasurement(entry.wristCm, 'cm') },
    { label: 'Ankle', value: formatMeasurement(entry.ankleCm, 'cm') },
    { label: 'Bi', value: formatMeasurement(entry.bicepsCm, 'cm') },
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

function RatioTargetRow({ ratio }: { ratio: BodyRatioTarget }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-fluid-label font-mono font-black uppercase text-white/60">{ratio.label}</p>
          <p className="mt-0.5 truncate text-[10px] font-mono uppercase text-white/25">Target {ratio.target}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-fluid-label font-mono font-black tabular-nums uppercase ${ratio.tone}`}>{ratio.value}</p>
          <p className="text-[10px] font-mono uppercase text-white/30">{ratio.gap}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${ratio.percent >= 100 ? 'bg-green-300' : 'bg-sky-300'}`} style={{ width: `${Math.max(4, Math.min(100, ratio.percent))}%` }} />
      </div>
    </div>
  );
}

function getBodyModel(profile: UserProfile, logs: Record<string, DailyLog>) {
  const heightCm = getMeasurementValue('height') ?? 172;
  const weightKg = getMeasurementValue('weight') ?? CURRENT_WEIGHT_KG;
  const waistCm = getMeasurementValue('waist') ?? CURRENT_WAIST_CM;
  const shoulderCm = getMeasurementValue('shoulder') ?? 111.76;
  const chestCm = getMeasurementValue('chest') ?? 89.5;
  const hipCm = getMeasurementValue('hip') ?? 85;
  const neckCm = getMeasurementValue('neck') ?? 37;
  const quadCm = getMeasurementValue('quad') ?? 50;
  const calfCm = getMeasurementValue('calf') ?? 35;
  const forearmCm = getMeasurementValue('forearm') ?? 25.5;
  const wristCm = getMeasurementValue('wrist') ?? 16.5;
  const ankleCm = getMeasurementValue('ankle') ?? 22.5;
  const bicepsCm = getMeasurementValue('biceps') ?? 28;
  const targetWeightKg = getMeasurementValue('target-weight') ?? 72;
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
    quadCm,
    calfCm,
    forearmCm,
    wristCm,
    ankleCm,
    bicepsCm,
  }, bodyBaseline);
  const ratioHistory = getRatioHistory(history, shoulderCm, waistCm);
  const ratioDelta = ratioHistory.length > 1 ? ratioHistory[ratioHistory.length - 1].ratio - ratioHistory[0].ratio : 0;
  const shoulderWaist = shoulderCm / waistCm;
  const adonisGap = ADONIS_INDEX_TARGET - shoulderWaist;
  const chestWaist = chestCm / waistCm;
  const ratios = getBodyRatioTargets({
    heightCm,
    weightKg,
    waistCm,
    shoulderCm,
    chestCm,
    hipCm,
    neckCm,
    quadCm,
    calfCm,
    forearmCm,
    wristCm,
    ankleCm,
    bicepsCm,
  });
  const weightTargetGap = targetWeightKg - weightKg;
  const proteinTarget = profile.proteinTargetGrams ?? [140, 160];
  const surplusTarget = profile.calorieSurplusTarget ?? [200, 300];
  const bodySummary = getBodyProgressSummary(profile, logs);
  const measurements = BODY_MEASUREMENT_DEFINITIONS.map((definition) => {
    const value = getLatestMeasurementValue(definition, profile, logs);
    const historyForMeasurement = getMeasurementHistory(definition, profile, logs);
    const first = historyForMeasurement[0]?.value;
    const change = typeof first === 'number' && historyForMeasurement.length > 1
      ? roundBodyValue(value - first)
      : null;

    return {
      id: definition.id,
      label: definition.label,
      value: formatBodyMeasurement(value, definition.unit),
      subtitle: change === null
        ? 'No logged change'
        : `Total ${formatBodyChange(change, definition.unit)}`,
    };
  });

  function getMeasurementValue(id: (typeof BODY_MEASUREMENT_DEFINITIONS)[number]['id']): number | null {
    const definition = BODY_MEASUREMENT_DEFINITIONS.find((item) => item.id === id);
    return definition ? getLatestMeasurementValue(definition, profile, logs) : null;
  }

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
    quadCm: `${formatNumber(quadCm, 1)}cm`,
    quadCmValue: quadCm,
    calfCm: `${formatNumber(calfCm, 1)}cm`,
    calfCmValue: calfCm,
    forearmCm: `${formatNumber(forearmCm, 1)}cm`,
    forearmCmValue: forearmCm,
    wristCm: `${formatNumber(wristCm, 1)}cm`,
    wristCmValue: wristCm,
    ankleCm: `${formatNumber(ankleCm, 1)}cm`,
    ankleCmValue: ankleCm,
    bicepsCm: `${formatNumber(bicepsCm, 1)}cm`,
    bicepsCmValue: bicepsCm,
    targetWeightKg: `${formatNumber(targetWeightKg, 1)}kg`,
    targetWeightKgValue: targetWeightKg,
    weightTargetDelta: `${weightTargetGap >= 0 ? '+' : ''}${formatNumber(weightTargetGap, 1)}kg`,
    weightTargetTone: Math.abs(weightTargetGap) <= 0.5 ? 'text-green-300' : 'text-white',
    adonisIndex: shoulderWaist.toFixed(2),
    adonisTone: shoulderWaist >= ADONIS_INDEX_TARGET ? 'text-green-300' : 'text-white',
    adonisGap: formatRatioGap(adonisGap),
    adonisGapTone: adonisGap <= 0 ? 'text-green-300' : 'text-amber-300',
    shoulderWaistRatio: shoulderWaist.toFixed(2),
    chestWaistRatio: chestWaist.toFixed(2),
    ratios,
    ratiosAtTarget: ratios.filter((ratio) => ratio.percent >= 100).length,
    frameLabel: 'Body metrics',
    frameSummary: `Shoulder ${formatNumber(shoulderCm, 1)}cm, waist ${formatNumber(waistCm, 1)}cm, chest ${formatNumber(chestCm, 1)}cm.`,
    frameTone: 'text-white',
    measurements,
    progressSummary: `${bodySummary.latestLogCount} ${bodySummary.latestLogCount === 1 ? 'log' : 'logs'} with measurements. Ratio change ${formatRatioChange(bodySummary.ratioChange)}.`,
    progressMetric: String(bodySummary.changedMeasurements),
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

function getBodyRatioTargets(values: BodyMeasurementFallbacks): BodyRatioTarget[] {
  return [
    createMinimumRatio('shoulder-waist', 'Shoulder / waist', values.shoulderCm / values.waistCm, ADONIS_INDEX_TARGET),
    createMinimumRatio('chest-waist', 'Chest / waist', values.chestCm / values.waistCm, 1.30),
    createMaximumRatio('waist-height', 'Waist / height', values.waistCm / values.heightCm, 0.50),
    createMinimumRatio('shoulder-hip', 'Shoulder / hip', values.shoulderCm / values.hipCm, 1.30),
    createMinimumRatio('chest-hip', 'Chest / hip', values.chestCm / values.hipCm, 1.05),
    createRangeRatio('neck-wrist', 'Neck / wrist', values.neckCm / values.wristCm, 2.20, 2.40),
    createRangeRatio('biceps-wrist', 'Biceps / wrist', values.bicepsCm / values.wristCm, 1.80, 2.10),
    createRangeRatio('forearm-wrist', 'Forearm / wrist', values.forearmCm / values.wristCm, 1.55, 1.75),
    createRangeRatio('quad-calf', 'Quad / calf', values.quadCm / values.calfCm, 1.35, 1.55),
    createRangeRatio('calf-ankle', 'Calf / ankle', values.calfCm / values.ankleCm, 1.55, 1.75),
  ];
}

function createMinimumRatio(id: string, label: string, value: number, target: number): BodyRatioTarget {
  const gap = target - value;
  const percent = value >= target ? 100 : (value / target) * 100;

  return {
    id,
    label,
    value: formatRatioValue(value),
    target: `${formatRatioValue(target)}+`,
    gap: gap <= 0 ? 'Met' : `${formatRatioValue(gap)} short`,
    percent,
    tone: percent >= 100 ? 'text-green-300' : 'text-white/75',
  };
}

function createMaximumRatio(id: string, label: string, value: number, target: number): BodyRatioTarget {
  const gap = value - target;
  const percent = value <= target ? 100 : (target / value) * 100;

  return {
    id,
    label,
    value: formatRatioValue(value),
    target: `${formatRatioValue(target)} max`,
    gap: gap <= 0 ? 'Met' : `${formatRatioValue(gap)} over`,
    percent,
    tone: percent >= 100 ? 'text-green-300' : 'text-amber-300',
  };
}

function createRangeRatio(id: string, label: string, value: number, min: number, max: number): BodyRatioTarget {
  const inRange = value >= min && value <= max;
  const percent = inRange
    ? 100
    : value < min
      ? (value / min) * 100
      : (max / value) * 100;

  return {
    id,
    label,
    value: formatRatioValue(value),
    target: `${formatRatioValue(min)}-${formatRatioValue(max)}`,
    gap: getRangeGap(value, min, max),
    percent,
    tone: inRange ? 'text-green-300' : 'text-white/75',
  };
}

function getRangeGap(value: number, min: number, max: number): string {
  if (value >= min && value <= max) return 'Met';
  if (value < min) return `${formatRatioValue(min - value)} short`;
  return `${formatRatioValue(value - max)} over`;
}

function formatRatioGap(value: number): string {
  if (Math.abs(value) < 0.005) return '0.00';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

interface BodyMeasurementFallbacks {
  heightCm: number;
  weightKg: number;
  waistCm: number;
  shoulderCm: number;
  chestCm: number;
  hipCm: number;
  neckCm: number;
  quadCm: number;
  calfCm: number;
  forearmCm: number;
  wristCm: number;
  ankleCm: number;
  bicepsCm: number;
}

type BodyBaseline = Partial<BodyMeasurementFallbacks> & { dateKey?: string };

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
      quadCm: typeof log.quadCm === 'number' ? log.quadCm : null,
      calfCm: typeof log.calfCm === 'number' ? log.calfCm : null,
      forearmCm: typeof log.forearmCm === 'number' ? log.forearmCm : null,
      wristCm: typeof log.wristCm === 'number' ? log.wristCm : null,
      ankleCm: typeof log.ankleCm === 'number' ? log.ankleCm : null,
      bicepsCm: typeof log.bicepsCm === 'number' ? log.bicepsCm : null,
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
      quadCm: first.quadCm ?? baseline.quadCm ?? fallbacks.quadCm,
      calfCm: first.calfCm ?? baseline.calfCm ?? fallbacks.calfCm,
      forearmCm: first.forearmCm ?? baseline.forearmCm ?? fallbacks.forearmCm,
      wristCm: first.wristCm ?? baseline.wristCm ?? fallbacks.wristCm,
      ankleCm: first.ankleCm ?? baseline.ankleCm ?? fallbacks.ankleCm,
      bicepsCm: first.bicepsCm ?? baseline.bicepsCm ?? fallbacks.bicepsCm,
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
    quadCm: baseline.quadCm ?? fallbacks.quadCm,
    calfCm: baseline.calfCm ?? fallbacks.calfCm,
    forearmCm: baseline.forearmCm ?? fallbacks.forearmCm,
    wristCm: baseline.wristCm ?? fallbacks.wristCm,
    ankleCm: baseline.ankleCm ?? fallbacks.ankleCm,
    bicepsCm: baseline.bicepsCm ?? fallbacks.bicepsCm,
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
    quadCm: typeof baseline.quadCm === 'number' ? baseline.quadCm : null,
    calfCm: typeof baseline.calfCm === 'number' ? baseline.calfCm : null,
    forearmCm: typeof baseline.forearmCm === 'number' ? baseline.forearmCm : null,
    wristCm: typeof baseline.wristCm === 'number' ? baseline.wristCm : null,
    ankleCm: typeof baseline.ankleCm === 'number' ? baseline.ankleCm : null,
    bicepsCm: typeof baseline.bicepsCm === 'number' ? baseline.bicepsCm : null,
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
    quadCm: profile.quadCircumferenceCm,
    calfCm: profile.calfCircumferenceCm,
    forearmCm: profile.forearmCircumferenceCm,
    wristCm: profile.wristCircumferenceCm,
    ankleCm: profile.ankleCircumferenceCm,
    bicepsCm: profile.bicepsCircumferenceCm,
  };
}

function hasBodyMeasurement(log: DailyLog): boolean {
  return typeof log.morningWeightKg === 'number'
    || typeof log.heightCm === 'number'
    || typeof log.waistCm === 'number'
    || typeof log.shoulderCm === 'number'
    || typeof log.chestCm === 'number'
    || typeof log.hipCm === 'number'
    || typeof log.neckCm === 'number'
    || typeof log.quadCm === 'number'
    || typeof log.calfCm === 'number'
    || typeof log.forearmCm === 'number'
    || typeof log.wristCm === 'number'
    || typeof log.ankleCm === 'number'
    || typeof log.bicepsCm === 'number';
}

function hasBaselineMeasurement(baseline: BodyBaseline): boolean {
  return typeof baseline.weightKg === 'number'
    || typeof baseline.heightCm === 'number'
    || typeof baseline.waistCm === 'number'
    || typeof baseline.shoulderCm === 'number'
    || typeof baseline.chestCm === 'number'
    || typeof baseline.hipCm === 'number'
    || typeof baseline.neckCm === 'number'
    || typeof baseline.quadCm === 'number'
    || typeof baseline.calfCm === 'number'
    || typeof baseline.forearmCm === 'number'
    || typeof baseline.wristCm === 'number'
    || typeof baseline.ankleCm === 'number'
    || typeof baseline.bicepsCm === 'number';
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

function formatRatioValue(value: number): string {
  return value.toFixed(2);
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
