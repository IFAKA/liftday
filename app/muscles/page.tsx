'use client';

import { useEffect, useMemo, useState } from 'react';
import { MuscleBodyChart, ViewSide } from '@/components/MuscleBodyChart';
import { TopBar } from '@/components/TopBar';
import {
  WatchBackButton,
  WatchCopyButton,
  WatchMetricCell,
  WatchMetricGrid,
  WatchPanel,
  WatchProgressRow,
  WatchSection,
  WatchSegmentedControl,
  WatchStatusPill,
} from '@/components/WatchSurface';
import {
  getLoggedEffectiveVolume,
  getLoggedWorkoutEffectiveVolume,
  getPlannedEffectiveVolume,
  getPlannedWorkoutEffectiveVolume,
} from '@/lib/adaptation/volume-engine';
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
import { copyText } from '@/lib/clipboard';

type MuscleLens = 'routine' | 'today' | 'week';

const LENS_LABELS: Record<MuscleLens, string> = {
  routine: 'Routine',
  today: 'Today',
  week: '7 days',
};

const LENS_DESCRIPTIONS: Record<MuscleLens, string> = {
  routine: 'Planned weekly effective sets from the active routine.',
  today: 'Logged effective sets against today\'s plan.',
  week: 'Logged effective sets from the last 7 days.',
};

