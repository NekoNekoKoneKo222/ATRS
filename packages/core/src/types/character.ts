import type { AttributeId } from "./attributes.js";

export interface StatBlock {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  /** 精神力：INSTABILITY上昇や精神系状態異常への抵抗に使用 */
  mind: number;
}

/**
 * 属性ごとの耐性値（%）。
 * 例: -25 = その属性のダメージを25%多く受ける（弱点）
 *     +20 = その属性のダメージを20%軽減する（耐性）
 *      0  = 標準（等倍）
 * 「じゃんけん」的な属性同士の固定相性ではなく、個体ごとに6属性すべてへの
 * 耐性値を自由に設定する（例: 同じ星異体でもHEATは弱点、VOIDは耐性、など）。
 */
export type AttributeAffinity = Record<AttributeId, number>;

export interface StatusEffectInstance {
  statusId: string;
  remainingTurns: number;
  /** 重ねがけ数 */
  stacks: number;
}

export type BoostLevel = 0 | 1 | 2 | 3 | 4; // 4 = MAX

export interface BoostState {
  level: BoostLevel;
  /** 0-100、次のBOOSTレベルまでの蓄積値 */
  gauge: number;
}

export interface InstabilityState {
  /** 0-100。100でBREACH */
  value: number;
}

export interface SkillRef {
  skillId: string;
  /** クールダウン残りターン */
  cooldownRemaining: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  baseStats: StatBlock;
  growthPerLevel: Partial<StatBlock>;
  affinity: AttributeAffinity;
  weaponSlot?: string;
  armorSlot?: string;
  skillIds: string[];
  ultimateSkillId?: string;
  passiveIds: string[];
  source: "base" | "mod";
}

/** 実際の戦闘/セーブに乗る、育成済みキャラクターのランタイム状態 */
export interface CharacterRuntime {
  definitionId: string;
  instanceId: string;
  level: number;
  exp: number;
  currentStats: StatBlock;
  boost: BoostState;
  instability: InstabilityState;
  skills: SkillRef[];
  statusEffects: StatusEffectInstance[];
  equippedWeaponId?: string;
  equippedArmorId?: string;
  /** 属性耐性（Phase3）。CharacterDefinition/AnomalyDefinitionのaffinityから複写する。 */
  affinity: AttributeAffinity;
  /** 現在の攻撃属性（装備武器 or 星異体固有の攻撃属性）。Phase3で属性ダメージ計算に使用する。 */
  attackAttributeId: AttributeId;
}
