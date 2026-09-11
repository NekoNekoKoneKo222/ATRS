import { test } from "node:test";
import assert from "node:assert/strict";
import {
  discoverAnomaly,
  findContainmentRecord,
  investResearch,
  evaluateAllContainmentConditions,
  applyContainmentTick,
  stabilizeContainment,
} from "../systems/containmentSystem.js";
import type { AnomalyDefinition } from "../types/anomaly.js";
import type { ContainmentCollection, ContainmentTickConfig } from "../types/containment.js";

const testAnomalyDef: AnomalyDefinition = {
  id: "AA-TEST",
  name: "テスト星異体",
  description: "テスト用の星異体定義",
  rarity: "rare",
  dangerLevel: 5,
  baseStats: { hp: 100, maxHp: 100, attack: 10, defense: 5, speed: 5, mind: 10 },
  affinity: {},
  attackAttribute: "HEAT",
  abilityIds: [],
  containmentConditions: [{ type: "energyBelow", value: 50 }],
  breachConditions: [],
  researchTrack: [
    { stage: 1, requiredPoints: 50, unlockDescription: "第一段階の解析データ" },
    { stage: 2, requiredPoints: 150, unlockDescription: "第二段階の解析データ" },
  ],
  drops: [],
  source: "base",
};

const tickConfig: ContainmentTickConfig = {
  stabilizeAmount: 10,
  degradeAmount: 20,
  unstableThreshold: 40,
};

function emptyCollection(): ContainmentCollection {
  return { records: [] };
}

test("discoverAnomalyで新規の収容レコードが作成される", () => {
  const collection = discoverAnomaly(emptyCollection(), "AA-TEST");
  const record = findContainmentRecord(collection, "AA-TEST");

  assert.ok(record);
  assert.equal(record?.status, "contained");
  assert.equal(record?.integrity, 100);
  assert.equal(record?.researchStage, 0);
});

test("discoverAnomalyは同じ星異体を重複して発見しても冪等である", () => {
  const first = discoverAnomaly(emptyCollection(), "AA-TEST");
  const second = discoverAnomaly(first, "AA-TEST");

  assert.equal(second.records.length, 1);
  assert.deepEqual(second, first);
});

test("investResearchでポイントが蓄積し、閾値到達で研究段階が解禁される", () => {
  const collection = discoverAnomaly(emptyCollection(), "AA-TEST");
  const result = investResearch(collection, "AA-TEST", testAnomalyDef, 50);

  const record = findContainmentRecord(result.collection, "AA-TEST");
  assert.equal(record?.researchPoints, 50);
  assert.equal(record?.researchStage, 1);
  assert.equal(result.newlyUnlockedStages.length, 1);
  assert.equal(result.newlyUnlockedStages[0]?.stage, 1);
});

test("investResearchは一度に複数段階を解禁できる", () => {
  const collection = discoverAnomaly(emptyCollection(), "AA-TEST");
  const result = investResearch(collection, "AA-TEST", testAnomalyDef, 150);

  const record = findContainmentRecord(result.collection, "AA-TEST");
  assert.equal(record?.researchStage, 2);
  assert.equal(result.newlyUnlockedStages.length, 2);
});

test("investResearchは既存の研究段階を再度解禁しない", () => {
  const collection = discoverAnomaly(emptyCollection(), "AA-TEST");
  const afterFirst = investResearch(collection, "AA-TEST", testAnomalyDef, 50);
  const afterSecond = investResearch(afterFirst.collection, "AA-TEST", testAnomalyDef, 10); // 合計60、まだ第2段階未満

  assert.equal(afterSecond.newlyUnlockedStages.length, 0);
  const record = findContainmentRecord(afterSecond.collection, "AA-TEST");
  assert.equal(record?.researchPoints, 60);
  assert.equal(record?.researchStage, 1);
});

test("存在しない星異体への研究投入は何も変更しない", () => {
  const collection = emptyCollection();
  const result = investResearch(collection, "AA-UNKNOWN", testAnomalyDef, 100);

  assert.equal(result.newlyUnlockedStages.length, 0);
  assert.deepEqual(result.collection, collection);
});

test("evaluateAllContainmentConditionsは管理条件を正しく判定する", () => {
  assert.equal(
    evaluateAllContainmentConditions(testAnomalyDef, { resources: { ENERGY: 30 }, researchStage: 0 }),
    true // energyBelow(50) を満たす
  );
  assert.equal(
    evaluateAllContainmentConditions(testAnomalyDef, { resources: { ENERGY: 80 }, researchStage: 0 }),
    false // energyBelow(50) を満たさない
  );
});

test("管理条件を満たしていればapplyContainmentTickで安定度が回復する", () => {
  const collection = discoverAnomaly(emptyCollection(), "AA-TEST");
  const record = findContainmentRecord(collection, "AA-TEST")!;
  const stabilized = { ...record, integrity: 80 };

  const result = applyContainmentTick(stabilized, testAnomalyDef, { ENERGY: 10 }, tickConfig);

  assert.equal(result.record.integrity, 90); // 80 + 10、条件(ENERGY<50)を満たす
  assert.equal(result.record.status, "contained");
  assert.equal(result.newlyBreached, false);
});

test("管理条件を満たしていなければapplyContainmentTickで安定度が低下する", () => {
  const collection = discoverAnomaly(emptyCollection(), "AA-TEST");
  const record = findContainmentRecord(collection, "AA-TEST")!;

  const result = applyContainmentTick(record, testAnomalyDef, { ENERGY: 999 }, tickConfig);

  assert.equal(result.record.integrity, 80); // 100 - 20、条件を満たさない
  assert.equal(result.record.status, "contained"); // まだunstableThreshold(40)以上
});

test("安定度が0に達するとBREACHする", () => {
  const collection = discoverAnomaly(emptyCollection(), "AA-TEST");
  const record = { ...findContainmentRecord(collection, "AA-TEST")!, integrity: 15 };

  const result = applyContainmentTick(record, testAnomalyDef, { ENERGY: 999 }, tickConfig);

  assert.equal(result.record.integrity, 0);
  assert.equal(result.record.status, "breached");
  assert.equal(result.newlyBreached, true);
});

test("BREACH済みのレコードにtickを適用しても変化しない", () => {
  const breachedRecord = {
    anomalyId: "AA-TEST",
    instanceId: "AA-TEST-1",
    status: "breached" as const,
    integrity: 0,
    researchPoints: 0,
    researchStage: 0,
  };

  const result = applyContainmentTick(breachedRecord, testAnomalyDef, { ENERGY: 10 }, tickConfig);

  assert.deepEqual(result.record, breachedRecord);
  assert.equal(result.newlyBreached, false);
});

test("stabilizeContainmentは安定度を直接回復させる", () => {
  const collection = discoverAnomaly(emptyCollection(), "AA-TEST");
  const record = { ...findContainmentRecord(collection, "AA-TEST")!, integrity: 30, status: "unstable" as const };

  const stabilized = stabilizeContainment(record, 20);

  assert.equal(stabilized.integrity, 50);
  assert.equal(stabilized.status, "contained"); // unstableThreshold(40)以上に回復
});

test("stabilizeContainmentはBREACH済みのレコードには効果がない", () => {
  const breachedRecord = {
    anomalyId: "AA-TEST",
    instanceId: "AA-TEST-1",
    status: "breached" as const,
    integrity: 0,
    researchPoints: 0,
    researchStage: 0,
  };

  const result = stabilizeContainment(breachedRecord, 50);

  assert.deepEqual(result, breachedRecord);
});
