import type { AttributeAffinity, StatBlock } from "./character.js";

export type AnomalyRarity = "common" | "uncommon" | "rare" | "epic" | "singular";

export interface ContainmentCondition {
  /** 例: "energyBelow", "researchLevelAbove" など。MOD側で新条件タイプも追加可 */
  type: string;
  value: number;
}

export interface BreachCondition {
  type: string;
  value: number;
  description: string;
}

export interface ResearchDataEntry {
  stage: number;
  requiredPoints: number;
  unlockDescription: string;
}

export interface DropEntry {
  itemId: string;
  weight: number;
  minQty: number;
  maxQty: number;
}

export interface AnomalyDefinition {
  id: string; // 例: "AA-001"
  name: string;
  description: string;
  rarity: AnomalyRarity;
  dangerLevel: number; // 1-10
  baseStats: StatBlock;
  affinity: AttributeAffinity;
  attackAttribute: string;
  abilityIds: string[];
  containmentConditions: ContainmentCondition[];
  breachConditions: BreachCondition[];
  researchTrack: ResearchDataEntry[];
  drops: DropEntry[];
  /**
   * 安定して収容できている間、1収容サイクルあたりに生成される星異粒子(Astral Particle)量。
   * Phase13で追加。既存データとの後方互換性のためoptionalとし、未指定の星異体は0として扱う。
   */
  particleYieldPerCycle?: number;
  source: "base" | "mod";
}
