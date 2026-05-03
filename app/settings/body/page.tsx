'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadUserProfile, setBodyMetrics, setTrainingProfile } from '@/lib/storage';
import { MUSCLE_TARGET_WEEKLY_SETS } from '@/lib/smv';
import { cn } from '@/lib/utils';

export default function BodySettingsPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [{ heightCm, weightKg, age, sex, maxWorkoutMinutes, trainingBackground, injuryStatus, goal }, setMetrics] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        heightCm: 172,
        weightKg: 66.6,
        age: 26,
        sex: 'male' as const,
        maxWorkoutMinutes: 105,
        trainingBackground: 'Rugby 15 years; intermittent gym blocks',
        injuryStatus: 'No injuries or pain',
        goal: 'Maximize SMV efficient frontier as fast as recoverable',
      };
    }
    const profile = loadUserProfile();
    return {
      heightCm: profile?.heightCm ?? 172,
      weightKg: profile?.weightKg ?? 66.6,
      age: profile?.age ?? 26,
      sex: profile?.sex ?? 'male',
      maxWorkoutMinutes: profile?.maxWorkoutMinutes ?? 105,
      trainingBackground: profile?.trainingBackground ?? 'Rugby 15 years; intermittent gym blocks',
      injuryStatus: profile?.injuryStatus ?? 'No injuries or pain',
      goal: profile?.goal ?? 'Maximize SMV efficient frontier as fast as recoverable',
    };
  });

  const bmi = weightKg / ((heightCm / 100) ** 2);
  const proteinLow = Math.round(weightKg * 1.6);
  const proteinHigh = Math.round(weightKg * 2.2);

  function updateHeight(value: string) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const metrics = { heightCm: next, weightKg, age, sex, maxWorkoutMinutes, trainingBackground, injuryStatus, goal };
    setMetrics(metrics);
    setBodyMetrics(metrics.heightCm, metrics.weightKg);
  }

  function updateWeight(value: string) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const metrics = { heightCm, weightKg: next, age, sex, maxWorkoutMinutes, trainingBackground, injuryStatus, goal };
    setMetrics(metrics);
    setBodyMetrics(metrics.heightCm, metrics.weightKg);
  }

  function persistTrainingProfile() {
    setTrainingProfile({
      age,
      sex,
      bodyComposition: 'skinny_fat',
      trainingBackground,
      gymAccess: true,
      injuryStatus,
      maxWorkoutMinutes,
      goal,
    });
  }

  async function handleCopyBodyGoal() {
    await copyText(formatBodyGoalForPrompt({
      heightCm,
      weightKg,
      age,
      sex,
      maxWorkoutMinutes,
      trainingBackground,
      injuryStatus,
      goal,
      bmi,
      proteinLow,
      proteinHigh,
    }));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon-xl" onClick={() => router.back()} className="-ml-2 text-white/60 hover:text-white hover:bg-transparent active:text-white">
            <ArrowLeft className="icon-lg" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Body & Goal</span>}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8 mt-2 select-text">
        <section className="rounded-2xl bg-white/5 border border-white/5 p-5 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <MetricInput label="Height" value={heightCm} unit="cm" onChange={updateHeight} />
            <MetricInput label="Weight" value={weightKg} unit="kg" step="0.1" onChange={updateWeight} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Readout label="BMI" value={bmi.toFixed(1)} />
            <Readout label="Protein" value={`${proteinLow}-${proteinHigh}g`} />
          </div>
        </section>

        <details className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/35">
            Profile
          </summary>
          <section className="mt-4 rounded-2xl bg-white/5 border border-white/5 p-5">
            <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Your profile</span>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <MetricInput
                label="Age"
                value={age}
                unit="yr"
                onChange={(value) => {
                  const next = Number(value);
                  if (!Number.isFinite(next)) return;
                  setMetrics((prev) => ({ ...prev, age: next }));
                }}
                onBlur={persistTrainingProfile}
              />
              <MetricInput
                label="Max time"
                value={maxWorkoutMinutes}
                unit="min"
                onChange={(value) => {
                  const next = Number(value);
                  if (!Number.isFinite(next)) return;
                  setMetrics((prev) => ({ ...prev, maxWorkoutMinutes: next }));
                }}
                onBlur={persistTrainingProfile}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Readout label="Sex" value={sex} />
              <Readout label="Body comp" value="skinny fat / recomp" />
              <Readout label="Equipment" value="gym" />
              <Readout label="Training" value={trainingBackground} />
              <Readout label="Injuries" value={injuryStatus} />
            </div>
          </section>
        </details>

        <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/35">
            Goal & Targets
          </summary>
          <section className="mt-4 rounded-2xl bg-white/5 border border-white/5 p-5">
            <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Goal</span>
            <p className="mt-2 text-fluid-ui font-black uppercase tracking-tight leading-tight text-white">
              Maximize SMV efficiently: lats, side delts, chest, arms, then proportional lower body.
            </p>
            <p className="mt-3 text-fluid-label font-mono uppercase tracking-wide leading-relaxed text-white/35">
              {goal}. The app uses 3 hard sets per exercise, 6 PPL sessions per week, and your 105-minute cap.
            </p>
            <p className="mt-3 text-fluid-label font-mono uppercase tracking-wide leading-relaxed text-white/35">
              Skinny-fat means the default path is recomp: progressive overload, high protein, no aggressive bulk until waist and body-fat trend are controlled.
            </p>
          </section>

          <section className="mt-3 rounded-2xl bg-white/5 border border-white/5 p-5">
            <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Weekly targets</span>
            <div className="mt-4 flex flex-col gap-2">
              {Object.entries(MUSCLE_TARGET_WEEKLY_SETS).map(([muscle, sets]) => (
                <div key={muscle} className="flex items-center justify-between gap-4">
                  <span className="text-fluid-label font-mono uppercase tracking-wide text-white/35 truncate">
                    {muscle.replace('_', ' ')}
                  </span>
                  <span className="text-fluid-label font-mono tabular-nums text-white/70">{sets} sets</span>
                </div>
              ))}
            </div>
          </section>
        </details>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopyBodyGoal}
          className={cn(
            'mt-3 w-full rounded-xl border bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98]',
            copied && 'text-green-400 border-green-400/30 bg-green-400/10'
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="text-[11px] font-black uppercase tracking-widest font-mono">{copied ? 'Copied' : 'Copy Body & Goal'}</span>
        </Button>
      </div>
    </div>
  );
}

