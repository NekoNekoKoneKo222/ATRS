# セーブデータ仕様

## 方針

- ローカルセーブ（オフライン用）とクラウドセーブ（Supabase `saves` テーブル）の両方をサポートする。
- セーブ本体はバージョン管理された単一のJSON構造 (`save_data` jsonb) とし、
  `save_schema_version` によってマイグレーションを行う。
- 使用中MODの一覧は `save_mods` テーブル（クラウド）／セーブJSON内 `mods` 配列（ローカル）に記録する。

## セーブJSON構造（実装済み、`packages/core/src/types/save.ts` の `SaveData` に対応）

```json
{
  "meta": {
    "gameVersion": "0.1.0",
    "saveSchemaVersion": "1.0",
    "slotName": "default",
    "savedAt": "2026-01-01T00:00:00.000Z"
  },
  "base": { "resources": { "ENERGY": 120, "CREDITS": 800 }, "facilities": [ /* FacilityState[] */ ] },
  "exploration": { "currentNodeId": "node_base", "discoveredNodeIds": [ "..." ], "exploredNodeIds": [ "..." ], "log": [ /* ... */ ] },
  "containment": { "records": [ /* ContainmentRecord[] */ ] },
  "mods": [
    { "modId": "cosmic-creatures", "modVersion": "1.2.0" },
    { "modId": "new-weapons", "modVersion": "2.0.1" }
  ]
}
```

キャラクター育成・アイテム・ストーリー進行は、対応するゲームシステムが実装された時点で
この構造に追加する（現在のプレイヤーキャラクターは戦闘開始時に `packages/data` から
都度生成される固定編成のため、まだ永続化対象がない）。

## MOD不足・バージョン不一致時のロード処理

`checkSaveModRequirements()`（`packages/core/src/systems/saveSystem.ts`）が
セーブの `mods` 配列と現在インストール済みのMOD一覧を比較し、以下を返す。

- `missing`: ローカルに全く存在しないMOD
- `versionMismatched`: 存在するがバージョンが異なるMOD

クライアント（`apps/client/src/save/useSave.ts` の `applySave()`）は、要件を満たさない場合、
ロードを実行せず警告メッセージを表示する。

```
このセーブには次のMODが必要です：cosmic-creatures@1.2.0, new-weapons@2.0.1（現在: 1.9.0）
```

「MODを取得」導線（ASTRAL WORKSHOPへの遷移）はMODシステム本体（Phase 10/11）の実装後に接続する。
デフォルトでは安全側に倒し、必須MODが揃うまでロードを許可しない。

## スキーマバージョンとマイグレーション

- 各MODは `manifest.json` に `schema_version` を持つ。
- セーブは `saveSchemaVersion` を持ち、`applySaveMigrations()` が
  `fromVersion -> toVersion` の変換関数（`SaveMigration[]`）を順に辿って
  現在のバージョンまで変換する。対応するマイグレーションが見つからない場合は
  そこで停止し、それまでに適用できた分だけを返す。

## オフライン/オンライン競合解決

- オフライン時はローカルセーブのみで進行できる（`localStorage`、`apps/client/src/save/localSaveStorage.ts`）。
- オンライン復帰時、`compareSaveRecency()` でローカルとクラウドの `meta.savedAt` を比較し、
  差異があれば「ローカルを使用」「クラウドを使用」をユーザーに選択させる（自動マージはしない）。

