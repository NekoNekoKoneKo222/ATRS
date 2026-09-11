import type { BaseState } from "./base.js";
import type { ExplorationState } from "./exploration.js";
import type { ContainmentCollection } from "./containment.js";

export interface SaveModEntry {
  modId: string;
  modVersion: string;
}

export interface SaveMeta {
  /** ゲーム本体のバージョン（例: "0.1.0"） */
  gameVersion: string;
  /** セーブデータ自体のスキーマバージョン。マイグレーション判定に使う。 */
  saveSchemaVersion: string;
  /** セーブスロット名（クラウド上のsaves.slot_nameと対応） */
  slotName: string;
  /** ISO8601形式の保存日時。クラウド/ローカルの新旧比較に使う。 */
  savedAt: string;
}

/**
 * セーブデータ本体。
 * 現時点で永続化対象として実装済みのシステム（基地・探索・収容/研究）を保持する。
 * キャラクター育成・アイテム・ストーリー進行は、対応するゲームシステムが実装された
 * フェーズでこの型に追加していく想定（現状のプレイヤーキャラクターは戦闘開始時に
 * packages/data から都度生成される固定編成のため、まだ永続化対象がない）。
 */
export interface SaveData {
  meta: SaveMeta;
  base: BaseState;
  exploration: ExplorationState;
  containment: ContainmentCollection;
  mods: SaveModEntry[];
}

export interface SaveMigration {
  fromVersion: string;
  toVersion: string;
  /** 生のJSONオブジェクトを受け取り、次バージョンの形式へ変換する */
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}
