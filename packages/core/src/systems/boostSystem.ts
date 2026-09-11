import type { BoostState, BoostLevel } from "../types/character.js";
import type { CombatConfig } from "../types/combat.js";

/** BOOSTゲージを増加させ、必要ならレベルアップさせる */
export function increaseBoost(
  state: BoostState,
  amount: number,
  config: CombatConfig
): BoostState {
  if (state.level >= 4) {
    // すでにMAXの場合はゲージ据え置き（OVERDRIVE消費まで維持）
    return state;
  }

  let gauge = state.gauge + amount;
  let level = state.level;

  while (gauge >= config.boostGaugeMax && level < 4) {
    gauge -= config.boostGaugeMax;
    level = (level + 1) as BoostLevel;
  }

  return { level, gauge: level >= 4 ? config.boostGaugeMax : gauge };
}

/** OVERDRIVE使用後、BOOSTを0にリセットする */
export function consumeOverdrive(state: BoostState): BoostState {
  return { level: 0, gauge: 0 };
}

export interface BoostModifiers {
  attackMultiplier: number;
  attributeDamageMultiplier: number;
  criticalRateBonus: number;
  ultimateUnlocked: boolean;
}

/** BOOSTレベルごとの効果。数値は設定ファイル化を想定した暫定値。 */
export function getBoostModifiers(level: BoostLevel): BoostModifiers {
  const table: Record<BoostLevel, BoostModifiers> = {
    0: { attackMultiplier: 1.0, attributeDamageMultiplier: 1.0, criticalRateBonus: 0, ultimateUnlocked: false },
    1: { attackMultiplier: 1.05, attributeDamageMultiplier: 1.05, criticalRateBonus: 0.02, ultimateUnlocked: false },
    2: { attackMultiplier: 1.12, attributeDamageMultiplier: 1.12, criticalRateBonus: 0.05, ultimateUnlocked: false },
    3: { attackMultiplier: 1.2, attributeDamageMultiplier: 1.2, criticalRateBonus: 0.08, ultimateUnlocked: true },
    4: { attackMultiplier: 1.35, attributeDamageMultiplier: 1.35, criticalRateBonus: 0.12, ultimateUnlocked: true },
  };
  return table[level];
}