export default function MusclesPage() {
  const [summary, setSummary] = useState<ProgramSummary | null>(null);
  const [lens, setLens] = useState<MuscleLens>('today');
  const [view, setView] = useState<ViewSide>(ViewSide.FRONT);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const nextSummary = loadProgramSummary();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(nextSummary);
  }, []);

  const today = useMemo(() => new Date(), []);
  const workoutType = getWorkoutType(today, summary?.routine.schedule);

  const volume = useMemo(() => {
    if (!summary) return {};
    if (lens === 'today') {
      return getLoggedWorkoutEffectiveVolume(summary.data, today);
    }
    if (lens === 'week') {
      return getLoggedEffectiveVolume(summary.data, today);
    }
    return getPlannedEffectiveVolume(summary.routine, summary.profile, summary.setsPerExercise);
  }, [lens, summary, today]);

  const targetVolume = useMemo(() => {
    if (!summary || lens !== 'today') return undefined;
    if (workoutType === 'rest') return {};
    return getPlannedWorkoutEffectiveVolume(summary.routine, summary.profile, summary.setsPerExercise, workoutType);
  }, [lens, summary, workoutType]);

  const entries = useMemo(() => getMuscleMapEntries(volume, {
    targetOverrides: targetVolume,
    minimumOverrides: targetVolume,
  }), [targetVolume, volume]);

  useEffect(() => {
    if (entries.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedMuscle(getDefaultSelectedMuscle(entries));
  }, [entries, lens]);

  const bodyState = useMemo(() => getMuscleBodyState(entries, selectedMuscle), [entries, selectedMuscle]);
  const selectedEntry = entries.find((entry) => entry.muscle === selectedMuscle) ?? entries[0];
  const workedEntries = entries.filter((entry) => entry.sets > 0 || (lens === 'today' && entry.target > 0)).slice(0, 5);
  const totalSets = entries.reduce((sum, entry) => sum + entry.sets, 0);
  const totalTarget = lens === 'today' ? entries.reduce((sum, entry) => sum + entry.target, 0) : null;
  const lowCount = entries.filter((entry) => entry.status === 'low' && (lens !== 'today' || entry.target > 0)).length;

  const contextLabel = lens === 'today'
    ? workoutType === 'rest' ? 'Rest day' : formatWorkoutType(workoutType)
    : lens === 'week' ? 'Logged work' : summary?.routine.name ?? 'Routine';
  const reportText = useMemo(() => formatMuscleReport({
    lensLabel: LENS_LABELS[lens],
    contextLabel,
    entries,
    totalSets,
  }), [contextLabel, entries, lens, totalSets]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black">
      <TopBar
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Muscles</span>}
        leftAction={<WatchBackButton href="/" />}
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
                <p className="text-fluid-ui font-black tabular-nums text-white">
                  {totalTarget === null ? Math.round(totalSets) : `${Math.round(totalSets)}/${Math.round(totalTarget)}`}
                </p>
                <p className="text-fluid-label font-mono uppercase text-white/30">
                  {totalTarget === null ? 'sets' : 'hit / plan'}
                </p>
              </div>
            </div>

            <WatchSegmentedControl
              value={lens}
              options={(['routine', 'today', 'week'] as MuscleLens[]).map((value) => ({
                value,
                label: LENS_LABELS[value],
              }))}
              onChange={setLens}
              ariaLabel="Muscle map lens"
            />

            <WatchCopyButton
              copied={copied}
              onClick={() => {
                copyText(reportText).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                });
              }}
              label="Copy muscle report"
              copiedLabel="Copied report"
              className="mt-3"
            />
          </WatchPanel>

          <WatchSection title="Map">
            <WatchPanel className="py-3">
              <WatchSegmentedControl
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
              <div className="mb-3 flex items-end justify-between gap-3 border-b border-white/5 pb-3">
                <div className="min-w-0">
                  <p className="text-fluid-label font-mono uppercase text-white/35">Effective sets</p>
                  <p className="mt-1 text-fluid-label leading-relaxed text-white/50">
                    {LENS_DESCRIPTIONS[lens]}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-fluid-label font-mono uppercase text-white/25">Bar</p>
                  <p className="text-fluid-label font-mono uppercase text-white/50">% target</p>
                </div>
              </div>
              {workedEntries.length === 0 ? (
                <p className="text-fluid-label font-mono uppercase leading-relaxed text-white/45">
                  No effective sets in this lens.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {workedEntries.map((entry) => (
                    <MuscleVolumeRow
                      key={entry.muscle}
                      entry={entry}
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
                  <MuscleStatusPill status={selectedEntry.status} />
                </div>
                <WatchMetricGrid columns={3} className="mt-4">
                  <WatchMetricCell label="Eff sets" value={selectedEntry.sets.toFixed(1)} />
                  <WatchMetricCell label="Target" value={selectedEntry.target} />
                  <WatchMetricCell label="Heat" value={`${selectedEntry.intensity}/10`} />
                </WatchMetricGrid>
                <p className="mt-3 text-fluid-label font-mono uppercase leading-relaxed text-white/35">
                  Target is {lens === 'today' ? 'today\'s planned effective sets' : 'the weekly target'}. Heat is target completion mapped to the body color.
                </p>
                {lowCount > 0 && (
                  <p className="mt-2 text-fluid-label font-mono uppercase leading-relaxed text-orange-300/70">
                    {lowCount} muscles are below their minimum effective-set floor.
                  </p>
                )}
              </WatchPanel>
            </WatchSection>
          )}
        </div>
      </div>
    </div>
  );
}

function MuscleVolumeRow({ entry }: { entry: MuscleMapEntry }) {
  const percent = Math.round(entry.percentOfTarget * 100);
  const tone = entry.status === 'low'
    ? 'bg-orange-400'
    : entry.status === 'high'
      ? 'bg-red-400'
      : 'bg-green-400';

  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <WatchProgressRow
        label={entry.label}
        value={`${percent}%`}
        meta={`of ${entry.target}`}
        percent={percent}
        tone={tone}
      />
      <p className="mt-1 truncate text-fluid-label font-mono uppercase text-white/35">
        {entry.sets.toFixed(1)} effective sets
      </p>
    </div>
  );
}

function MuscleStatusPill({ status }: { status: MuscleMapEntry['status'] }) {
  const label = status === 'productive' ? 'On target' : status;
  const tone = status === 'low' ? 'warning' : status === 'high' ? 'danger' : 'success';

  return <WatchStatusPill tone={tone}>{label}</WatchStatusPill>;
}

function formatMuscleReport({
  lensLabel,
  contextLabel,
  entries,
  totalSets,
}: {
  lensLabel: string;
  contextLabel: string;
  entries: MuscleMapEntry[];
  totalSets: number;
}): string {
  const rows = entries.map((entry) => (
    `- ${entry.label}: ${entry.sets.toFixed(1)} sets / ${entry.target} target, ` +
    `${Math.round(entry.percentOfTarget * 100)}%, intensity ${entry.intensity}/10, ${entry.status}`
  ));

  return [
    'LiftDay muscle report',
    `Lens: ${lensLabel}`,
    `Context: ${contextLabel}`,
    `Total effective sets: ${totalSets.toFixed(1)}`,
    '',
    ...rows,
  ].join('\n');
}
