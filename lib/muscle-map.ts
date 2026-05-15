import type { BodyState, MuscleId } from 'body-muscles';
import { MUSCLE_PRIORITY_PROFILES } from './adaptation/exercise-metadata';
import type { EffectiveVolumeEntry, MuscleGroup } from './types';

export interface MuscleMapEntry extends EffectiveVolumeEntry {
  label: string;
  intensity: number;
  percentOfTarget: number;
}

const MUSCLE_REGION_IDS: Record<MuscleGroup, MuscleId[]> = {
  side_delt: [
    'shoulder-side-left',
    'shoulder-side-right',
  ],
  lats: [
    'lats-upper-left',
    'lats-mid-left',
    'lats-lower-left',
    'lats-upper-right',
    'lats-mid-right',
    'lats-lower-right',
  ],
  chest: [
    'chest-upper-left',
    'chest-lower-left',
    'chest-upper-right',
    'chest-lower-right',
  ],
  shoulders: [
    'shoulder-front-left',
    'shoulder-front-right',
  ],
  biceps: [
    'biceps-left',
    'biceps-right',
  ],
  glutes: [
    'gluteus-medius-left',
    'gluteus-maximus-left',
    'gluteus-medius-right',
    'gluteus-maximus-right',
  ],
  mid_back: [
    'traps-mid-left',
    'traps-lower-left',
    'traps-mid-right',
    'traps-lower-right',
    'spine',
  ],
  rear_delt: [
    'deltoid-rear-left',
    'deltoid-rear-right',
  ],
  triceps: [
    'triceps-long-left',
    'triceps-lateral-left',
    'triceps-long-right',
    'triceps-lateral-right',
  ],
  upper_back: [
    'traps-upper-left',
    'traps-mid-left',
    'traps-upper-right',
    'traps-mid-right',
    'nape',
  ],
  quads: [
    'quads-left',
    'quads-right',
  ],
  hamstrings: [
    'hamstrings-medial-left',
    'hamstrings-lateral-left',
    'hamstrings-medial-right',
    'hamstrings-lateral-right',
  ],
  calves: [
    'calves-gastroc-medial-left',
    'calves-gastroc-lateral-left',
    'calves-soleus-left',
    'calves-gastroc-medial-right',
    'calves-gastroc-lateral-right',
    'calves-soleus-right',
  ],
  neck: [
    'neck-left',
    'neck-right',
    'nape',
    'traps-upper-left',
    'traps-upper-right',
  ],
};

const MUSCLE_BY_REGION = new Map<MuscleId, MuscleGroup>(
  Object.entries(MUSCLE_REGION_IDS).flatMap(([muscle, ids]) => (
    ids.map((id) => [id, muscle as MuscleGroup])
  ))
);

export function getMuscleForRegion(regionId: MuscleId): MuscleGroup | null {
  return MUSCLE_BY_REGION.get(regionId) ?? null;
}

export function getMuscleMapEntries(
  volume: Partial<Record<MuscleGroup, number>>
): MuscleMapEntry[] {
  return MUSCLE_PRIORITY_PROFILES.map((profile) => {
    const sets = roundOne(volume[profile.muscle] ?? 0);
    const percentOfTarget = profile.targetWeeklySets > 0 ? sets / profile.targetWeeklySets : 0;
    const highThreshold = profile.targetWeeklySets * 1.18;
    const status: EffectiveVolumeEntry['status'] = profile.maintenanceOnly
      ? sets >= profile.minimumWeeklySets ? 'maintenance' : 'low'
      : sets < profile.minimumWeeklySets ? 'low' : sets > highThreshold ? 'high' : 'productive';

    return {
      muscle: profile.muscle,
      label: profile.label,
      sets,
      target: profile.targetWeeklySets,
      minimum: profile.minimumWeeklySets,
      priorityRank: profile.rank,
      status,
      percentOfTarget,
      intensity: Math.min(10, Math.round(percentOfTarget * 10)),
    };
  }).sort((a, b) => b.sets - a.sets || a.priorityRank - b.priorityRank);
}

export function getMuscleBodyState(
  entries: MuscleMapEntry[],
  selectedMuscle: MuscleGroup | null
): BodyState {
  const state: BodyState = {};

  for (const entry of entries) {
    const ids = MUSCLE_REGION_IDS[entry.muscle];
    for (const id of ids) {
      state[id] = {
        intensity: entry.intensity,
        selected: entry.muscle === selectedMuscle,
      };
    }
  }

  return state;
}

export function getDefaultSelectedMuscle(entries: MuscleMapEntry[]): MuscleGroup {
  return entries.find((entry) => entry.sets > 0)?.muscle ?? entries[0].muscle;
}

export function formatMuscleName(muscle: MuscleGroup): string {
  return MUSCLE_PRIORITY_PROFILES.find((profile) => profile.muscle === muscle)?.label ?? muscle.replace('_', ' ');
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
