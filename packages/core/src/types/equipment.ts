import type { AttributeId } from "./attributes.js";

export type EquipmentSlotType = string; // 例: "sidearm", "researchRod" など。MODで自由に追加可能。

export interface WeaponDefinition {
  id: string;
  name: string;
  description: string;
  slotType: EquipmentSlotType;
  /** この武器で行う通常攻撃・スキルの属性 */
  attributeId: AttributeId;
  /** 攻撃力への加算値 */
  attackBonus: number;
  /** クリティカル率への加算（0.0-1.0） */
  criticalRateBonus: number;
  source: "base" | "mod";
}

export interface ArmorDefinition {
  id: string;
  name: string;
  description: string;
  slotType: EquipmentSlotType;
  defenseBonus: number;
  /** 特定属性への耐性を上乗せする（属性ID -> 追加倍率補正、例: -0.1 で1割軽減） */
  affinityModifiers: Partial<Record<AttributeId, number>>;
  source: "base" | "mod";
}

export type SkillKind = "skill" | "ultimate";

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  kind: SkillKind;
  /** このスキルが持つ属性。装備武器の属性を上書きする。 */
  attributeId: AttributeId;
  /** 通常攻撃に対する威力倍率 */
  powerMultiplier: number;
  /** AP消費コストの上書き。未指定ならcombatConfigのkind別コストを使用 */
  apCostOverride?: number;
  source: "base" | "mod";
}
