import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categorizeEntityFile,
  loadModEntities,
  buildEntityRegistrySet,
  populateRegistry,
  createEntityRegistrySet,
  type ModEntityFile,
  type LoadedModEntities,
} from "../systems/modLoader.js";
import type { CharacterDefinition } from "../types/character.js";

function emptyEntities(): LoadedModEntities {
  return {
    characters: [],
    anomalies: [],
    weapons: [],
    skills: [],
    facilities: [],
    storyEvents: [],
    researchRecords: [],
    storyChapters: [],
    errors: [],
  };
}

const validCharacterJson = JSON.stringify({
  id: "char_mod_test",
  name: "MODテストキャラ",
  description: "テスト用",
  baseStats: { hp: 100, maxHp: 100, attack: 10, defense: 5, speed: 5, mind: 5 },
  growthPerLevel: {},
  affinity: {},
  skillIds: [],
  passiveIds: [],
  source: "mod",
});

test("categorizeEntityFileはパス規約からエンティティ種別を判定する", () => {
  assert.equal(categorizeEntityFile("entities/characters/char_x.json"), "character");
  assert.equal(categorizeEntityFile("entities/enemies/aa_x.json"), "anomaly");
  assert.equal(categorizeEntityFile("entities/weapons/w_x.json"), "weapon");
  assert.equal(categorizeEntityFile("entities/skills/s_x.json"), "skill");
  assert.equal(categorizeEntityFile("entities/facilities/f_x.json"), "facility");
  assert.equal(categorizeEntityFile("manifest.json"), "unknown");
});

test("categorizeEntityFileはバックスラッシュ区切りのパスも正規化して判定する", () => {
  assert.equal(categorizeEntityFile("entities\\characters\\char_x.json"), "character");
});

test("loadModEntitiesは正しいJSONをスキーマ検証して読み込む", () => {
  const files: ModEntityFile[] = [{ path: "entities/characters/char_mod_test.json", content: validCharacterJson }];
  const result = loadModEntities(files, "example-mod");

  assert.equal(result.characters.length, 1);
  assert.equal(result.characters[0]?.id, "char_mod_test");
  assert.equal(result.errors.length, 0);
});

test("loadModEntitiesは不正なJSONをエラーとして記録し、他のファイルには影響しない", () => {
  const files: ModEntityFile[] = [
    { path: "entities/characters/broken.json", content: "{ not valid json" },
    { path: "entities/characters/char_mod_test.json", content: validCharacterJson },
  ];
  const result = loadModEntities(files, "example-mod");

  assert.equal(result.characters.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0]!, /broken\.json/);
});

test("loadModEntitiesはスキーマに合致しないデータをエラーとして記録する", () => {
  const files: ModEntityFile[] = [
    { path: "entities/characters/invalid.json", content: JSON.stringify({ id: "x" }) }, // 必須フィールド不足
  ];
  const result = loadModEntities(files, "example-mod");

  assert.equal(result.characters.length, 0);
  assert.equal(result.errors.length > 0, true);
});

test("loadModEntitiesはmanifest.jsonを静かに無視する", () => {
  const files: ModEntityFile[] = [{ path: "manifest.json", content: "{}" }];
  const result = loadModEntities(files, "example-mod");

  assert.equal(result.errors.length, 0);
});

test("loadModEntitiesは未知のエンティティファイルをエラーとして記録する", () => {
  const files: ModEntityFile[] = [{ path: "entities/unknown_kind/x.json", content: "{}" }];
  const result = loadModEntities(files, "example-mod");

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0]!, /未知のエンティティ種別/);
});

test("populateRegistryはID付きエンティティをまとめて登録する", () => {
  const registry = createEntityRegistrySet().characters;
  const characters: CharacterDefinition[] = [
    {
      id: "char_a",
      name: "A",
      description: "",
      baseStats: { hp: 1, maxHp: 1, attack: 1, defense: 1, speed: 1, mind: 1 },
      growthPerLevel: {},
      affinity: {},
      skillIds: [],
      passiveIds: [],
      source: "base",
    },
  ];

  populateRegistry(registry, characters, "base", 0);
  assert.equal(registry.get("char_a")?.name, "A");
});

test("buildEntityRegistrySetは本体データとMODデータを統合し、優先度に応じて上書きする", () => {
  const baseCharacter: CharacterDefinition = {
    id: "char_shared",
    name: "本体版",
    description: "",
    baseStats: { hp: 100, maxHp: 100, attack: 10, defense: 5, speed: 5, mind: 5 },
    growthPerLevel: {},
    affinity: {},
    skillIds: [],
    passiveIds: [],
    source: "base",
  };
  const modCharacter: CharacterDefinition = { ...baseCharacter, name: "MOD版" };

  const baseEntities = emptyEntities();
  baseEntities.characters.push(baseCharacter);

  const modEntities = emptyEntities();
  modEntities.characters.push(modCharacter);

  const registries = buildEntityRegistrySet(baseEntities, [
    { sourceId: "example-mod", priority: 10, entities: modEntities },
  ]);

  assert.equal(registries.characters.get("char_shared")?.name, "MOD版"); // priority 10 が base(0) を上書き
  assert.equal(registries.characters.conflicts.length, 1);
});

