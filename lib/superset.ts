import { Exercise } from './types';

export interface SupersetPair {
  a: Exercise;
  b: Exercise | null;
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
