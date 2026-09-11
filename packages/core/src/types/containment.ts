import type { ResourcePool } from "./base.js";

export type ContainmentStatus = "contained" | "unstable" | "breached" | "released";

export interface ContainmentRecord {
  /** 対応するAnomalyDefinition.id */
  anomalyId: string;
  /** この収容レコード自体の一意なID（同一star異体を複数収容する将来拡張にも対応） */
  instanceId: string;
  status: ContainmentStatus;
  /** 収容の安定度。0-100。0になるとBREACH（収容失敗）に至る。 */
  integrity: number;
  /** 蓄積した研究ポイント */
  researchPoints: number;
  /** 現在到達している研究段階（0=未着手） */
  researchStage: number;
}

export interface ContainmentCollection {
  records: ContainmentRecord[];
}

/** 管理条件・研究段階の判定に使う現在の文脈情報 */
export interface ContainmentConditionContext {
  resources: ResourcePool;
  researchStage: number;
}

export interface ContainmentTickConfig {
  /** 管理条件を満たしているときの安定度回復量 */
  stabilizeAmount: number;
  /** 管理条件を満たしていないときの安定度低下量 */
  degradeAmount: number;
  /** 安定度がこの値未満になると status="unstable" として扱う閾値 */
  unstableThreshold: number;
}
