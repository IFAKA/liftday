import { EXERCISES } from './constants';
import { RoutineConfig, TierChain, TierMap, WorkoutType } from './types';
import { resolveExerciseKeyWithEquipment } from './tiers';
import { EquipmentKey } from './equipment';

export function getChainSetCount(chain: TierChain, fallbackSets: number): number {
  return chain.sets ?? fallbackSets;
}

export function getResolvedSessionPlan(
  routine: RoutineConfig,
  workoutType: Exclude<WorkoutType, 'rest'>,
  chains: TierChain[],
  tiers: TierMap,
  fallbackSets: number,
  unavailableEquipment: EquipmentKey[] = []
) {
  return chains.flatMap((chain, chainIndex) => {
    const key = resolveExerciseKeyWithEquipment(
      chain,
      tiers,
      unavailableEquipment,
      routine.id === 'gym'
    );
    const exercise = EXERCISES.find((entry) => entry.key === key);
    if (!exercise || exercise.workoutType !== workoutType) return [];
    return [{
      exercise,
      chain,
      chainIndex,
      setCount: getChainSetCount(chain, fallbackSets),
    }];
  });
}
