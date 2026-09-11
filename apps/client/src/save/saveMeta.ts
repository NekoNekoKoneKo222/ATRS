import type { SaveModEntry } from "@astral-archive/core";

/** ゲーム本体のバージョン。セーブメタ情報に記録する。 */
export const GAME_VERSION = "0.1.0";

/** 現時点ではセーブスロットは単一のみサポートする。 */
export const DEFAULT_SLOT_NAME = "default";

/**
 * 現在インストール済みとみなすMOD一覧。
 * MODシステムのランタイム組み込みはPhase10/11で行うため、現時点では常に空。
 * ここを実データに差し替えるだけでMOD要件チェックがそのまま機能する設計にしている。
 */
export const INSTALLED_MODS: SaveModEntry[] = [];
