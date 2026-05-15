'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { MuscleBodyChart, ViewSide } from '@/components/MuscleBodyChart';
import { TopBar } from '@/components/TopBar';
import { WatchBarRow, WatchMetricCell, WatchMetricGrid, WatchPanel, WatchSection } from '@/components/WatchSurface';
import { getLoggedEffectiveVolume, getPlannedEffectiveVolume, getPlannedWorkoutEffectiveVolume } from '@/lib/adaptation/volume-engine';
import {
  formatMuscleName,
  getDefaultSelectedMuscle,
  getMuscleBodyState,
  getMuscleForRegion,
  getMuscleMapEntries,
  type MuscleMapEntry,
} from '@/lib/muscle-map';
import { loadProgramSummary, type ProgramSummary } from '@/lib/program-summary';
import { formatWorkoutType, getWorkoutType } from '@/lib/schedule';
import type { MuscleGroup } from '@/lib/types';
import { cn } from '@/lib/utils';

type MuscleLens = 'routine' | 'today' | 'week';

const LENS_LABELS: Record<MuscleLens, string> = {
  routine: 'Routine',
  today: 'Today',
  week: '7 days',
};

export default function MusclesPage() {
  const [summary, setSummary] = useState<ProgramSummary | null>(null);
  const [lens, setLens] = useState<MuscleLens>('routine');
  const [view, setView] = useState<ViewSide>(ViewSide.FRONT);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

  useEffect(() => {
    const nextSummary = loadProgramSummary();
    const entries = getMuscleMapEntries(getPlannedEffectiveVolume(
      nextSummary.routine,
      nextSummary.profile,
      nextSummary.setsPerExercise
    ));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(nextSummary);
    setSelectedMuscle(getDefaultSelectedMuscle(entries));
  }, []);

  const today = useMemo(() => new Date(), []);
  const workoutType = getWorkoutType(today, summary?.routine.schedule);

  const volume = useMemo(() => {
    if (!summary) return {};
    if (lens === 'today') {
      if (workoutType === 'rest') return {};
      return getPlannedWorkoutEffectiveVolume(summary.routine, summary.profile, summary.setsPerExercise, workoutType);
    }
    if (lens === 'week') {
      return getLoggedEffectiveVolume(summary.data, today);
    }
    return getPlannedEffectiveVolume(summary.routine, summary.profile, summary.setsPerExercise);
  }, [lens, summary, today, workoutType]);

  const entries = useMemo(() => getMuscleMapEntries(volume), [volume]);
  const bodyState = useMemo(() => getMuscleBodyState(entries, selectedMuscle), [entries, selectedMuscle]);
  const selectedEntry = entries.find((entry) => entry.muscle === selectedMuscle) ?? entries[0];
  const workedEntries = entries.filter((entry) => entry.sets > 0).slice(0, 5);
  const totalSets = entries.reduce((sum, entry) => sum + entry.sets, 0);
  const lowCount = entries.filter((entry) => entry.status === 'low').length;

  const contextLabel = lens === 'today'
    ? workoutType === 'rest' ? 'Rest day' : formatWorkoutType(workoutType)
    : lens === 'week' ? 'Logged work' : summary?.routine.name ?? 'Routine';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black">
      <TopBar
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Muscles</span>}
        leftAction={
          <Link
            href="/"
            aria-label="Back"
            className="-ml-2 flex size-11 items-center justify-center rounded-full text-white/55 active:bg-white/10 active:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto px-3 pb-8 pt-1 no-scrollbar select-text">
        <div className="flex flex-col gap-3">
          <WatchPanel active className="py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-fluid-label font-mono uppercase text-green-400">Working</p>
                <h1 className="mt-1 truncate text-fluid-ui font-black uppercase leading-tight text-white">
                  {contextLabel}
                </h1>
              </div>
              <div className="text-right">
                <p className="text-fluid-ui font-black tabular-nums text-white">{Math.round(totalSets)}</p>
                <p className="text-fluid-label font-mono uppercase text-white/30">sets</p>
              </div>
            </div>

            <SegmentedControl
              value={lens}
              options={(['routine', 'today', 'week'] as MuscleLens[]).map((value) => ({
                value,
                label: LENS_LABELS[value],
              }))}
              onChange={setLens}
              ariaLabel="Muscle map lens"
            />
          </WatchPanel>

          <WatchSection title="Map">
            <WatchPanel className="py-3">
              <SegmentedControl
                value={view}
                options={[
                  { value: ViewSide.FRONT, label: 'Front' },
                  { value: ViewSide.BACK, label: 'Back' },
                ]}
                onChange={setView}
                ariaLabel="Body view"
              />
              <div className="mt-3">
                <MuscleBodyChart
                  view={view}
                  bodyState={bodyState}
                  onSelectRegion={(id) => {
                    const muscle = getMuscleForRegion(id);
                    if (muscle) setSelectedMuscle(muscle);
                  }}
                />
              </div>
            </WatchPanel>
          </WatchSection>

          <WatchSection title="Top">
            <WatchPanel subtle className="py-3">
              {workedEntries.length === 0 ? (
                <p className="text-fluid-label font-mono uppercase leading-relaxed text-white/45">
                  No logged sets in this lens.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {workedEntries.map((entry) => (
                    <WatchBarRow
                      key={entry.muscle}
                      label={entry.label}
                      value={entry.sets.toFixed(1)}
                      meta={`${Math.round(entry.percentOfTarget * 100)}%`}
                      percent={entry.percentOfTarget * 100}
                      tone={entry.status === 'low' ? 'bg-orange-400' : entry.status === 'high' ? 'bg-red-400' : 'bg-green-400'}
                    />
                  ))}
                </div>
              )}
            </WatchPanel>
          </WatchSection>

          {selectedEntry && (
            <WatchSection title="Selected">
              <WatchPanel active={selectedEntry.sets > 0} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-fluid-label font-mono uppercase text-white/35">Muscle</p>
                    <h2 className="mt-1 text-fluid-ui font-black uppercase leading-tight text-white">
                      {formatMuscleName(selectedEntry.muscle)}
                    </h2>
                  </div>
                  <StatusPill status={selectedEntry.status} />
                </div>
                <WatchMetricGrid columns={3} className="mt-4">
                  <WatchMetricCell label="Sets" value={selectedEntry.sets.toFixed(1)} />
                  <WatchMetricCell label="Target" value={selectedEntry.target} />
                  <WatchMetricCell label="Map" value={`${selectedEntry.intensity}/10`} />
                </WatchMetricGrid>
                <p className="mt-3 text-fluid-label font-mono uppercase leading-relaxed text-white/35">
                  {lowCount} muscles below floor in this lens.
                </p>
              </WatchPanel>
            </WatchSection>
          )}
        </div>
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex min-h-11 rounded-full border border-white/10 bg-black/35 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cn(
            'min-h-9 flex-1 rounded-full px-2 text-fluid-label font-black uppercase text-white/45 transition-colors',
            option.value === value && 'bg-white text-black'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: MuscleMapEntry['status'] }) {
  const label = status === 'productive' ? 'On target' : status;
  const className = status === 'low'
    ? 'border-orange-400/25 bg-orange-400/10 text-orange-300'
    : status === 'high'
      ? 'border-red-400/25 bg-red-400/10 text-red-300'
      : 'border-green-400/25 bg-green-400/10 text-green-300';

  return (
    <span className={cn('shrink-0 rounded-full border px-3 py-1 text-fluid-label font-black uppercase', className)}>
      {label}
    </span>
  );
}
