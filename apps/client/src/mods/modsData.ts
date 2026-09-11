import type {
  CharacterDefinition,
  AnomalyDefinition,
  WeaponDefinition,
  SkillDefinition,
  FacilityDefinition,
  LoadedModEntities,
} from "@astral-archive/core";

import baseCharactersJson from "../../../../packages/data/characters/base_characters.json";
import baseAnomaliesJson from "../../../../packages/data/anomalies/base_anomalies.json";
import baseWeaponsJson from "../../../../packages/data/weapons/base_weapons.json";
import baseSkillsJson from "../../../../packages/data/skills/base_skills.json";
import baseFacilitiesJson from "../../../../packages/data/facilities/base_facilities.json";

/**
 * MODレジストリ統合用に、本体データをフルスキーマ形式（CharacterDefinition等）で読み込む。
 * combat/base/containment配下の簡易Seed型とは別に、MOD統合専用でここに用意する
 * （役割が異なるため意図的に分離している：Seedはランタイム生成用、こちらはレジストリ統合用）。
 */
export const baseEntities: LoadedModEntities = {
  characters: baseCharactersJson as unknown as CharacterDefinition[],
  anomalies: baseAnomaliesJson as unknown as AnomalyDefinition[],
  weapons: baseWeaponsJson as unknown as WeaponDefinition[],
  skills: baseSkillsJson as unknown as SkillDefinition[],
  facilities: baseFacilitiesJson as unknown as FacilityDefinition[],
  errors: [],
};