function MetricInput({
  label,
  value,
  unit,
  step = '1',
  onChange,
  onBlur,
}: {
  label: string;
  value: number;
  unit: string;
  step?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-fluid-label font-mono uppercase tracking-widest text-white/35">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="h-14 border-0 bg-transparent px-0 text-fluid-ui font-black text-white shadow-none focus-visible:ring-0"
        />
        <span className="text-fluid-label font-mono uppercase tracking-widest text-white/30">{unit}</span>
      </div>
    </label>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="text-fluid-label font-mono uppercase tracking-widest text-white/25">{label}</div>
      <div className="text-fluid-ui font-black tabular-nums text-white/75">{value}</div>
    </div>
  );
}

function formatBodyGoalForPrompt({
  heightCm,
  weightKg,
  age,
  sex,
  maxWorkoutMinutes,
  trainingBackground,
  injuryStatus,
  goal,
  bmi,
  proteinLow,
  proteinHigh,
}: {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: string;
  maxWorkoutMinutes: number;
  trainingBackground: string;
  injuryStatus: string;
  goal: string;
  bmi: number;
  proteinLow: number;
  proteinHigh: number;
}): string {
  const lines = [
    '# Body & goal',
    '',
    `Age: ${age}`,
    `Sex: ${sex}`,
    `Height: ${heightCm} cm`,
    `Weight: ${weightKg} kg`,
    `BMI: ${bmi.toFixed(1)}`,
    'Body composition: skinny fat / recomp',
    `Protein target: ${proteinLow}-${proteinHigh} g/day`,
    `Max workout time: ${maxWorkoutMinutes} minutes`,
    `Training background: ${trainingBackground}`,
    `Injuries/pain: ${injuryStatus}`,
    `Goal: ${goal}`,
    '',
    '## Weekly muscle targets',
    ...Object.entries(MUSCLE_TARGET_WEEKLY_SETS).map(([muscle, sets]) => (
      `- ${muscle.replace('_', ' ')}: ${sets} sets`
    )),
  ];

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
