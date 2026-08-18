import { Exercise } from './types';

export interface SupersetPair {
  a: Exercise;
  b: Exercise | null;
}

export interface SupersetPlanItem {
  exercise: Exercise;
  supersetGroup?: string;
  equipmentBlockGroup?: string;
}

export function getSupersetPartner(
  plan: SupersetPlanItem[],
  index: number,
): Exercise | null {
  const group = plan[index]?.supersetGroup;
  if (!group) return null;

  return plan.find((item, itemIndex) => itemIndex !== index && item.supersetGroup === group)?.exercise ?? null;
}

export function getEquipmentBlockPartner(
  plan: SupersetPlanItem[],
  index: number,
): Exercise | null {
  const group = plan[index]?.equipmentBlockGroup;
  if (!group) return null;

  return plan.find((item, itemIndex) => itemIndex !== index && item.equipmentBlockGroup === group)?.exercise ?? null;
}

export function hasEquipmentBlockGroup(
  plan: SupersetPlanItem[],
  index: number,
): boolean {
  return plan[index]?.equipmentBlockGroup != null;
}

export function buildSupersetPairs(exercises: Exercise[]): SupersetPair[] {
  const remaining = [...exercises];
  const pairs: SupersetPair[] = [];

  while (remaining.length > 0) {
    const a = remaining.shift()!;
    const partnerIdx = remaining.findIndex(e => e.primaryMuscle !== a.primaryMuscle);

    if (partnerIdx === -1) {
      pairs.push({ a, b: null });
    } else {
      const [b] = remaining.splice(partnerIdx, 1);
      pairs.push({ a, b });
    }
  }

  return pairs;
}
