import { z } from "zod";

/**
 * 重要：MODはすべて「データ」として扱う。
 * ここで定義したスキーマにマッチしないデータは読み込み時点で拒否する。
 * JavaScript/SQL/OSコマンド等の実行可能コードはMODから一切受け付けない。
 */

export const StatBlockSchema = z.object({
  hp: z.number().int().positive(),
  maxHp: z.number().int().positive(),
  attack: z.number().int().nonnegative(),
  defense: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
  mind: z.number().int().nonnegative(),
});

/**
 * 属性ごとの耐性値（%）。-25 = 25%多くダメージを受ける（弱点）、
 * +20 = 20%軽減する（耐性）。属性同士の固定相性（じゃんけん）は使わず、
 * 個体ごとにこの値だけで攻撃属性の効き方を決める。
 */
export const AttributeAffinitySchema = z.record(z.string(), z.number());

export const CharacterDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  baseStats: StatBlockSchema,
  growthPerLevel: StatBlockSchema.partial(),
  affinity: AttributeAffinitySchema,
  weaponSlot: z.string().optional(),
  armorSlot: z.string().optional(),
  skillIds: z.array(z.string()),
  ultimateSkillId: z.string().optional(),
  passiveIds: z.array(z.string()),
  source: z.enum(["base", "mod"]),
});

export const AnomalyDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "singular"]),
  dangerLevel: z.number().int().min(1).max(10),
  baseStats: StatBlockSchema,
  affinity: AttributeAffinitySchema,
  attackAttribute: z.string(),
  abilityIds: z.array(z.string()),
  containmentConditions: z.array(
    z.object({ type: z.string(), value: z.number() })
  ),
  breachConditions: z.array(
    z.object({ type: z.string(), value: z.number(), description: z.string() })
  ),
  researchTrack: z.array(
    z.object({
      stage: z.number().int().nonnegative(),
      requiredPoints: z.number().nonnegative(),
      unlockDescription: z.string(),
    })
  ),
  drops: z.array(
    z.object({
      itemId: z.string(),
      weight: z.number().nonnegative(),
      minQty: z.number().int().nonnegative(),
      maxQty: z.number().int().nonnegative(),
    })
  ),
  particleYieldPerCycle: z.number().nonnegative().optional(),
  source: z.enum(["base", "mod"]),
});

export const AttributeDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  source: z.enum(["base", "mod"]),
});

export const WeaponDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  slotType: z.string(),
  attributeId: z.string(),
  attackBonus: z.number(),
  criticalRateBonus: z.number().min(0).max(1),
  source: z.enum(["base", "mod"]),
});

export const ArmorDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  slotType: z.string(),
  defenseBonus: z.number(),
  affinityModifiers: z.record(z.string(), z.number()),
  source: z.enum(["base", "mod"]),
});

export const SkillDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  kind: z.enum(["skill", "ultimate"]),
  attributeId: z.string(),
  powerMultiplier: z.number().positive(),
  apCostOverride: z.number().int().positive().optional(),
  source: z.enum(["base", "mod"]),
});

export const FacilityLevelSpecSchema = z.object({
  level: z.number().int().positive(),
  upgradeCost: z.record(z.string(), z.number().nonnegative()),
  effectDescription: z.string(),
  effects: z.record(z.string(), z.number()),
});

export const FacilityDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  maxLevel: z.number().int().positive(),
  levels: z.array(FacilityLevelSpecSchema).min(1),
  source: z.enum(["base", "mod"]),
});

export const EncounterDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  description: z.string(),
  weight: z.number().nonnegative(),
  resourceReward: z.record(z.string(), z.number()).optional(),
  anomalyId: z.string().optional(),
  enemyEncounterId: z.string().optional(),
});

export const GalaxyNodeDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  nodeType: z.string(),
  tier: z.number().int().nonnegative(),
  connections: z.array(z.string()),
  encounters: z.array(EncounterDefinitionSchema),
  source: z.enum(["base", "mod"]),
});

export const GalaxyMapDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(GalaxyNodeDefinitionSchema).min(1),
});

export const FacilityStateSchema = z.object({
  facilityId: z.string().min(1),
  level: z.number().int().nonnegative(),
});

export const ResourcePoolSchema = z.record(z.string(), z.number());

export const BaseStateSchema = z.object({
  resources: ResourcePoolSchema,
  facilities: z.array(FacilityStateSchema),
});

export const ExplorationLogEntrySchema = z.object({
  nodeId: z.string(),
  encounterId: z.string().optional(),
  message: z.string(),
});

