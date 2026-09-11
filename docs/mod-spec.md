# MOD仕様

## ディレクトリ構造

```
mod/
├─ manifest.json
├─ entities/
│  ├─ characters/*.json
│  ├─ enemies/*.json
│  ├─ weapons/*.json
│  ├─ skills/*.json
│  ├─ items/*.json
│  └─ facilities/*.json
├─ missions/*.json
├─ textures/*.png
└─ sounds/*.ogg
```

## manifest.json

```json
{
  "id": "cosmic-creatures",
  "name": "Cosmic Creatures",
  "author": "example_author",
  "version": "1.2.0",
  "game_version": ">=0.1.0",
  "description": "追加の星異体を収録するMOD",
  "dependencies": [{ "id": "astral-facilities", "version": "1.1.0" }],
  "conflicts": ["legacy-creatures-pack"],
  "priority": 100,
  "schema_version": "1.0"
}
```

## セキュリティ原則

1. MODは **データ（JSON / 画像 / 音声）のみ**。任意JavaScript・SQL・OSコマンド・ファイルシステム
   操作・ネットワークアクセスは一切許可しない。
2. すべてのJSONは `packages/core/src/data-loader/schemas.ts` のzodスキーマで検証し、不合格な
   MODはロードを拒否してユーザーに理由を表示する。
3. 画像・音声はサイズ上限・拡張子ホワイトリストを設け、実行属性を付与しない。

## ロード順・依存解決

- `priority` が高いMODほど後勝ち（同IDのエンティティを上書き）。
- `dependencies` を満たさない場合はロード不可としてエラー表示。
- `conflicts` に列挙されたMOD同士が同時有効な場合はロード不可としてエラー表示。
- 循環依存はロード前に検出し、該当MOD群を無効化してユーザーに通知する。

具体的なアルゴリズムは `packages/core/src/data-loader/modResolver.ts` の
`resolveModLoadOrder()` を参照。

## 属性・耐性値について（MOD作者向け）

ASTRAL ARCHIVEの属性システムは「HEATはFROSTに強い」といった属性同士の固定相性（じゃんけん）
を持ちません。星異体・キャラクターは6属性それぞれについて個別の耐性値（%）を持ち、
その値だけで攻撃属性の効き方が決まります。

```json
{
  "affinity": {
    "HEAT": -25,
    "FROST": 20,
    "VOLT": 0,
    "VOID": 50,
    "GRAVITY": -10,
    "LIGHT": 10
  }
}
```

正の値は軽減（耐性）、負の値は増加（弱点）、0は等倍です。MODで星異体やキャラクターを
追加する際は、属性同士の相性を気にせず、個体ごとに意図した耐性値を直接設定してください。

## エンティティ拡張ポイント（現時点で対応予定）

| カテゴリ | 本体データ置き場 | MOD置き場 |
|---|---|---|
| キャラクター | `packages/data/characters` | `mods/*/entities/characters` |
| 星異体(敵) | `packages/data/anomalies` | `mods/*/entities/enemies` |
| 属性 | `packages/data/attributes` | `mods/*/entities/attributes`（属性の追加自体はMOD対応、既存属性の耐性値は各キャラ/星異体データ側で設定） |
| 武器・スキル | `packages/data/weapons`, `packages/data/skills` | `mods/*/entities/weapons`, `mods/*/entities/skills` |
| 武器・防具・スキル・アイテム・施設 | `packages/data/*` | `mods/*/entities/*`（Phase 5以降で追加） |

## MOD入りセーブとの関係

セーブには使用中MODの `id@version` 一覧を記録する（詳細は `save-spec.md`）。ロード時に
必要MODが存在しない、またはバージョンが異なる場合は警告ダイアログを表示し、
「MODを取得」「ロードを中止」を選択させる。
