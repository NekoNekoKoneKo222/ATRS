import { loadJsonWithSchema, DataRegistry } from "../data-loader/loader.js";
import {
  CharacterDefinitionSchema,
  AnomalyDefinitionSchema,
  WeaponDefinitionSchema,
  SkillDefinitionSchema,
  FacilityDefinitionSchema,
} from "../data-loader/schemas.js";
import type { CharacterDefinition } from "../types/character.js";
import type { AnomalyDefinition } from "../types/anomaly.js";
import type { WeaponDefinition, SkillDefinition } from "../types/equipment.js";
import type { FacilityDefinition } from "../types/base.js";

/** MODが提供する1ファイル分の生データ */
export interface ModEntityFile {
  /** MOD内での相対パス。例: "entities/characters/char_x.json" */
  path: string;
  /** ファイルの内容（JSON文字列）。任意コードは受け付けず、常にJSONとしてのみ扱う。 */
  content: string;
}

export type EntityKind = "character" | "anomaly" | "weapon" | "skill" | "facility" | "unknown";

/**
 * ファイルパスの規約からエンティティ種別を判定する。
 * mod-spec.md の `entities/{characters,enemies,weapons,skills,facilities}/` 構成に対応する。
 */
export function categorizeEntityFile(path: string): EntityKind {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.includes("entities/characters/")) return "character";
  if (normalized.includes("entities/enemies/")) return "anomaly";
  if (normalized.includes("entities/weapons/")) return "weapon";
  if (normalized.includes("entities/skills/")) return "skill";
  if (normalized.includes("entities/facilities/")) return "facility";
  return "unknown";
}

export interface LoadedModEntities {
  characters: CharacterDefinition[];
  anomalies: AnomalyDefinition[];
  weapons: WeaponDefinition[];
  skills: SkillDefinition[];
  facilities: FacilityDefinition[];
  /** パス付きのエラーメッセージ一覧（検証失敗・未知のファイルなど） */
  errors: string[];
}

function emptyLoadedEntities(): LoadedModEntities {
  return { characters: [], anomalies: [], weapons: [], skills: [], facilities: [], errors: [] };
}

/**
 * MODが提供するファイル群を、種別ごとにスキーマ検証しながら読み込む。
 * 1ファイルでも検証に失敗した場合、そのファイルだけをスキップしエラーに記録する
 * （MOD全体を無効化するかどうかは呼び出し側の判断に委ねる）。
 */
export function loadModEntities(files: ModEntityFile[], sourceId: string): LoadedModEntities {
  const result = emptyLoadedEntities();

  for (const file of files) {
    const kind = categorizeEntityFile(file.path);

    switch (kind) {
      case "character": {
        const r = loadJsonWithSchema(file.content, CharacterDefinitionSchema, sourceId);
        if (r.ok && r.value) result.characters.push(r.value as CharacterDefinition);
        else result.errors.push(...(r.errors ?? []).map((e) => `${file.path}: ${e}`));
        break;
      }
      case "anomaly": {
        const r = loadJsonWithSchema(file.content, AnomalyDefinitionSchema, sourceId);
        if (r.ok && r.value) result.anomalies.push(r.value as AnomalyDefinition);
        else result.errors.push(...(r.errors ?? []).map((e) => `${file.path}: ${e}`));
        break;
      }
      case "weapon": {
        const r = loadJsonWithSchema(file.content, WeaponDefinitionSchema, sourceId);
        if (r.ok && r.value) result.weapons.push(r.value as WeaponDefinition);
        else result.errors.push(...(r.errors ?? []).map((e) => `${file.path}: ${e}`));
        break;
      }
      case "skill": {
        const r = loadJsonWithSchema(file.content, SkillDefinitionSchema, sourceId);
        if (r.ok && r.value) result.skills.push(r.value as SkillDefinition);
        else result.errors.push(...(r.errors ?? []).map((e) => `${file.path}: ${e}`));
        break;
      }
      case "facility": {
        const r = loadJsonWithSchema(file.content, FacilityDefinitionSchema, sourceId);
        if (r.ok && r.value) result.facilities.push(r.value as FacilityDefinition);
        else result.errors.push(...(r.errors ?? []).map((e) => `${file.path}: ${e}`));
        break;
      }
      case "unknown":
        // manifest.json など、エンティティではない既知のファイルは静かに無視する
        if (!file.path.endsWith("manifest.json")) {
          result.errors.push(`${file.path}: 未知のエンティティ種別のためスキップしました`);
        }
        break;
    }
  }

  return result;
}

/**
 * ID付きのエンティティ配列をDataRegistryへまとめて登録するための汎用ヘルパー。
 * 本体データ・複数MODを同じレジストリに統合する際に使う。
 */
export function populateRegistry<T extends { id: string }>(
  registry: DataRegistry<T>,
  entities: T[],
  sourceId: string,
  priority: number
): void {
  for (const entity of entities) {
    registry.register(entity, sourceId, priority);
  }
}

export interface EntityRegistrySet {
  characters: DataRegistry<CharacterDefinition>;
  anomalies: DataRegistry<AnomalyDefinition>;
  weapons: DataRegistry<WeaponDefinition>;
  skills: DataRegistry<SkillDefinition>;
  facilities: DataRegistry<FacilityDefinition>;
}

export function createEntityRegistrySet(): EntityRegistrySet {
  return {
    characters: new DataRegistry<CharacterDefinition>(),
    anomalies: new DataRegistry<AnomalyDefinition>(),
    weapons: new DataRegistry<WeaponDefinition>(),
    skills: new DataRegistry<SkillDefinition>(),
    facilities: new DataRegistry<FacilityDefinition>(),
  };
}

export interface EntitySource {
  sourceId: string;
  priority: number;
  entities: LoadedModEntities;
}

/**
 * 本体データ（priority=0固定）と、複数MODのエンティティ群を1つのレジストリ集合へ統合する。
 * MODは配列の順序に関係なくpriorityで上書き優先度が決まる
 * （DataRegistry.register が既存より高い/同等のpriorityを上書き採用する）。
 */
export function buildEntityRegistrySet(baseEntities: LoadedModEntities, mods: EntitySource[]): EntityRegistrySet {
  const registries = createEntityRegistrySet();

  populateRegistry(registries.characters, baseEntities.characters, "base", 0);
  populateRegistry(registries.anomalies, baseEntities.anomalies, "base", 0);
  populateRegistry(registries.weapons, baseEntities.weapons, "base", 0);
  populateRegistry(registries.skills, baseEntities.skills, "base", 0);
  populateRegistry(registries.facilities, baseEntities.facilities, "base", 0);

  for (const mod of mods) {
    populateRegistry(registries.characters, mod.entities.characters, mod.sourceId, mod.priority);
    populateRegistry(registries.anomalies, mod.entities.anomalies, mod.sourceId, mod.priority);
    populateRegistry(registries.weapons, mod.entities.weapons, mod.sourceId, mod.priority);
    populateRegistry(registries.skills, mod.entities.skills, mod.sourceId, mod.priority);
    populateRegistry(registries.facilities, mod.entities.facilities, mod.sourceId, mod.priority);
  }

  return registries;
}