export const ExplorationStateSchema = z.object({
  currentNodeId: z.string().min(1),
  discoveredNodeIds: z.array(z.string()),
  exploredNodeIds: z.array(z.string()),
  log: z.array(ExplorationLogEntrySchema),
});

export const ContainmentRecordSchema = z.object({
  anomalyId: z.string().min(1),
  instanceId: z.string().min(1),
  status: z.enum(["contained", "unstable", "breached", "released"]),
  integrity: z.number().min(0).max(100),
  researchPoints: z.number().nonnegative(),
  researchStage: z.number().int().nonnegative(),
});

export const ContainmentCollectionSchema = z.object({
  records: z.array(ContainmentRecordSchema),
});

export const SaveModEntrySchema = z.object({
  modId: z.string().min(1),
  modVersion: z.string().min(1),
});

export const SaveMetaSchema = z.object({
  gameVersion: z.string().min(1),
  saveSchemaVersion: z.string().min(1),
  slotName: z.string().min(1),
  savedAt: z.string().min(1),
});

export const StoryChoiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  nextEventId: z.string().optional(),
  setFlags: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])).optional(),
});

export const StoryEventDefinitionSchema = z.object({
  id: z.string().min(1),
  chapter: z.number().int().positive(),
  type: z.string(),
  speaker: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  choices: z.array(StoryChoiceOptionSchema).optional(),
  nextEventId: z.string().optional(),
  unlockRecordId: z.string().optional(),
  targetId: z.string().optional(),
  commandId: z.string().optional(),
  setFlags: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  source: z.enum(["base", "mod"]),
});

export const StoryChapterDefinitionSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  firstEventId: z.string().min(1),
  source: z.enum(["base", "mod"]),
});

export const ResearchRecordDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  category: z.string().optional(),
  source: z.enum(["base", "mod"]),
});

export const StoryFlagsSchema = z.record(z.string(), z.union([z.boolean(), z.number(), z.string()]));

export const StoryStateSchema = z.object({
  currentChapter: z.number().int().nonnegative(),
  currentEventId: z.string().nullable(),
  currentScene: z.string().nullable(),
  completedEvents: z.array(z.string()),
  unlockedRecords: z.array(z.string()),
  storyFlags: StoryFlagsSchema,
  discoveredAnomalies: z.array(z.string()),
  requiredStoryVersion: z.string().min(1),
});

export const SaveDataSchema = z.object({
  meta: SaveMetaSchema,
  base: BaseStateSchema,
  exploration: ExplorationStateSchema,
  containment: ContainmentCollectionSchema,
  mods: z.array(SaveModEntrySchema),
  // Phase12以前のセーブにはstoryフィールドが存在しないため、
  // 古いセーブをロードしてもクラッシュしないようoptionalにする。
  // 未設定の場合、呼び出し側で createInitialStoryState() を使って補う。
  story: StoryStateSchema.optional(),
});

export const ModManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  author: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  game_version: z.string(),
  description: z.string(),
  dependencies: z
    .array(z.object({ id: z.string(), version: z.string() }))
    .default([]),
  conflicts: z.array(z.string()).default([]),
  priority: z.number().int().default(0),
  schema_version: z.string().default("1.0"),
});

export type ModManifest = z.infer<typeof ModManifestSchema>;
export type CharacterDefinitionParsed = z.infer<typeof CharacterDefinitionSchema>;
export type AnomalyDefinitionParsed = z.infer<typeof AnomalyDefinitionSchema>;
export type WeaponDefinitionParsed = z.infer<typeof WeaponDefinitionSchema>;
export type ArmorDefinitionParsed = z.infer<typeof ArmorDefinitionSchema>;
export type SkillDefinitionParsed = z.infer<typeof SkillDefinitionSchema>;
export type FacilityDefinitionParsed = z.infer<typeof FacilityDefinitionSchema>;
export type GalaxyNodeDefinitionParsed = z.infer<typeof GalaxyNodeDefinitionSchema>;
export type GalaxyMapDefinitionParsed = z.infer<typeof GalaxyMapDefinitionSchema>;
export type SaveDataParsed = z.infer<typeof SaveDataSchema>;
export type StoryEventDefinitionParsed = z.infer<typeof StoryEventDefinitionSchema>;
export type StoryChapterDefinitionParsed = z.infer<typeof StoryChapterDefinitionSchema>;
export type ResearchRecordDefinitionParsed = z.infer<typeof ResearchRecordDefinitionSchema>;
export type StoryStateParsed = z.infer<typeof StoryStateSchema>;
