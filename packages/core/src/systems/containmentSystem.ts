import type { AnomalyDefinition, ContainmentCondition, ResearchDataEntry } from "../types/anomaly.js";
import type {
  ContainmentCollection,
  ContainmentConditionContext,
  ContainmentRecord,
  ContainmentTickConfig,
} from "../types/containment.js";

/** 収容コレクションから、指定した星異体IDのレコードを検索する（released状態は無視しない） */
export function findContainmentRecord(
  collection: ContainmentCollection,
  anomalyId: string
): ContainmentRecord | undefined {
  return collection.records.find((r) => r.anomalyId === anomalyId);
}

/**
 * 星異体を新たに発見・収容する。
 * すでに収容中（released以外）のレコードが存在する場合は何もしない（冪等）。
 * 戦闘での撃破や探索での発見など、複数の経路から呼ばれても安全。
 */
export function discoverAnomaly(
  collection: ContainmentCollection,
  anomalyId: string
): ContainmentCollection {
  const existing = findContainmentRecord(collection, anomalyId);
  if (existing && existing.status !== "released") {
    return collection;
  }

  const newRecord: ContainmentRecord = {
    anomalyId,
    instanceId: `${anomalyId}-${collection.records.length + 1}`,
    status: "contained",
    integrity: 100,
    researchPoints: 0,
    researchStage: 0,
  };

  // released状態の古いレコードがあれば置き換える形で新規レコードを追加する
  const otherRecords = collection.records.filter((r) => r.anomalyId !== anomalyId);
  return { records: [...otherRecords, newRecord] };
}

export interface InvestResearchResult {
  collection: ContainmentCollection;
  /** 今回の投入で新たに解禁された研究段階 */
  newlyUnlockedStages: ResearchDataEntry[];
}

/**
 * 指定した星異体の研究にポイントを投入する。
 * 到達した研究段階（researchTrack）をすべて解禁し、新たに解禁された分を返す。
 */
export function investResearch(
  collection: ContainmentCollection,
  anomalyId: string,
  definition: AnomalyDefinition,
  amount: number
): InvestResearchResult {
  const record = findContainmentRecord(collection, anomalyId);
  if (!record) {
    return { collection, newlyUnlockedStages: [] };
  }

  const newPoints = record.researchPoints + Math.max(0, amount);

  const sortedTrack = [...definition.researchTrack].sort((a, b) => a.stage - b.stage);
  const newlyUnlockedStages: ResearchDataEntry[] = [];
  let newStage = record.researchStage;

  for (const entry of sortedTrack) {
    if (entry.stage > newStage && newPoints >= entry.requiredPoints) {
      newStage = entry.stage;
      newlyUnlockedStages.push(entry);
    }
  }

  const updatedRecord: ContainmentRecord = {
    ...record,
    researchPoints: newPoints,
    researchStage: newStage,
  };

  const otherRecords = collection.records.filter((r) => r.anomalyId !== anomalyId);
  return {
    collection: { records: [...otherRecords, updatedRecord] },
    newlyUnlockedStages,
  };
}

/** 個別の管理条件が現在満たされているかを判定する */
export function evaluateContainmentCondition(
  condition: ContainmentCondition,
  context: ContainmentConditionContext
): boolean {
  switch (condition.type) {
    case "energyBelow":
      return (context.resources.ENERGY ?? 0) < condition.value;
    case "researchLevelAbove":
      return context.researchStage > condition.value;
    default:
      // MODが追加した未知の条件タイプは判定不能のため「満たされている」とみなし、
      // 収容が不必要に不安定化しないようにする。
      return true;
  }
}

/** 星異体が持つすべての管理条件が現在満たされているかを判定する */
export function evaluateAllContainmentConditions(
  definition: AnomalyDefinition,
  context: ContainmentConditionContext
): boolean {
  if (definition.containmentConditions.length === 0) return true;
  return definition.containmentConditions.every((c) => evaluateContainmentCondition(c, context));
}

export interface ContainmentTickResult {
  record: ContainmentRecord;
  /** このtickで新たにBREACHへ至ったか */
  newlyBreached: boolean;
}

/**
 * 収容の1サイクル（管理条件チェック）を実行する。
 * 条件を満たしていれば安定度が回復し、満たしていなければ低下する。
 * 0まで低下すると status="breached" になる。
 * すでにbreached/releasedのレコードには何もしない。
 */
export function applyContainmentTick(
  record: ContainmentRecord,
  definition: AnomalyDefinition,
  resources: ContainmentConditionContext["resources"],
  config: ContainmentTickConfig
): ContainmentTickResult {
  if (record.status === "breached" || record.status === "released") {
    return { record, newlyBreached: false };
  }

  const context: ContainmentConditionContext = { resources, researchStage: record.researchStage };
  const conditionsMet = evaluateAllContainmentConditions(definition, context);

  const integrity = conditionsMet
    ? Math.min(100, record.integrity + config.stabilizeAmount)
    : Math.max(0, record.integrity - config.degradeAmount);

  const nowBreached = integrity <= 0;
  const status: ContainmentRecord["status"] = nowBreached
    ? "breached"
    : integrity < config.unstableThreshold
      ? "unstable"
      : "contained";

  return {
    record: { ...record, integrity, status },
    // この関数の先頭で既にbreached/releasedは早期returnしているため、
    // ここに到達した時点でnowBreachedはそのまま「新たにBREACHしたか」を表す。
    newlyBreached: nowBreached,
  };
}

/**
 * プレイヤーの能動的な行動（基地からのエネルギー供給など）で安定度を直接回復させる。
 * すでにbreached状態のレコードは、基地復旧などの別手段が必要なため対象外とする。
 */
export function stabilizeContainment(
  record: ContainmentRecord,
  amount: number,
  unstableThreshold: number = 40
): ContainmentRecord {
  if (record.status === "breached" || record.status === "released") return record;

  const integrity = Math.min(100, record.integrity + Math.max(0, amount));
  return { ...record, integrity, status: integrity < unstableThreshold ? "unstable" : "contained" };
}
