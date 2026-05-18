'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadUserProfile, setBodyMetrics } from '@/lib/storage';
import { SMV_PROFILE_DEFAULTS } from '@/lib/smv';

export default function BodySettingsPage() {
  const router = useRouter();
  const [{ heightCm, weightKg }, setMetrics] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        heightCm: 172,
        weightKg: SMV_PROFILE_DEFAULTS.weightKg,
      };
    }
    const profile = loadUserProfile();
    return {
      heightCm: profile?.heightCm ?? 172,
      weightKg: profile?.weightKg ?? SMV_PROFILE_DEFAULTS.weightKg,
    };
  });

  const bmi = weightKg / ((heightCm / 100) ** 2);
  const proteinLow = Math.round(weightKg * 1.6);
  const proteinHigh = Math.round(weightKg * 2.2);

  function updateHeight(value: string) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const metrics = { heightCm: next, weightKg };
    setMetrics(metrics);
    setBodyMetrics(metrics.heightCm, metrics.weightKg);
  }

  function updateWeight(value: string) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const metrics = { heightCm, weightKg: next };
    setMetrics(metrics);
    setBodyMetrics(metrics.heightCm, metrics.weightKg);
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
}: {
  label: string;
  value: number;
  unit: string;
  step?: string;
  onChange: (value: string) => void;
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
