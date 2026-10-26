import type {
  CharacterDefinition,
  AnomalyDefinition,
  WeaponDefinition,
  SkillDefinition,
  FacilityDefinition,
  StoryEventDefinition,
  ResearchRecordDefinition,
  StoryChapterDefinition,
  LoadedModEntities,
} from "@astral-archive/core";

import baseCharactersJson from "../../../../packages/data/characters/base_characters.json";
import baseAnomaliesJson from "../../../../packages/data/anomalies/base_anomalies.json";
import baseWeaponsJson from "../../../../packages/data/weapons/base_weapons.json";
import baseSkillsJson from "../../../../packages/data/skills/base_skills.json";
import baseFacilitiesJson from "../../../../packages/data/facilities/base_facilities.json";
import chapter01Json from "../../../../packages/data/story/chapters/chapter01.json";
import chapter01EventsJson from "../../../../packages/data/story/events/chapter01_events.json";
import researchRecordsJson from "../../../../packages/data/story/records/research_records.json";

/**
 * MODレジストリ統合用に、本体データをフルスキーマ形式（CharacterDefinition等）で読み込む。
 * combat/base/containment配下の簡易Seed型とは別に、MOD統合専用でここに用意する
 * （役割が異なるため意図的に分離している：Seedはランタイム生成用、こちらはレジストリ統合用）。
 * ストーリーイベント/研究記録/チャプターもここに含めることで、MODによる追加・上書きが
 * 既存のDataRegistry統合の仕組みにそのまま乗る（Phase13）。
 */
export const baseEntities: LoadedModEntities = {
  characters: baseCharactersJson as unknown as CharacterDefinition[],
  anomalies: baseAnomaliesJson as unknown as AnomalyDefinition[],
  weapons: baseWeaponsJson as unknown as WeaponDefinition[],
  skills: baseSkillsJson as unknown as SkillDefinition[],
  facilities: baseFacilitiesJson as unknown as FacilityDefinition[],
  storyEvents: chapter01EventsJson as unknown as StoryEventDefinition[],
  researchRecords: researchRecordsJson as unknown as ResearchRecordDefinition[],
  storyChapters: chapter01Json as unknown as StoryChapterDefinition[],
  errors: [],
};
