import type { InstabilityState } from "../types/character.js";
import type { CombatConfig } from "../types/combat.js";
import { BASE_ATTRIBUTE_IDS, type AttributeId } from "../types/attributes.js";

export type InstabilityTier = "stable" | "unstable" | "critical" | "breach";

export function getInstabilityTier(value: number): InstabilityTier {
  if (value >= 100) return "breach";
  if (value >= 70) return "critical";
  if (value >= 40) return "unstable";
  return "stable";
}

/** BOOST使用など、未知エネルギーを扱う行動によってINSTABILITYを増加させる */
export function increaseInstability(
  state: InstabilityState,
  amount: number,
  config: CombatConfig
): { state: InstabilityState; breached: boolean } {
  const value = Math.min(100, state.value + amount);
  return {
    state: { value },
    breached: value >= config.breachThreshold,
  };
}

/** 基地復旧やアイテムなどでINSTABILITYを軽減する */
export function decreaseInstability(
  state: InstabilityState,
  amount: number
): InstabilityState {
  return { value: Math.max(0, state.value - amount) };
}

/**
 * INSTABILITYの段階に応じて「発生しうる」効果カテゴリ。
 * UI表示や大まかな説明に使う。実際に発生するかどうかの判定は
 * resolveInstabilityEffect() で行う。
 */
export function getInstabilityEffectFlags(tier: InstabilityTier): {
  skillMayMutate: boolean;
  statMayShift: boolean;
  actionMayBeRestricted: boolean;
  attributeMayShift: boolean;
} {
  switch (tier) {
    case "stable":
      return { skillMayMutate: false, statMayShift: false, actionMayBeRestricted: false, attributeMayShift: false };
    case "unstable":
      return { skillMayMutate: true, statMayShift: false, actionMayBeRestricted: false, attributeMayShift: false };
    case "critical":
      return { skillMayMutate: true, statMayShift: true, actionMayBeRestricted: true, attributeMayShift: true };
    case "breach":
      return { skillMayMutate: true, statMayShift: true, actionMayBeRestricted: true, attributeMayShift: true };
  }
}

/** 段階ごとの発生確率・攻撃力ペナルティ。将来的には設定ファイルへ分離してもよい。 */
const TIER_EFFECT_TABLE: Record<
  InstabilityTier,
  { mutateChance: number; restrictChance: number; attackMultiplier: number }
> = {
  stable: { mutateChance: 0, restrictChance: 0, attackMultiplier: 1.0 },
  unstable: { mutateChance: 0.25, restrictChance: 0, attackMultiplier: 1.0 },
  critical: { mutateChance: 0.4, restrictChance: 0.15, attackMultiplier: 0.85 },
  breach: { mutateChance: 0.5, restrictChance: 0.35, attackMultiplier: 0.7 },
};

/**
 * 乱数判定の入力。呼び出し側（combatEngine）が Math.random() から生成するか、
 * テストで固定値を注入できるようにするための構造体。すべて 0.0-1.0 の値。
 */
export interface InstabilityEffectRoll {
  /** この値が mutateChance を下回るとスキル/攻撃属性が変質する */
  mutateRoll: number;
  /** この値が restrictChance を下回ると行動そのものが失敗する */
  restrictRoll: number;
  /** 属性変質が発生した場合、どの属性に変質するかを選ぶための 0.0-1.0 の値 */
  attributeRoll: number;
}

export interface InstabilityEffectResult {
  tier: InstabilityTier;
  /** 行動が不安定化によって失敗したか */
  actionBlocked: boolean;
  /** 攻撃属性が変質した場合の上書き先属性 */
  attributeOverride?: AttributeId;
  /** ダメージ計算に掛ける攻撃力倍率（1.0=影響なし） */
  attackMultiplier: number;
}

/**
 * INSTABILITYの段階と乱数ロールから、実際にキャラクターへ発生する効果を確定する。
 * 純粋関数にすることで、乱数を外部から注入したユニットテストが容易になる。
 */
export function resolveInstabilityEffect(
  tier: InstabilityTier,
  roll: InstabilityEffectRoll
): InstabilityEffectResult {
  const table = TIER_EFFECT_TABLE[tier];

  const actionBlocked = roll.restrictRoll < table.restrictChance;
  const shouldMutate = !actionBlocked && roll.mutateRoll < table.mutateChance;

  let attributeOverride: AttributeId | undefined;
  if (shouldMutate) {
    const index = Math.min(
      BASE_ATTRIBUTE_IDS.length - 1,
      Math.floor(roll.attributeRoll * BASE_ATTRIBUTE_IDS.length)
    );
    attributeOverride = BASE_ATTRIBUTE_IDS[index];
  }

  return {
    tier,
    actionBlocked,
    ...(attributeOverride ? { attributeOverride } : {}),
    attackMultiplier: table.attackMultiplier,
  };
}

/** Math.random() を用いたデフォルトのロール生成（本番用途） */
export function createRandomInstabilityRoll(): InstabilityEffectRoll {
  return {
    mutateRoll: Math.random(),
    restrictRoll: Math.random(),
    attributeRoll: Math.random(),
  };
}
