import { EXERCISES } from './constants';
import { Exercise, RoutineConfig, SMVExercisePrescription, TierChain, TierMap, WorkoutType } from './types';
import { resolveExerciseKeyWithEquipment } from './tiers';
import { EquipmentKey } from './equipment';
import { getPrescriptionForChain } from './smv';
import {
  getSessionHardSetFloor,
  INCLUDED_DIRECT_ARM_MIN_SETS,
  INCLUDED_EXERCISE_MIN_SETS,
  isDirectArmExercise,
} from './session-volume-constraints';

export function getChainSetCount(chain: TierChain, fallbackSets: number): number {
  if (chain.optional) return chain.sets ?? 0;
  return chain.sets ?? chain.prescription?.sets ?? fallbackSets;
}

interface ResolvedSessionPlanItem {
  exercise: Exercise;
  chain: TierChain;
  chainIndex: number;
  setCount: number;
  prescription: SMVExercisePrescription;
}

export function getResolvedSessionPlan(
  routine: RoutineConfig,
  workoutType: Exclude<WorkoutType, 'rest'>,
  chains: TierChain[],
  tiers: TierMap,
  fallbackSets: number,
  unavailableEquipment: EquipmentKey[] = [],
  options: { allowVolumeReduction?: boolean } = {}
) {
  const plan: ResolvedSessionPlanItem[] = chains.flatMap((chain, chainIndex) => {
    const key = resolveExerciseKeyWithEquipment(
      chain,
      tiers,
      unavailableEquipment,
      routine.id === 'gym'
    );
    const exercise = EXERCISES.find((entry) => entry.key === key);
    if (!exercise) return [];
    const setCount = getChainSetCount(chain, fallbackSets);
    if (setCount <= 0) return [];
    return [{
      exercise,
      chain,
      chainIndex,
      setCount,
      prescription: getPrescriptionForChain(chain, key, fallbackSets),
    }];
  });

  return options.allowVolumeReduction
    ? plan
    : enforceNormalTrainingVolumeFloors(plan, workoutType);
}

function enforceNormalTrainingVolumeFloors(
  plan: ResolvedSessionPlanItem[],
  workoutType: Exclude<WorkoutType, 'rest'>
): ResolvedSessionPlanItem[] {
  const withExerciseFloors = plan.map((item) => {
    if (item.chain.optional) return item;
    const minSets = isDirectArmExercise(item.exercise)
      ? INCLUDED_DIRECT_ARM_MIN_SETS
      : INCLUDED_EXERCISE_MIN_SETS;
    return withSetCount(item, Math.max(item.setCount, minSets));
  });

  const sessionFloor = getSessionHardSetFloor(workoutType);
  let deficit = sessionFloor - withExerciseFloors.reduce((sum, item) => sum + item.setCount, 0);
  if (deficit <= 0 || withExerciseFloors.length === 0) return withExerciseFloors;

  const priorityOrder: Record<TierChain['priority'], number> = {
    critical: 0,
    high: 1,
    support: 2,
    aesthetic: 3,
    indirect: 4,
  };
  const muscleOrder: Record<string, number> = {
    side_delt: 0,
    chest: 1,
    lats: 2,
    rear_delt: 3,
    biceps: 4,
    triceps: 4,
    shoulders: 5,
  };
  const order = withExerciseFloors
    .map((item, index) => ({ index, item }))
    .sort((a, b) => (
      priorityOrder[a.item.chain.priority] - priorityOrder[b.item.chain.priority] ||
      (muscleOrder[a.item.exercise.primaryMuscle] ?? 10) - (muscleOrder[b.item.exercise.primaryMuscle] ?? 10) ||
      a.index - b.index
    ));

  const next = withExerciseFloors.map((item) => ({ ...item }));
  let cursor = 0;
  while (deficit > 0) {
    const index = order[cursor % order.length].index;
    next[index] = withSetCount(next[index], next[index].setCount + 1);
    deficit--;
    cursor++;
  }

  return next;
}

function withSetCount(item: ResolvedSessionPlanItem, setCount: number): ResolvedSessionPlanItem {
  return {
    ...item,
    setCount,
    prescription: {
      ...item.prescription,
      sets: setCount,
    },
  };
}
