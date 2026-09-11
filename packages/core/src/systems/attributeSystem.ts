import type { AttributeAffinity } from "../types/character.js";

export interface DamageInput {
  attackerAttack: number;
  attackerAttribute: string;
  defenderDefense: number;
  /**
   * 防御側が持つ、6属性それぞれへの個別耐性値（%）。
   * 「じゃんけん」的な属性同士の相性表は使わず、この個体ごとの値だけで
   * 攻撃属性の効き方を決定する。
   */
  defenderAffinity: AttributeAffinity;
  attributeDamageMultiplier: number; // BOOST由来などの追加倍率
  isCritical: boolean;
  criticalMultiplier: number;
  variance: number; // 0.0-1.0 のランダム振れ幅
}

/** 耐性値(%)からダメージ倍率へ変換する。 -25% → 1.25倍、+20% → 0.8倍、0% → 1.0倍。 */
export function resistancePercentToMultiplier(resistancePercent: number): number {
  const multiplier = 1 - resistancePercent / 100;
  // 極端な値でダメージが0や負になったり、過剰に膨れ上がらないようクランプする
  return Math.min(3.0, Math.max(0.1, multiplier));
}

/**
 * 攻撃属性に対する倍率を算出する。
 * 対象個体が持つ「攻撃属性そのものへの耐性値」を直接参照するだけであり、
 * 属性同士の固定相性（じゃんけん）は一切介在しない。
 */
export function calculateAttributeMultiplier(
  input: Pick<DamageInput, "attackerAttribute" | "defenderAffinity">
): number {
  const resistancePercent = input.defenderAffinity[input.attackerAttribute] ?? 0;
  return resistancePercentToMultiplier(resistancePercent);
}

export function calculateDamage(input: DamageInput): { damage: number; multiplierApplied: number } {
  const attributeMultiplier = calculateAttributeMultiplier(input);
  const rawDamage = Math.max(1, input.attackerAttack - input.defenderDefense * 0.5);
  const varianceFactor = 1 + (Math.random() * 2 - 1) * input.variance;
  const critFactor = input.isCritical ? input.criticalMultiplier : 1;

  const damage = Math.round(
    rawDamage *
      attributeMultiplier *
      input.attributeDamageMultiplier *
      critFactor *
      varianceFactor
  );

  return { damage: Math.max(1, damage), multiplierApplied: attributeMultiplier };
}
