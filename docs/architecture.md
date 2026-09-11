# ASTRAL ARCHIVE（仮）アーキテクチャ設計

## 全体方針

- **ゲーム本体・ゲームデータ・MOD・Supabase・セーブ** を明確に分離する。
- ゲームロジックは特定エンジンに依存しない `packages/core` に集約し、UI層（Vite+React）から呼び出す。
- MODも本体データも同じスキーマ・同じローダーを通す（`packages/data` = 優先度最低のMODと同等に扱う）。

## ディレクトリ構成

```
astral-archive/
├─ package.json              # npm workspaces ルート
├─ tsconfig.base.json
├─ packages/
│  ├─ core/                  # エンジン非依存のゲームロジック
│  │  └─ src/
│  │     ├─ types/           # Attribute / Character / Anomaly / Combat の型
│  │     ├─ systems/         # 属性計算・AP・BOOST・INSTABILITY・戦闘エンジン
│  │     ├─ data-loader/     # JSON検証(zod)・MODレジストリ・依存解決
│  │     └─ __tests__/
│  └─ data/                  # 本体ゲームデータ（JSON、MODと同一形式）
│     ├─ config/             # バランス設定(AP消費量など)
│     ├─ attributes/
│     ├─ characters/
│     └─ anomalies/
├─ apps/
│  └─ client/                # Vite + React UI（Phase以降で拡充）
├─ supabase/
│  └─ schema.sql              # テーブル + RLS
├─ mods/
│  └─ example-mod/            # サンプルMOD（データ駆動フォーマットの実例）
└─ docs/
   ├─ architecture.md（本書）
   ├─ mod-spec.md
   └─ save-spec.md
```

## レイヤー責務

| レイヤー | 責務 | 依存してよいもの |
|---|---|---|
| `packages/core` | 型定義・純粋関数のゲームロジック（戦闘計算、属性計算、MODレジストリ） | なし（zodのみ） |
| `packages/data` | 本体データ(JSON) | core が定義するスキーマ |
| `mods/*` | サードパーティ拡張データ(JSON/画像/音声) | core が定義するスキーマ |
| `apps/client` | 描画・入力・Supabase呼び出し | core, data |
| `supabase/` | 永続化・認証・MOD配布 | - |

## MODの安全性

MODは実行可能コードを一切含まない。`packages/core/src/data-loader` がすべてのMOD/本体データの
唯一の入口であり、`JSON.parse` + `zod` スキーマ検証のみを行う。`eval`, `Function`, 動的 `import()`
によるMODコードの実行は禁止し、コードレビュー・CIで検出する。

## 戦闘システム設計（Phase 2-4対応）

- 行動ポイント制（AP）: コストは `packages/data/config/combatConfig.json` に分離。
- **属性は「じゃんけん」にしない**: HEATがFROSTに強い、といった属性同士の固定相性表は持たせない。
  星異体・キャラクターなど個体ごとに6属性すべてへの耐性値（%）を持たせ、その値だけで
  攻撃属性の効き方を決定する（例: `{ "HEAT": -25, "FROST": 20, "VOLT": 0, "VOID": 50, "GRAVITY": -10, "LIGHT": 10 }`。
  正の値=軽減（耐性）、負の値=増加（弱点）、0=等倍）。同じHEAT属性の攻撃でも対象によって
  効き方がまったく異なる。武器・スキルは6属性のいずれかを持ち、キャラクターの攻撃属性を決定する。
- BOOST: 0〜MAX(4段階)。ゲージが貯まるほど攻撃力・属性ダメージ・クリティカル率が上昇し、MAXで
  OVERDRIVE(強力な追加行動)を解禁。
- INSTABILITY: BOOST使用等の未知エネルギー消費で上昇。閾値ごとに `stable / unstable / critical / breach`
  の4段階があり、段階が進むほど「攻撃属性の変質」「攻撃力低下」「行動失敗」が高確率で発生する
  （`resolveInstabilityEffect()`、乱数は外部注入可能でテストも決定的に行える）。100%で BREACH が
  発生し、`triggerBreach()` が場の星異体を暴走状態へ移行させ攻撃力・防御力を引き上げる
  （冪等設計、複数キャラが同時に条件を満たしても一度だけ適用）。

詳細な型は `packages/core/src/types/combat.ts`、耐性値の計算は
`packages/core/src/systems/attributeSystem.ts` を参照。

