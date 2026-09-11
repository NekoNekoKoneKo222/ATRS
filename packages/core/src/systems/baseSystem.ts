import type {
  BaseState,
  FacilityDefinition,
  FacilityLevelSpec,
  FacilityState,
  ResourcePool,
} from "../types/base.js";

/** 施設定義をIDから引くための簡易ヘルパー */
export function findFacilityDefinition(
  definitions: FacilityDefinition[],
  facilityId: string
): FacilityDefinition | undefined {
  return definitions.find((d) => d.id === facilityId);
}

/** 現在の基地内における施設の状態を取得する（未建造ならlevel=0の仮状態を返す） */
export function getFacilityState(baseState: BaseState, facilityId: string): FacilityState {
  return (
    baseState.facilities.find((f) => f.facilityId === facilityId) ?? {
      facilityId,
      level: 0,
    }
  );
}

/**
 * 次のレベルへアップグレードするために必要なスペックを返す。
 * すでに最大レベルの場合は undefined。
 */
export function getNextLevelSpec(
  definition: FacilityDefinition,
  currentLevel: number
): FacilityLevelSpec | undefined {
  if (currentLevel >= definition.maxLevel) return undefined;
  // levels[0] が level=1 のスペックなので、次のレベルは currentLevel（0始まりの配列インデックスと一致）
  return definition.levels[currentLevel];
}

/** 資源プールが指定コストを賄えるか判定する */
export function canAffordCost(resources: ResourcePool, cost: Partial<Record<string, number>>): boolean {
  return Object.entries(cost).every(([resourceId, amount]) => (resources[resourceId] ?? 0) >= (amount ?? 0));
}

/** 資源プールからコストを差し引いた新しいプールを返す（元のオブジェクトは変更しない） */
export function deductCost(resources: ResourcePool, cost: Partial<Record<string, number>>): ResourcePool {
  const next: ResourcePool = { ...resources };
  for (const [resourceId, amount] of Object.entries(cost)) {
    next[resourceId] = (next[resourceId] ?? 0) - (amount ?? 0);
  }
  return next;
}

/**
 * 資源プールへ報酬を加算した新しいプールを返す（元のオブジェクトは変更しない）。
 * 探索での発見報酬や施設収入など、資源を増やす場面で共通して使う。
 */
export function addResources(resources: ResourcePool, reward: Partial<Record<string, number>>): ResourcePool {
  const next: ResourcePool = { ...resources };
  for (const [resourceId, amount] of Object.entries(reward)) {
    next[resourceId] = (next[resourceId] ?? 0) + (amount ?? 0);
  }
  return next;
}

export type UpgradeFacilityResult =
  | { ok: true; state: BaseState; newLevel: number }
  | { ok: false; reason: "facility_not_found" | "already_max_level" | "insufficient_resources" };

/**
 * 施設を1レベルアップグレード（未建造の場合はレベル1として新規建造）する。
 * 元のbaseStateは変更せず、新しいBaseStateを返す（イミュータブル）。
 */
export function upgradeFacility(
  baseState: BaseState,
  facilityId: string,
  definitions: FacilityDefinition[]
): UpgradeFacilityResult {
  const definition = findFacilityDefinition(definitions, facilityId);
  if (!definition) return { ok: false, reason: "facility_not_found" };

  const currentState = getFacilityState(baseState, facilityId);
  const nextSpec = getNextLevelSpec(definition, currentState.level);
  if (!nextSpec) return { ok: false, reason: "already_max_level" };

  if (!canAffordCost(baseState.resources, nextSpec.upgradeCost)) {
    return { ok: false, reason: "insufficient_resources" };
  }

  const newResources = deductCost(baseState.resources, nextSpec.upgradeCost);
  const newLevel = currentState.level + 1;

  const otherFacilities = baseState.facilities.filter((f) => f.facilityId !== facilityId);
  const newFacilities: FacilityState[] = [...otherFacilities, { facilityId, level: newLevel }];

  return {
    ok: true,
    newLevel,
    state: { resources: newResources, facilities: newFacilities },
  };
}

/**
 * 施設の現在レベルまでに得られている効果の合計値を算出する。
 * （levels[0..currentLevel-1] の効果をすべて合算する）
 */
export function getCumulativeFacilityEffects(
  definition: FacilityDefinition,
  currentLevel: number
): Partial<Record<string, number>> {
  const totals: Partial<Record<string, number>> = {};
  for (let i = 0; i < currentLevel && i < definition.levels.length; i++) {
    const spec = definition.levels[i];
    if (!spec) continue;
    for (const [effectKey, amount] of Object.entries(spec.effects)) {
      totals[effectKey] = (totals[effectKey] ?? 0) + (amount ?? 0);
    }
  }
  return totals;
}
