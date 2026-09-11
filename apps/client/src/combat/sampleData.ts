import type {
  CombatConfig,
  CombatantState,
  CombatEnemyState,
  CharacterRuntime,
} from "@astral-archive/core";
import { initializeCombat, type SkillDefinition } from "@astral-archive/core";

import combatConfigJson from "../../../../packages/data/config/combatConfig.json";
import baseCharactersJson from "../../../../packages/data/characters/base_characters.json";
import baseAnomaliesJson from "../../../../packages/data/anomalies/base_anomalies.json";
import baseWeaponsJson from "../../../../packages/data/weapons/base_weapons.json";
import baseSkillsJson from "../../../../packages/data/skills/base_skills.json";

export const combatConfig = combatConfigJson as unknown as CombatConfig;

interface WeaponSeed {
  id: string;
  name: string;
  attributeId: string;
  attackBonus: number;
}

export interface CharacterSeed {
  id: string;
  name: string;
  baseStats: { hp: number; maxHp: number; attack: number; defense: number; speed: number; mind: number };
  affinity: Record<string, number>;
  startingWeaponId: string;
  skillIds: string[];
  ultimateSkillId?: string;
}

interface AnomalySeed {
  id: string;
  name: string;
  dangerLevel: number;
  baseStats: { hp: number; maxHp: number; attack: number; defense: number; speed: number; mind: number };
  affinity: Record<string, number>;
  attackAttribute: string;
}

const characterSeeds = baseCharactersJson as unknown as CharacterSeed[];
const anomalySeeds = baseAnomaliesJson as unknown as AnomalySeed[];
const weaponSeeds = baseWeaponsJson as unknown as WeaponSeed[];
const skillSeeds = baseSkillsJson as unknown as SkillDefinition[];

export const weaponsById = new Map(weaponSeeds.map((w) => [w.id, w]));
export const skillsById = new Map(skillSeeds.map((s) => [s.id, s]));
export const characterDefsById = new Map(characterSeeds.map((c) => [c.id, c]));

export function getSkillDefinition(skillId: string): SkillDefinition | undefined {
  return skillsById.get(skillId);
}

/** 表示名レジストリ（instanceId -> 日本語名）。UI表示専用でcoreのランタイムには含めない。 */
export const displayNames: Record<string, string> = {};

function makeRuntime(seed: CharacterSeed, instanceId: string): CharacterRuntime {
  displayNames[instanceId] = seed.name;
  const weapon = weaponsById.get(seed.startingWeaponId);
  return {
    definitionId: seed.id,
    instanceId,
    level: 1,
    exp: 0,
    currentStats: { ...seed.baseStats, attack: seed.baseStats.attack + (weapon?.attackBonus ?? 0) },
    boost: { level: 0, gauge: 0 },
    instability: { value: 0 },
    skills: [],
    statusEffects: [],
    equippedWeaponId: seed.startingWeaponId,
    affinity: seed.affinity,
    attackAttributeId: weapon?.attributeId ?? "HEAT",
  };
}

function makeEnemyRuntime(seed: AnomalySeed, anomalyId: string): CharacterRuntime {
  displayNames[anomalyId] = seed.name;
  return {
    definitionId: seed.id,
    instanceId: anomalyId,
    level: 1,
    exp: 0,
    currentStats: { ...seed.baseStats },
    boost: { level: 0, gauge: 0 },
    instability: { value: 0 },
    skills: [],
    statusEffects: [],
    affinity: seed.affinity,
    attackAttributeId: seed.attackAttribute,
  };
}

/** パーティ4人 + 星異体2体の初期戦闘状態を作る（Phase 2/3 UI検証用のサンプル編成） */
export function createSampleCombat() {
  const party: CombatantState[] = characterSeeds.map((seed, i) => ({
    side: "player",
    character: makeRuntime(seed, `party-${i + 1}`),
    actionPointsRemaining: combatConfig.actionPoints.maxActionPoints,
    isDefending: false,
    isDefeated: false,
  }));

  const enemies: CombatEnemyState[] = anomalySeeds.map((seed) => ({
    side: "enemy",
    anomalyId: seed.id,
    runtime: makeEnemyRuntime(seed, seed.id),
    isDefeated: false,
  }));

  return initializeCombat(party, enemies, { config: combatConfig, getSkillDefinition });
}

