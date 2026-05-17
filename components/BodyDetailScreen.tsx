'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Ruler, Scale, Target, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { DailyLog, UserProfile } from '@/lib/types';
import { getBodyTrendSummary } from '@/lib/progress-insights';
import { getDefaultProfile, loadDailyLogs, loadUserProfile } from '@/lib/storage';
import { WatchListItem, WatchMetricCell, WatchMetricGrid, WatchPanel, WatchSignalPanel } from './WatchSurface';

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot({
      profile: loadUserProfile() ?? getDefaultProfile(),
      logs: loadDailyLogs(),
    });
  }, []);

  const body = useMemo(() => getBodyModel(snapshot.profile, snapshot.logs), [snapshot]);

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
          label="Frame"
          title={body.frameLabel}
          summary={body.frameSummary}
          metric={body.shoulderWaistRatio}
          metricLabel="S/W"
          tone={body.frameTone}
          active
        />

        <WatchMetricGrid columns={2}>
          <WatchMetricCell label="Height" value={`${body.heightCm}cm`} />
          <WatchMetricCell label="Weight" value={`${formatNumber(body.weightKg, 1)}kg`} />
          <WatchMetricCell label="BMI" value={body.bmi} tone={body.bmiTone} />
          <WatchMetricCell label="Target" value={body.targetDate} />
        </WatchMetricGrid>

        <WatchPanel subtle className="py-3">
          <p className="mb-3 text-fluid-label font-mono font-black uppercase text-white/35">Measurements</p>
          <div className="grid grid-cols-2 gap-2">
            <BodyMeasure label="Shoulders" value={body.shoulderCm} />
            <BodyMeasure label="Chest" value={body.chestCm} />
            <BodyMeasure label="Waist" value={body.waistCm} />
            <BodyMeasure label="Hip" value={body.hipCm} />
            <BodyMeasure label="Neck" value={body.neckCm} />
            <BodyMeasure label="Chest/Waist" value={body.chestWaistRatio} />
          </div>
        </WatchPanel>

        <WatchPanel subtle className="py-3">
          <p className="mb-3 text-fluid-label font-mono font-black uppercase text-white/35">Trend</p>
          <div className="grid grid-cols-2 gap-2">
            <BodyMeasure label="Weight / wk" value={body.weightTrend} />
            <BodyMeasure label="Waist / wk" value={body.waistTrend} />
          </div>
          <p className="mt-3 text-fluid-label font-mono uppercase leading-relaxed text-white/45">
            {body.trendSummary}
          </p>
        </WatchPanel>

        <div className="flex flex-col gap-2">
          <WatchListItem icon={Target} title="Goal" subtitle={body.goal} trailing={null} subtle className="py-3" />
          <WatchListItem icon={Utensils} title="Nutrition" subtitle={body.nutrition} trailing={null} subtle className="py-3" />
          <WatchListItem icon={Scale} title="Profile" subtitle={body.profileLine} trailing={null} subtle className="py-3" />
          <WatchListItem icon={Ruler} title="Context" subtitle={body.contextLine} trailing={null} subtle className="py-3" />
        </div>
      </div>
    </div>
  );
}

function BodyMeasure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/5 bg-black/25 px-3 py-2">
      <p className="truncate text-fluid-label font-mono uppercase text-white/25">{label}</p>
      <p className="truncate text-fluid-ui font-black tabular-nums text-white/75">{value}</p>
    </div>
  );
}

function getBodyModel(profile: UserProfile, logs: Record<string, DailyLog>) {
  const latestLog = Object.values(logs)
    .filter((log) => typeof log.morningWeightKg === 'number')
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];
  const heightCm = profile.heightCm ?? 172;
  const weightKg = latestLog?.morningWeightKg ?? profile.weightKg ?? 67.8;
  const waistCm = latestLog?.waistCm ?? profile.waistCircumferenceCm ?? 76.5;
  const shoulderCm = profile.shoulderCircumferenceCm ?? 111.76;
  const chestCm = profile.chestCircumferenceCm ?? 89.5;
  const hipCm = profile.hipCircumferenceCm ?? 85;
  const neckCm = profile.neckCircumferenceCm ?? 37;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const trend = getBodyTrendSummary(logs);
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
    chestCm: `${formatNumber(chestCm, 1)}cm`,
    waistCm: `${formatNumber(waistCm, 1)}cm`,
    hipCm: `${formatNumber(hipCm, 1)}cm`,
    neckCm: `${formatNumber(neckCm, 1)}cm`,
    shoulderWaistRatio: shoulderWaist.toFixed(2),
    chestWaistRatio: chestWaist.toFixed(2),
    targetDate: formatTargetDate(profile.targetDate),
    frameLabel: shoulderWaist >= 1.5 ? 'Strong taper' : 'Build width',
    frameSummary: `Shoulders ${formatNumber(shoulderCm, 1)}cm against ${formatNumber(waistCm, 1)}cm waist. Chest ${formatNumber(chestCm, 1)}cm, hip ${formatNumber(hipCm, 1)}cm.`,
    frameTone: shoulderWaist >= 1.5 ? 'text-green-300' : 'text-amber-300',
    weightTrend: formatTrend(trend.weightTrendKgPerWeek, 'kg'),
    waistTrend: formatTrend(trend.waistTrendCmPerWeek, 'cm'),
    trendSummary: trend.recoveryAlert ?? trend.nutritionAction,
    goal: profile.goal ?? 'Maximize SMV efficient frontier as fast as recoverable',
    nutrition: `Protein ${proteinTarget[0]}-${proteinTarget[1]}g. Surplus +${surplusTarget[0]}-${surplusTarget[1]} kcal/day. Creatine 5g/day, water only.`,
    profileLine: `${profile.age ?? 26}y ${profile.sex ?? 'male'} · ${formatBodyComposition(profile.bodyComposition)} · ${profile.injuryStatus ?? 'No injuries or pain'}`,
    contextLine: `${profile.trainingBackground ?? 'Rugby background'} · ${profile.maxWorkoutMinutes ?? 105} min cap · commercial gym`,
  };
}

function formatNumber(value: number, fractionDigits: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(fractionDigits);
}

function formatTrend(value: number | null, unit: string): string {
  if (value === null) return '--';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${unit}`;
}

function formatTargetDate(value: string | undefined): string {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatBodyComposition(value: UserProfile['bodyComposition']): string {
  return (value ?? 'skinny_fat').replace('_', ' ');
}
