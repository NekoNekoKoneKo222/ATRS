import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { loadJsonWithSchema, DataRegistry } from "../data-loader/loader.js";

const testSchema = z.object({ id: z.string().min(1), value: z.number() });

test("loadJsonWithSchemaは正しいJSONとスキーマ一致でokを返す", () => {
  const result = loadJsonWithSchema(JSON.stringify({ id: "a", value: 1 }), testSchema, "test-source");
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { id: "a", value: 1 });
});

test("loadJsonWithSchemaは不正なJSON構文をエラーとして返す（例外を投げない）", () => {
  const result = loadJsonWithSchema("{ invalid json", testSchema, "test-source");
  assert.equal(result.ok, false);
  assert.match(result.errors?.[0] ?? "", /JSON構文エラー/);
});

test("loadJsonWithSchemaはスキーマ不一致をエラーとして返す", () => {
  const result = loadJsonWithSchema(JSON.stringify({ id: "", value: "not-a-number" }), testSchema, "test-source");
  assert.equal(result.ok, false);
  assert.ok((result.errors?.length ?? 0) > 0);
});

test("loadJsonWithSchemaはsourceIdを結果に含める", () => {
  const result = loadJsonWithSchema(JSON.stringify({ id: "a", value: 1 }), testSchema, "my-mod");
  assert.equal(result.sourceId, "my-mod");
});

test("DataRegistryは新規登録したエンティティを取得できる", () => {
  const registry = new DataRegistry<{ id: string; name: string }>();
  registry.register({ id: "x", name: "X" }, "base", 0);
  assert.equal(registry.get("x")?.name, "X");
});

test("DataRegistryは存在しないIDに対してundefinedを返す", () => {
  const registry = new DataRegistry<{ id: string }>();
  assert.equal(registry.get("unknown"), undefined);
});

test("DataRegistryは同一priorityでも後から登録した方を採用する", () => {
  const registry = new DataRegistry<{ id: string; name: string }>();
  registry.register({ id: "x", name: "First" }, "base", 0);
  registry.register({ id: "x", name: "Second" }, "mod-a", 0);
  assert.equal(registry.get("x")?.name, "Second");
});

test("DataRegistryはpriorityが低い登録では上書きしない", () => {
  const registry = new DataRegistry<{ id: string; name: string }>();
  registry.register({ id: "x", name: "HighPriority" }, "mod-high", 10);
  registry.register({ id: "x", name: "LowPriority" }, "mod-low", 1);
  assert.equal(registry.get("x")?.name, "HighPriority");
});

test("DataRegistryは競合が起きた場合にconflictsへ記録する", () => {
  const registry = new DataRegistry<{ id: string }>();
  registry.register({ id: "x" }, "base", 0);
  registry.register({ id: "x" }, "mod-a", 5);
  assert.equal(registry.conflicts.length, 1);
  assert.equal(registry.conflicts[0]?.winner, "mod-a");
  assert.deepEqual(registry.conflicts[0]?.losers, ["base"]);
});

test("DataRegistryは競合がなければconflictsに何も記録しない", () => {
  const registry = new DataRegistry<{ id: string }>();
  registry.register({ id: "a" }, "base", 0);
  registry.register({ id: "b" }, "base", 0);
  assert.equal(registry.conflicts.length, 0);
});

test("DataRegistry.all()は登録済みの全エンティティを返す", () => {
  const registry = new DataRegistry<{ id: string }>();
  registry.register({ id: "a" }, "base", 0);
  registry.register({ id: "b" }, "base", 0);
  const all = registry.all();
  assert.equal(all.length, 2);
  assert.deepEqual(
    all.map((e) => e.id).sort(),
    ["a", "b"]
  );
});
