'use client';

import { useEffect, useMemo, useState } from 'react';
import { ViewSide } from '@/components/MuscleBodyChart';
import { TopBar } from '@/components/TopBar';
import { WatchBackButton, WatchScreen } from '@/components/WatchSurface';
import {
  getLoggedEffectiveVolume,
  getLoggedWorkoutEffectiveVolume,
  getPlannedEffectiveVolume,
  getPlannedWorkoutEffectiveVolume,
} from '@/lib/adaptation/volume-engine';
import {
  getDefaultSelectedMuscle,
  getMuscleBodyState,
  getMuscleMapEntries,
  type MuscleMapEntry,
} from '@/lib/muscle-map';
import { loadProgramSummary, type ProgramSummary } from '@/lib/program-summary';
import { formatWorkoutType, getWorkoutType } from '@/lib/schedule';
import type { MuscleGroup } from '@/lib/types';
import { copyText } from '@/lib/clipboard';
import {
  LENS_LABELS,
  MuscleLensSummaryPanel,
  MuscleMapPanel,
  MuscleVolumeList,
  SelectedMusclePanel,
  type MuscleLens,
} from '@/components/muscles/MusclePanels';

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
    <WatchScreen
      top={(
        <TopBar
          center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Muscles</span>}
          leftAction={<WatchBackButton href="/" />}
        />
      )}
      bodyClassName="px-3 select-text flex flex-col gap-3"
    >
      <MuscleLensSummaryPanel
        lens={lens}
        contextLabel={contextLabel}
        totalSets={totalSets}
        totalTarget={totalTarget}
        copied={copied}
        onLensChange={setLens}
        onCopyReport={() => {
          copyText(reportText).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          });
        }}
      />

      <MuscleMapPanel
        view={view}
        bodyState={bodyState}
        onViewChange={setView}
        onSelectedMuscleChange={setSelectedMuscle}
      />

      <MuscleVolumeList lens={lens} entries={workedEntries} />

      {selectedEntry && (
        <SelectedMusclePanel lens={lens} selectedEntry={selectedEntry} lowCount={lowCount} />
      )}
    </WatchScreen>
  );
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
