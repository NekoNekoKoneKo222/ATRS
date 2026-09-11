import { test } from "node:test";
import assert from "node:assert/strict";
import { filterAndSortMods, type WorkshopModSummary } from "../systems/workshopSystem.js";

function makeMod(overrides: Partial<WorkshopModSummary>): WorkshopModSummary {
  return {
    id: "id-1",
    slug: "slug-1",
    name: "テストMOD",
    description: "説明文",
    authorName: "作者",
    downloads: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("filterAndSortModsは名前の部分一致で検索できる", () => {
  const mods = [
    makeMod({ id: "1", name: "Cosmic Creatures" }),
    makeMod({ id: "2", name: "New Weapons" }),
  ];

  const result = filterAndSortMods(mods, { searchText: "cosmic", sortBy: "name" });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "1");
});

test("filterAndSortModsは説明文の部分一致でも検索できる", () => {
  const mods = [
    makeMod({ id: "1", name: "Mod A", description: "星異体を追加する" }),
    makeMod({ id: "2", name: "Mod B", description: "武器を追加する" }),
  ];

  const result = filterAndSortMods(mods, { searchText: "星異体", sortBy: "name" });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "1");
});

test("filterAndSortModsは検索語が空の場合すべて返す", () => {
  const mods = [makeMod({ id: "1" }), makeMod({ id: "2" })];
  const result = filterAndSortMods(mods, { searchText: "", sortBy: "name" });
  assert.equal(result.length, 2);
});

test("filterAndSortModsはpopular指定でダウンロード数の降順に並べる", () => {
  const mods = [
    makeMod({ id: "low", downloads: 10 }),
    makeMod({ id: "high", downloads: 100 }),
    makeMod({ id: "mid", downloads: 50 }),
  ];

  const result = filterAndSortMods(mods, { sortBy: "popular" });

  assert.deepEqual(result.map((m) => m.id), ["high", "mid", "low"]);
});

test("filterAndSortModsはnewest指定で作成日時の降順に並べる", () => {
  const mods = [
    makeMod({ id: "old", createdAt: "2025-01-01T00:00:00Z" }),
    makeMod({ id: "new", createdAt: "2026-06-01T00:00:00Z" }),
    makeMod({ id: "mid", createdAt: "2026-01-01T00:00:00Z" }),
  ];

  const result = filterAndSortMods(mods, { sortBy: "newest" });

  assert.deepEqual(result.map((m) => m.id), ["new", "mid", "old"]);
});

test("filterAndSortModsはname指定で名前の辞書順に並べる", () => {
  const mods = [makeMod({ id: "b", name: "Bravo" }), makeMod({ id: "a", name: "Alpha" })];
  const result = filterAndSortMods(mods, { sortBy: "name" });
  assert.deepEqual(result.map((m) => m.id), ["a", "b"]);
});

test("filterAndSortModsは元の配列を変更しない", () => {
  const mods = [makeMod({ id: "b", downloads: 1 }), makeMod({ id: "a", downloads: 2 })];
  const originalOrder = mods.map((m) => m.id);

  filterAndSortMods(mods, { sortBy: "popular" });

  assert.deepEqual(mods.map((m) => m.id), originalOrder);
});
