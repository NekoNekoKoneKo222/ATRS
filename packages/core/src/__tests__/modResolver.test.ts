import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveModLoadOrder } from "../data-loader/modResolver.js";
import type { ModManifest } from "../data-loader/schemas.js";

function makeManifest(overrides: Partial<ModManifest> & { id: string }): ModManifest {
  return {
    name: overrides.id,
    author: "tester",
    version: "1.0.0",
    game_version: ">=0.1.0",
    description: "",
    dependencies: [],
    conflicts: [],
    priority: 0,
    schema_version: "1.0",
    ...overrides,
  };
}

test("依存関係のないMOD単体は問題なく解決できる", () => {
  const result = resolveModLoadOrder([makeManifest({ id: "mod-a" })]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.loadOrder, ["mod-a"]);
  assert.equal(result.errors.length, 0);
});

test("依存先が存在しない場合はエラーになる", () => {
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-a", dependencies: [{ id: "mod-missing", version: "1.0.0" }] }),
  ]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(), /mod-missing/);
});

test("依存先のバージョンが一致しない場合はエラーになる", () => {
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-a", dependencies: [{ id: "mod-b", version: "2.0.0" }] }),
    makeManifest({ id: "mod-b", version: "1.0.0" }),
  ]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(), /mod-b@2\.0\.0/);
});

test("依存先が正しいバージョンで存在すれば問題なく解決できる", () => {
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-a", dependencies: [{ id: "mod-b", version: "1.0.0" }] }),
    makeManifest({ id: "mod-b", version: "1.0.0" }),
  ]);

  assert.equal(result.ok, true);
  // 依存先(mod-b)が依存元(mod-a)より先にロードされる
  assert.deepEqual(result.loadOrder, ["mod-b", "mod-a"]);
});

test("互いに競合するMODが両方存在するとエラーになる", () => {
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-a", conflicts: ["mod-b"] }),
    makeManifest({ id: "mod-b" }),
  ]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(), /競合/);
});

test("競合先が読み込まれていなければ問題ない", () => {
  const result = resolveModLoadOrder([makeManifest({ id: "mod-a", conflicts: ["mod-not-present"] })]);
  assert.equal(result.ok, true);
});

test("循環依存を検出する", () => {
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-a", dependencies: [{ id: "mod-b", version: "1.0.0" }] }),
    makeManifest({ id: "mod-b", dependencies: [{ id: "mod-a", version: "1.0.0" }] }),
  ]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(), /循環依存/);
});

test("自己参照の依存も循環依存として検出する", () => {
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-a", dependencies: [{ id: "mod-a", version: "1.0.0" }] }),
  ]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(), /循環依存/);
});

test("priorityが高いMODほど先にロードされる", () => {
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-low", priority: 1 }),
    makeManifest({ id: "mod-high", priority: 100 }),
    makeManifest({ id: "mod-mid", priority: 50 }),
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.loadOrder, ["mod-high", "mod-mid", "mod-low"]);
});

test("同じpriorityのMODはID昇順で安定的に並ぶ", () => {
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-z", priority: 10 }),
    makeManifest({ id: "mod-a", priority: 10 }),
    makeManifest({ id: "mod-m", priority: 10 }),
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.loadOrder, ["mod-a", "mod-m", "mod-z"]);
});

test("複数の依存関係を持つ複雑な構成でも正しい順序を解決できる", () => {
  // mod-c は mod-b に依存し、mod-b は mod-a に依存する
  const result = resolveModLoadOrder([
    makeManifest({ id: "mod-c", dependencies: [{ id: "mod-b", version: "1.0.0" }] }),
    makeManifest({ id: "mod-b", version: "1.0.0", dependencies: [{ id: "mod-a", version: "1.0.0" }] }),
    makeManifest({ id: "mod-a", version: "1.0.0" }),
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.loadOrder, ["mod-a", "mod-b", "mod-c"]);
});

test("空配列を渡しても正常に処理できる", () => {
  const result = resolveModLoadOrder([]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.loadOrder, []);
});
