import type { BaseState } from "../types/base.js";
import type { ExplorationState } from "../types/exploration.js";
import type { ContainmentCollection } from "../types/containment.js";
import type { SaveData, SaveMeta, SaveModEntry, SaveMigration } from "../types/save.js";

export const CURRENT_SAVE_SCHEMA_VERSION = "1.0";

export interface CreateSaveDataInput {
  gameVersion: string;
  slotName: string;
  base: BaseState;
  exploration: ExplorationState;
  containment: ContainmentCollection;
  mods: SaveModEntry[];
  /** テスト等で保存時刻を固定したい場合に注入する。省略時は現在時刻。 */
  now?: () => Date;
}

/** 現在のゲーム状態からセーブデータを構築する */
export function createSaveData(input: CreateSaveDataInput): SaveData {
  const now = input.now ? input.now() : new Date();
  const meta: SaveMeta = {
    gameVersion: input.gameVersion,
    saveSchemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    slotName: input.slotName,
    savedAt: now.toISOString(),
  };

  return {
    meta,
    base: input.base,
    exploration: input.exploration,
    containment: input.containment,
    mods: input.mods,
  };
}

/** セーブデータをJSON文字列にシリアライズする */
export function serializeSaveData(save: SaveData): string {
  return JSON.stringify(save);
}

export type DeserializeSaveResult =
  | { ok: true; data: SaveData }
  | { ok: false; error: string };

/**
 * JSON文字列からセーブデータを復元する。
 * ここでは構文エラーのみをチェックする軽量版。厳密なスキーマ検証は
 * data-loader/schemas.ts の SaveDataSchema と組み合わせて呼び出し側で行う。
 */
export function deserializeSaveData(raw: string): DeserializeSaveResult {
  try {
    const parsed = JSON.parse(raw) as SaveData;
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: `JSON構文エラー: ${(e as Error).message}` };
  }
}

export interface ModRequirementCheckResult {
  ok: boolean;
  /** ローカルに全く存在しないMOD */
  missing: SaveModEntry[];
  /** 存在するがバージョンが異なるMOD */
  versionMismatched: { required: SaveModEntry; installedVersion: string }[];
}

/**
 * セーブが要求するMOD一覧と、現在インストール済みのMOD一覧を比較する。
 * 不足やバージョン不一致がある場合、ロード前にユーザーへ警告するために使う。
 */
export function checkSaveModRequirements(
  saveMods: SaveModEntry[],
  installedMods: SaveModEntry[]
): ModRequirementCheckResult {
  const installedVersionById = new Map(installedMods.map((m) => [m.modId, m.modVersion]));
  const missing: SaveModEntry[] = [];
  const versionMismatched: { required: SaveModEntry; installedVersion: string }[] = [];

  for (const required of saveMods) {
    const installedVersion = installedVersionById.get(required.modId);
    if (installedVersion === undefined) {
      missing.push(required);
    } else if (installedVersion !== required.modVersion) {
      versionMismatched.push({ required, installedVersion });
    }
  }

  return { ok: missing.length === 0 && versionMismatched.length === 0, missing, versionMismatched };
}

export interface MigrationResult {
  data: Record<string, unknown>;
  appliedMigrations: string[];
  finalVersion: string;
}

/**
 * セーブデータのスキーマバージョンを、登録済みマイグレーション列を辿って
 * 現在のバージョンまで順に変換する。
 * 対応するマイグレーションが見つからない場合はそこで停止し、
 * それまでに適用できた分だけを返す（呼び出し側で最終バージョンを確認すること）。
 */
export function applySaveMigrations(
  rawData: Record<string, unknown>,
  currentVersion: string,
  migrations: SaveMigration[]
): MigrationResult {
  let data = rawData;
  const applied: string[] = [];

  const meta = data.meta as Record<string, unknown> | undefined;
  let version = typeof meta?.saveSchemaVersion === "string" ? meta.saveSchemaVersion : "unknown";

  // migrations.length を超えて回ることはあり得ないため、安全弁として同じ回数だけループさせる
  for (let i = 0; i < migrations.length && version !== currentVersion; i++) {
    const migration = migrations.find((m) => m.fromVersion === version);
    if (!migration) break;

    data = migration.migrate(data);
    applied.push(`${migration.fromVersion}->${migration.toVersion}`);
    version = migration.toVersion;
  }

  return { data, appliedMigrations: applied, finalVersion: version };
}

export type SaveRecencyComparison = "a_newer" | "b_newer" | "same";

/**
 * 2つのセーブの保存日時を比較する（クラウド/ローカルの競合解決UIに使う）。
 * ISO文字列として不正な場合は例外を投げず "same" 扱いにフォールバックする。
 */
export function compareSaveRecency(savedAtA: string, savedAtB: string): SaveRecencyComparison {
  const timeA = new Date(savedAtA).getTime();
  const timeB = new Date(savedAtB).getTime();

  if (Number.isNaN(timeA) || Number.isNaN(timeB) || timeA === timeB) return "same";
  return timeA > timeB ? "a_newer" : "b_newer";
}