## 基地管理設計（Phase 5対応）

- 資源は `ResourceId`（文字列、MODで新資源を追加可能）で管理し、初期4種は
  `ENERGY` / `CREDITS` / `RESEARCH_POINTS` / `ALLOY`。
- 施設（COMMAND / RESEARCH / CONTAINMENT / MEDICAL / ARMORY / OBSERVATORY / CREW / ENERGY）は
  レベル制（初期実装は各3レベル）で、レベルごとにアップグレードコストと効果を持つ
  （`packages/data/facilities/base_facilities.json`）。
- `upgradeFacility()` はイミュータブルにBaseStateを更新し、資源不足・最大レベル到達・
  未知施設IDをそれぞれ判定して失敗理由を返す。効果は加算式で累積し、
  `getCumulativeFacilityEffects()` で現在の合計効果を取得できる。

詳細な型は `packages/core/src/types/base.ts`、ロジックは
`packages/core/src/systems/baseSystem.ts` を参照。

## 宇宙探索設計（Phase 6対応）

- 銀河マップはノード式グラフ（`GalaxyMapDefinition.nodes[]`、各ノードが`connections`で
  隣接ノードIDを持つ）で表現し、座標を使わないシンプルな隣接リスト構造にしている。
- `travelTo()` は現在ノードの `connections` に含まれるノードへのみ移動を許可する。
- 各ノードは `encounters[]`（資源/星異体/敵/NPC/遺跡/イベント/新惑星）を重み付きで持ち、
  `exploreCurrentNode()` が乱数（外部注入可能）で1つを確定する。探索済みノードの再探索は無効。
- 資源報酬はクライアント側で `useBase` の `gainResources()` を通じて基地の資源プールへ反映される
  （探索システム自体はBaseStateに直接依存せず、報酬オブジェクトを返すのみに留めている）。

詳細な型は `packages/core/src/types/exploration.ts`、ロジックは
`packages/core/src/systems/explorationSystem.ts` を参照。

## 星異体の収容・研究設計（Phase 7対応）

- 星異体の発見（戦闘での撃破・探索での遭遇）は `discoverAnomaly()` によって冪等に収容レコードへ
  登録される。複数の経路（戦闘/探索）から同時に呼ばれても二重登録されない。
- 収容の安定度（`integrity`）は星異体ごとの `containmentConditions`（例:
  `energyBelow`＝基地のエネルギーが一定値未満、`researchLevelAbove`＝研究段階が一定以上）を
  満たしているかどうかで増減する（`applyContainmentTick()`）。0に達すると自動的にBREACHへ移行する。
- 研究は `researchTrack` の閾値ポイントに到達するたびに段階が解禁され（`investResearch()`）、
  一度に複数段階を飛び越えて解禁されることもある。
- 収容・研究のコストは基地の資源プールから支払われる（`useBase.trySpendResources()`）ため、
  収容・研究・基地・探索の4システムはUI層（App.tsx）でのみ結合し、coreの各システム自体は
  互いに直接依存しない設計を維持している。

詳細な型は `packages/core/src/types/containment.ts`、ロジックは
`packages/core/src/systems/containmentSystem.ts` を参照。

## Supabase連携設計（Phase 8対応）

- `packages/supabase` を独立パッケージとして分離し、`packages/core`（ゲームロジック）は
  Supabaseに一切依存しない。UI層（`apps/client`）が両者を組み合わせて使う。
- 型定義（`types/database.ts`）は `supabase/schema.sql` と1対1で対応させ、スキーマ変更時は
  両方を同時に更新する運用とする。