test("buildEntityRegistrySetはpriorityが低いMODが本体データを上書きしないことを確認する", () => {
  // DataRegistry.register は priority >= existing.priority のときのみ上書きするため、
  // base(0)より低いpriorityは存在しない前提だが、MOD同士の優先度比較として検証する。
  const baseEntities = emptyEntities();

  const lowPriorityMod = emptyEntities();
  lowPriorityMod.characters.push({
    id: "char_x",
    name: "低優先度MOD版",
    description: "",
    baseStats: { hp: 1, maxHp: 1, attack: 1, defense: 1, speed: 1, mind: 1 },
    growthPerLevel: {},
    affinity: {},
    skillIds: [],
    passiveIds: [],
    source: "mod",
  });

  const highPriorityMod = emptyEntities();
  highPriorityMod.characters.push({
    id: "char_x",
    name: "高優先度MOD版",
    description: "",
    baseStats: { hp: 1, maxHp: 1, attack: 1, defense: 1, speed: 1, mind: 1 },
    growthPerLevel: {},
    affinity: {},
    skillIds: [],
    passiveIds: [],
    source: "mod",
  });

  const registries = buildEntityRegistrySet(baseEntities, [
    { sourceId: "low-mod", priority: 5, entities: lowPriorityMod },
    { sourceId: "high-mod", priority: 20, entities: highPriorityMod },
  ]);

  assert.equal(registries.characters.get("char_x")?.name, "高優先度MOD版");
});

test("categorizeEntityFileはストーリーイベント/研究記録のパスを判定する（Phase13）", () => {
  assert.equal(categorizeEntityFile("entities/events/chapter02_intro.json"), "story_event");
  assert.equal(categorizeEntityFile("entities/records/record_002.json"), "research_record");
});

test("loadModEntitiesはMODが提供するストーリーイベントを読み込む", () => {
  const files: ModEntityFile[] = [
    {
      path: "entities/events/mod_event.json",
      content: JSON.stringify({
        id: "mod_event_1",
        chapter: 2,
        type: "narration",
        text: "MOD追加イベント",
        source: "mod",
      }),
    },
  ];

  const result = loadModEntities(files, "example-mod");
  assert.equal(result.storyEvents.length, 1);
  assert.equal(result.storyEvents[0]?.id, "mod_event_1");
  assert.equal(result.errors.length, 0);
});

test("loadModEntitiesはMODが提供する研究記録を読み込む", () => {
  const files: ModEntityFile[] = [
    {
      path: "entities/records/mod_record.json",
      content: JSON.stringify({
        id: "mod_record_1",
        title: "MOD追加記録",
        content: "内容",
        source: "mod",
      }),
    },
  ];

  const result = loadModEntities(files, "example-mod");
  assert.equal(result.researchRecords.length, 1);
  assert.equal(result.researchRecords[0]?.title, "MOD追加記録");
  assert.equal(result.errors.length, 0);
});

test("loadModEntitiesは不正なストーリーイベントデータをエラーとして記録する", () => {
  const files: ModEntityFile[] = [
    { path: "entities/events/broken.json", content: JSON.stringify({ id: "" }) }, // chapter/type/source欠落
  ];

  const result = loadModEntities(files, "example-mod");
  assert.equal(result.storyEvents.length, 0);
  assert.ok(result.errors.length > 0);
});

test("buildEntityRegistrySetはストーリーイベント・研究記録も統合する", () => {
  const baseEntities = emptyEntities();
  baseEntities.storyEvents.push({ id: "ev_base", chapter: 1, type: "narration", text: "本体", source: "base" });
  baseEntities.researchRecords.push({ id: "record_base", title: "本体記録", content: "内容", source: "base" });

  const modEntities = emptyEntities();
  modEntities.storyEvents.push({ id: "ev_mod", chapter: 2, type: "narration", text: "MOD", source: "mod" });

  const registries = buildEntityRegistrySet(baseEntities, [
    { sourceId: "example-mod", priority: 10, entities: modEntities },
  ]);

  assert.equal(registries.storyEvents.all().length, 2);
  assert.equal(registries.researchRecords.get("record_base")?.title, "本体記録");
});

test("mergeStoryChaptersは本体チャプターとMODチャプターをID(章番号)順に統合する", () => {
  const baseEntities = emptyEntities();
  baseEntities.storyChapters.push({ id: 1, title: "第1章", description: "", firstEventId: "ev1", source: "base" });

  const modEntities = emptyEntities();
  modEntities.storyChapters.push({ id: 2, title: "MOD第2章", description: "", firstEventId: "ev2", source: "mod" });

  const registries = buildEntityRegistrySet(baseEntities, [
    { sourceId: "example-mod", priority: 10, entities: modEntities },
  ]);

  assert.equal(registries.storyChapters.length, 2);
  assert.deepEqual(
    registries.storyChapters.map((c) => c.id),
    [1, 2]
  );
});

test("mergeStoryChaptersはpriorityが高いMODが同じ章番号を上書きする", () => {
  const baseEntities = emptyEntities();
  baseEntities.storyChapters.push({ id: 1, title: "本体版", description: "", firstEventId: "ev1", source: "base" });

  const modEntities = emptyEntities();
  modEntities.storyChapters.push({ id: 1, title: "MOD版", description: "", firstEventId: "ev1_mod", source: "mod" });

  const registries = buildEntityRegistrySet(baseEntities, [
    { sourceId: "example-mod", priority: 10, entities: modEntities },
  ]);

  assert.equal(registries.storyChapters.length, 1);
  assert.equal(registries.storyChapters[0]?.title, "MOD版");
});
