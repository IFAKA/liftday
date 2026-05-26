'use client';

import { MuscleBodyChart, ViewSide } from '@/components/MuscleBodyChart';
import type { BodyState } from 'body-muscles';
import {
  WatchCopyButton,
  WatchMetricCell,
  WatchMetricGrid,
  WatchPanel,
  WatchProgressRow,
  WatchSection,
  WatchSegmentedControl,
  WatchStatusPill,
} from '@/components/WatchSurface';
import { formatMuscleName, getMuscleForRegion, type MuscleMapEntry } from '@/lib/muscle-map';
import type { MuscleGroup } from '@/lib/types';

export type MuscleLens = 'routine' | 'today' | 'week';

export const LENS_LABELS: Record<MuscleLens, string> = {
  routine: 'Routine',
  today: 'Today',
  week: '7 days',
};

export const LENS_DESCRIPTIONS: Record<MuscleLens, string> = {
  routine: 'Planned weekly effective sets from the active routine.',
  today: 'Logged effective sets against today\'s plan.',
  week: 'Logged effective sets from the last 7 days.',
};

export function MuscleLensSummaryPanel({
  lens,
  contextLabel,
  totalSets,
  totalTarget,
  copied,
  onLensChange,
  onCopyReport,
}: {
  lens: MuscleLens;
  contextLabel: string;
  totalSets: number;
  totalTarget: number | null;
  copied: boolean;
  onLensChange: (lens: MuscleLens) => void;
  onCopyReport: () => void;
}) {
  return (
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
        onChange={onLensChange}
        ariaLabel="Muscle map lens"
      />

      <WatchCopyButton
        copied={copied}
        onClick={onCopyReport}
        label="Copy muscle report"
        copiedLabel="Copied report"
        className="mt-3"
      />
    </WatchPanel>
  );
}

export function MuscleMapPanel({
  view,
  bodyState,
  onViewChange,
  onSelectedMuscleChange,
}: {
  view: ViewSide;
  bodyState: BodyState;
  onViewChange: (view: ViewSide) => void;
  onSelectedMuscleChange: (muscle: MuscleGroup) => void;
}) {
  return (
    <WatchSection title="Map">
      <WatchPanel className="py-3">
        <WatchSegmentedControl
          value={view}
          options={[
            { value: ViewSide.FRONT, label: 'Front' },
            { value: ViewSide.BACK, label: 'Back' },
          ]}
          onChange={onViewChange}
          ariaLabel="Body view"
        />
        <div className="mt-3">
          <MuscleBodyChart
            view={view}
            bodyState={bodyState}
            onSelectRegion={(id) => {
              const muscle = getMuscleForRegion(id);
              if (muscle) onSelectedMuscleChange(muscle);
            }}
          />
        </div>
      </WatchPanel>
    </WatchSection>
  );
}

export function MuscleVolumeList({
  lens,
  entries,
}: {
  lens: MuscleLens;
  entries: MuscleMapEntry[];
}) {
  return (
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
        {entries.length === 0 ? (
          <p className="text-fluid-label font-mono uppercase leading-relaxed text-white/45">
            No effective sets in this lens.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <MuscleVolumeRow
                key={entry.muscle}
                entry={entry}
              />
            ))}
          </div>
        )}
      </WatchPanel>
    </WatchSection>
  );
}

export function SelectedMusclePanel({
  lens,
  selectedEntry,
  lowCount,
}: {
  lens: MuscleLens;
  selectedEntry: MuscleMapEntry;
  lowCount: number;
}) {
  return (
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