- クライアントは環境変数（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`）が未設定の場合、
  Supabaseクライアントを生成せず`null`のまま扱う。これによりオフライン環境でも
  ゲーム本編（基地・探索・研究・戦闘）は問題なく動作する（Phase 9のクラウドセーブや
  Phase 10/11のMOD配布のみが無効化される）。
- 認証状態は `onAuthStateChange` の購読を通じてリアクティブに反映する
  （`apps/client/src/supabase/useSupabaseAuth.ts`）。

詳細は `packages/supabase/src/` 配下の各モジュール（`client.ts` / `auth.ts` / `profiles.ts` /
`gameConfigs.ts` / `connection.ts` / `storage.ts`）を参照。

## セーブ設計（Phase 9対応）

- セーブデータ（`SaveData`）は「ゲームバージョン・保存日時・基地状態・探索状況・
  収容/研究状況・使用中MOD一覧」を1つのJSONにまとめた単一構造。ローカル(`localStorage`)・
  クラウド(`saves.save_data` jsonb)のどちらも同じ形式をそのまま使う。
- MOD要件チェック（`checkSaveModRequirements()`）はセーブ内の`mods`とインストール済みMOD一覧を
  比較し、不足・バージョン不一致を検出する。MODシステムのランタイム組み込みはPhase10/11で
  行うため、現時点では常に`mods: []`だが、インストール済みMOD一覧を実データに差し替えるだけで
  そのまま機能する設計にしている。
- マイグレーション（`applySaveMigrations()`）は`fromVersion -> toVersion`の変換関数を並べた
  配列を辿ることで、将来のスキーマ変更に段階的に対応できるようにしている。
- オフライン時はローカルセーブのみで進行できる。オンライン復帰時は`compareSaveRecency()`で
  ローカル/クラウドの保存日時を比較し、両者が異なればUI上でユーザーに選択させる
  （自動マージはしない）。

詳細な型は `packages/core/src/types/save.ts`、ロジックは
`packages/core/src/systems/saveSystem.ts` を参照。

## MODシステムのランタイム統合設計（Phase 10対応）

- MODのロードは常に「ファイルパス判定 → スキーマ検証 → レジストリ登録」の3段階を経る
  （`packages/core/src/systems/modLoader.ts`）。任意のJavaScript/SQL/OSコマンドは一切実行しない。
- `DataRegistry<T>`（Phase1で実装）はIDごとに「どのソース（本体/MOD）がどのpriorityで登録したか」を
  記録し、同一IDへの複数登録があった場合は`conflicts`に記録した上でpriorityが高い方を採用する。
- クライアント（`apps/client/src/mods`）は、ブラウザで選択したMODフォルダのファイル群を
  `File.text()`で読み取り、そのままJSON文字列として`loadModEntities()`へ渡す。ファイルシステムや
  ネットワークへのMOD側からの直接アクセスは発生しない。
- MODの追加・削除ごとに`resolveModLoadOrder()`（Phase1で実装）を再実行し、依存関係・競合・
  循環依存を検証してから登録を確定する。

詳細は `packages/core/src/systems/modLoader.ts` と `apps/client/src/mods/` を参照。

## ASTRAL WORKSHOP設計（Phase 11対応）

- MOD一覧の検索・並び替えは`packages/core/src/systems/workshopSystem.ts`の
  `filterAndSortMods()`が担う。Supabaseの行データ（`ModRow`）はクライアント側で
  `WorkshopModSummary`（core側の中立な型）へ変換してから渡すことで、coreパッケージが
  Supabaseへ依存しない構成を維持している。
- インストールは「Storageから該当バージョンのファイルを再帰的に取得 → Phase10の
  `loadModEntities`で検証 → `useMods`（Phase10）と同じ`addMod()`へ渡す」という、
  ローカルフォルダアップロードと全く同じ検証パイプラインを通る。WORKSHOPは
  「ファイルの取得元がローカルかSupabase Storageか」の違いだけを吸収する薄い層になっている。
- ダウンロード数の集計は`mods.downloads`カラムを表示に使うが、この値はRLS上クライアントから
  直接更新できない（作者のみ更新可能）。ダウンロード操作自体は`mod_downloads`への記録を行い、
  実際の集計自動更新は将来的にDBトリガー等のサーバー側処理で行う設計とする。

詳細は `apps/client/src/workshop/` と `packages/supabase/src/mods.ts` を参照。

## テスト方針・最適化（Phase 12対応）

- コアのゲームロジックは可能な限り純粋関数として実装し、外部依存（乱数・現在時刻・Supabase等）
  は関数の引数として注入できるようにしている。これによりユニットテストで決定的な検証が可能になる
  （例: `resolveInstabilityEffect()`の乱数ロール、`createSaveData()`の`now`引数）。
- MOD関連のロジック（`resolveModLoadOrder`、`DataRegistry`、`loadJsonWithSchema`）は
  循環依存・競合・スキーマ不一致など「壊れたMODを安全に拒否できるか」を重点的にテストしている。
- クライアントのバンドルサイズ最適化は、ゲームロジックに影響しないビルド設定
  （Viteの`manualChunks`）と画面コンポーネントの`React.lazy`化のみで行い、
  ロジック変更によるリスクを避けている。
