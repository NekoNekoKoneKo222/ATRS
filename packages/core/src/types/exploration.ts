import type { ResourceId } from "./base.js";

/**
 * ノードの種別。MODで新種別を追加できるよう文字列型として扱う。
 * 初期実装の例: base(基地) / planet(惑星) / asteroidBelt(小惑星帯) /
 * spaceStation(宇宙ステーション) / unknownRegion(未知領域) /
 * giantCelestial(巨大天体) / finalRegion(最終領域)
 */
export type GalaxyNodeType =
  | "base"
  | "planet"
  | "asteroidBelt"
  | "spaceStation"
  | "unknownRegion"
  | "giantCelestial"
  | "finalRegion"
  | string;

/**
 * 探索によって発見されうる内容の種別。
 * resource(資源) / anomaly(星異体) / enemy(敵) / npc(NPC) /
 * ruins(遺跡) / event(イベント) / newPlanet(新しい惑星)
 */
export type EncounterType = "resource" | "anomaly" | "enemy" | "npc" | "ruins" | "event" | "newPlanet" | string;

export interface EncounterDefinition {
  id: string;
  type: EncounterType;
  /** ログ・UI表示用の説明文 */
  description: string;
  /** 同一ノード内での抽選重み（大きいほど出現しやすい） */
  weight: number;
  /** type="resource" の場合などに得られる資源報酬 */
  resourceReward?: Partial<Record<ResourceId, number>>;
  /** type="anomaly" の場合、対応する星異体ID（packages/data/anomalies参照） */
  anomalyId?: string;
  /** type="enemy" の場合、遭遇する敵編成の識別子（将来のエンカウントテーブル拡張用） */
  enemyEncounterId?: string;
}

export interface GalaxyNodeDefinition {
  id: string;
  name: string;
  description: string;
  nodeType: GalaxyNodeType;
  /** マップ上のレイアウト用の階層（0=基地、値が大きいほど深部） */
  tier: number;
  /** このノードから直接移動できる先のノードID一覧 */
  connections: string[];
  /** このノードを探索したときに抽選される発見内容 */
  encounters: EncounterDefinition[];
  source: "base" | "mod";
}

export interface GalaxyMapDefinition {
  id: string;
  name: string;
  nodes: GalaxyNodeDefinition[];
}

export interface ExplorationLogEntry {
  nodeId: string;
  encounterId?: string;
  message: string;
}

export interface ExplorationState {
  currentNodeId: string;
  /** マップ上で可視化されている（発見済みの）ノードID一覧 */
  discoveredNodeIds: string[];
  /** 探索（エンカウント抽選）を完了したノードID一覧 */
  exploredNodeIds: string[];
  log: ExplorationLogEntry[];
}
