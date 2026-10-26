/**
 * 資源プール。
 * ENERGY: 施設稼働や探索に必要な基礎エネルギー
 * CREDITS: 基地運営費・購入に使う一般通貨
 * RESEARCH_POINTS: 星異体研究や施設研究に使うポイント
 * ALLOY: 施設建造・装備強化に使う資材
 * ASTRAL_PARTICLES: 星異粒子。星異体から生成される特殊粒子で、基地運用・エネルギー・
 *   ワープ技術など幅広い技術に利用される（Phase13で追加）。
 * MODで新たな資源種別を追加できるよう、キーは文字列として扱う。
 */
export type ResourceId = "ENERGY" | "CREDITS" | "RESEARCH_POINTS" | "ALLOY" | "ASTRAL_PARTICLES" | string;

export type ResourcePool = Record<ResourceId, number>;

/** ゲーム本体が最初に同梱する初期資源ID一覧（MODで拡張可能） */
export const BASE_RESOURCE_IDS = ["ENERGY", "CREDITS", "RESEARCH_POINTS", "ALLOY", "ASTRAL_PARTICLES"] as const;

/**
 * 施設が持つ効果の種類。数値は「そのレベルで加算される効果量」を表す。
 * MODによる新しい効果キーの追加を許容するため文字列型のまま扱う。
 */
export type FacilityEffectKey =
  | "energyCapacity"
  | "creditIncome"
  | "researchSpeed"
  | "containmentCapacity"
  | "medicalHealRate"
  | "armorySlotBonus"
  | "observatoryScanRange"
  | "crewCapacity"
  | string;

export interface FacilityLevelSpec {
  /** このレベルに到達するために必要な段階（1始まり） */
  level: number;
  /** 前レベルからこのレベルへアップグレードするために必要な資源コスト */
  upgradeCost: Partial<Record<ResourceId, number>>;
  /** UI表示用の効果説明 */
  effectDescription: string;
  /** このレベルで得られる効果量（加算値） */
  effects: Partial<Record<FacilityEffectKey, number>>;
}

export interface FacilityDefinition {
  id: string; // 例: "COMMAND", "RESEARCH" など
  name: string;
  description: string;
  maxLevel: number;
  /** levels[0] がレベル1の情報。レベル0（未建造）はupgradeCost=levels[0].upgradeCostで建造できる。 */
  levels: FacilityLevelSpec[];
  source: "base" | "mod";
}

/** 基地内における各施設の現在の状態 */
export interface FacilityState {
  facilityId: string;
  /** 0 = 未建造。1以上でそのレベルまで建造・強化済み。 */
  level: number;
}

export interface BaseState {
  resources: ResourcePool;
  facilities: FacilityState[];
}
