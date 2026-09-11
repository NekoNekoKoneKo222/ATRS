import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSaveData,
  serializeSaveData,
  deserializeSaveData,
  checkSaveModRequirements,
  applySaveMigrations,
  compareSaveRecency,
  CURRENT_SAVE_SCHEMA_VERSION,
} from "../systems/saveSystem.js";
import { SaveDataSchema } from "../data-loader/schemas.js";
import type { BaseState } from "../types/base.js";
import type { ExplorationState } from "../types/exploration.js";
import type { ContainmentCollection } from "../types/containment.js";

function makeBaseState(): BaseState {
  return { resources: { ENERGY: 100, CREDITS: 500 }, facilities: [{ facilityId: "COMMAND", level: 1 }] };
}

function makeExplorationState(): ExplorationState {
  return {
    currentNodeId: "node_base",
    discoveredNodeIds: ["node_base"],
    exploredNodeIds: [],
    log: [{ nodeId: "node_base", message: "開始" }],
  };
}

function makeContainmentCollection(): ContainmentCollection {
  return {
    records: [
      { anomalyId: "AA-001", instanceId: "AA-001-1", status: "contained", integrity: 100, researchPoints: 0, researchStage: 0 },
    ],
  };
}

test("createSaveDataは現在の状態からセーブデータを構築する", () => {
  const fixedNow = () => new Date("2026-01-01T00:00:00.000Z");
  const save = createSaveData({
    gameVersion: "0.1.0",
    slotName: "slot1",
    base: makeBaseState(),
    exploration: makeExplorationState(),
    containment: makeContainmentCollection(),
    mods: [],
    now: fixedNow,
  });

  assert.equal(save.meta.gameVersion, "0.1.0");
  assert.equal(save.meta.saveSchemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(save.meta.slotName, "slot1");
  assert.equal(save.meta.savedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(save.base.resources.CREDITS, 500);
});

test("createSaveDataの結果はSaveDataSchemaによる検証に合格する", () => {
  const save = createSaveData({
    gameVersion: "0.1.0",
    slotName: "slot1",
    base: makeBaseState(),
    exploration: makeExplorationState(),
    containment: makeContainmentCollection(),
    mods: [{ modId: "example-mod", modVersion: "0.1.0" }],
  });

  const result = SaveDataSchema.safeParse(save);
  assert.equal(result.success, true);
});

test("serializeSaveData/deserializeSaveDataは往復して同じ内容を復元できる", () => {
  const save = createSaveData({
    gameVersion: "0.1.0",
    slotName: "slot1",
    base: makeBaseState(),
    exploration: makeExplorationState(),
    containment: makeContainmentCollection(),
    mods: [],
  });

  const serialized = serializeSaveData(save);
  const result = deserializeSaveData(serialized);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, save);
  }
});

test("deserializeSaveDataは不正なJSONに対してエラーを返す", () => {
  const result = deserializeSaveData("{ this is not valid json");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /JSON構文エラー/);
  }
});

test("checkSaveModRequirementsは不足MODを検出する", () => {
  const result = checkSaveModRequirements(
    [{ modId: "cosmic-creatures", modVersion: "1.2.0" }],
    []
  );

  assert.equal(result.ok, false);
  assert.equal(result.missing.length, 1);
  assert.equal(result.missing[0]?.modId, "cosmic-creatures");
  assert.equal(result.versionMismatched.length, 0);
});

test("checkSaveModRequirementsはバージョン不一致を検出する", () => {
  const result = checkSaveModRequirements(
    [{ modId: "new-weapons", modVersion: "2.0.1" }],
    [{ modId: "new-weapons", modVersion: "1.9.0" }]
  );

  assert.equal(result.ok, false);
  assert.equal(result.missing.length, 0);
  assert.equal(result.versionMismatched.length, 1);
  assert.equal(result.versionMismatched[0]?.installedVersion, "1.9.0");
});

test("checkSaveModRequirementsは要件を満たしていればokになる", () => {
  const result = checkSaveModRequirements(
    [{ modId: "astral-facilities", modVersion: "1.1.0" }],
    [
      { modId: "astral-facilities", modVersion: "1.1.0" },
      { modId: "unrelated-mod", modVersion: "3.0.0" },
    ]
  );

  assert.equal(result.ok, true);
  assert.equal(result.missing.length, 0);
  assert.equal(result.versionMismatched.length, 0);
});

test("applySaveMigrationsは登録されたマイグレーションを順に適用する", () => {
  const rawData = {
    meta: { saveSchemaVersion: "1.0", slotName: "slot1" },
    legacyField: "old-value",
  };

  const migrations = [
    {
      fromVersion: "1.0",
      toVersion: "1.1",
      migrate: (data: Record<string, unknown>) => ({
        ...data,
        meta: { ...(data.meta as object), saveSchemaVersion: "1.1" },
        newField: data.legacyField,
      }),
    },
  ];

  const result = applySaveMigrations(rawData, "1.1", migrations);

  assert.equal(result.finalVersion, "1.1");
  assert.deepEqual(result.appliedMigrations, ["1.0->1.1"]);
  assert.equal(result.data.newField, "old-value");
});

test("applySaveMigrationsは複数段階のマイグレーションを連続で適用できる", () => {
  const rawData = { meta: { saveSchemaVersion: "1.0" }, value: 1 };

  const migrations = [
    {
      fromVersion: "1.0",
      toVersion: "1.1",
      migrate: (data: Record<string, unknown>) => ({
        ...data,
        meta: { ...(data.meta as object), saveSchemaVersion: "1.1" },
        value: (data.value as number) + 10,
      }),
    },
    {
      fromVersion: "1.1",
      toVersion: "1.2",
      migrate: (data: Record<string, unknown>) => ({
        ...data,
        meta: { ...(data.meta as object), saveSchemaVersion: "1.2" },
        value: (data.value as number) + 100,
      }),
    },
  ];

  const result = applySaveMigrations(rawData, "1.2", migrations);

  assert.equal(result.finalVersion, "1.2");
  assert.equal(result.data.value, 111);
  assert.deepEqual(result.appliedMigrations, ["1.0->1.1", "1.1->1.2"]);
});

test("applySaveMigrationsは対応するマイグレーションが見つからなければ停止する", () => {
  const rawData = { meta: { saveSchemaVersion: "0.5" }, value: 1 };
  const migrations = [
    {
      fromVersion: "1.0",
      toVersion: "1.1",
      migrate: (data: Record<string, unknown>) => data,
    },
  ];

  const result = applySaveMigrations(rawData, "1.1", migrations);

  assert.equal(result.finalVersion, "0.5");
  assert.equal(result.appliedMigrations.length, 0);
});

test("compareSaveRecencyは新しい方を正しく判定する", () => {
  assert.equal(compareSaveRecency("2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z"), "a_newer");
  assert.equal(compareSaveRecency("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"), "b_newer");
  assert.equal(compareSaveRecency("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"), "same");
});

test("compareSaveRecencyは不正な日時文字列に対してsameへフォールバックする", () => {
  assert.equal(compareSaveRecency("not-a-date", "2026-01-01T00:00:00Z"), "same");
});
