# ASTRAL ARCHIVE (working title)

完全オリジナルの宇宙SF × 基地運営 × 探索 × ターン制戦略バトル × MOD対応ゲーム。
タイトルは仮称であり、`package.json` の `name` やUI文言を変更すれば差し替え可能。

## Phase 1: ゲーム基盤（完了）

実装済み:

- npm workspacesによるモノレポ構成（`packages/core` / `packages/data` / `apps/client`）
- 属性・キャラクター・星異体・戦闘の型定義（`packages/core/src/types`）
- 行動ポイント / 属性ダメージ / BOOST / INSTABILITY / 戦闘進行の各システム
- MOD・本体データ共通のzodスキーマ検証とMOD依存解決アルゴリズム
- Supabaseスキーマ設計（`supabase/schema.sql`、RLS込み）
- MOD仕様書・セーブ仕様書（`docs/`）
- Vite+React製の動作確認用デモ画面（`apps/client`）

## Phase 2: ターン制戦闘（完了）

実装済み:

- 4人パーティ vs 星異体（複数体）の戦闘UI（`apps/client/src/combat`）
- 行動選択フロー：キャラ選択 → 行動選択（通常攻撃/防御/スキル/特殊技/アイテム/待機）→ 対象選択 → 解決
- HP/AP/BOOST/INSTABILITYをリアルタイム表示するパーティ・星異体パネル
- プレイヤーフェーズ → 星異体フェーズ（簡易AI：生存中のランダムな味方を攻撃）→ 次ターンのフロー
- 防御中はダメージ軽減、アイテムでHP回復（上限クランプ）
- コア側に `resolveEnemyPhase` / `isPlayerPhaseExhausted` / `getAliveCombatants` などを追加し、テストを3件→6件に拡充
- オリジナルのHUD/観測端末風UIデザイン（コーナーブラケット装飾、シグナルカラー体系）

## Phase 3: 属性システムの武器/スキル紐付け・耐性UI（完了・設計修正済み）

実装済み:

- 武器・防具・スキルの型定義（`packages/core/src/types/equipment.ts`）とzod検証スキーマ
- **属性は「じゃんけん」にしない設計に修正**：属性同士の固定相性テーブルを撤廃し、
  星異体・キャラクターが個別に持つ6属性への耐性値（%、正=軽減/耐性、負=増加/弱点）だけで
  ダメージ倍率を決定するように変更（`packages/core/src/systems/attributeSystem.ts`）
- キャラクターの攻撃属性は装備武器から決定、スキル使用時はスキル側の属性・威力倍率で上書き可能
- `packages/data/weapons`, `packages/data/skills` を新規作成し、既存キャラ/星異体データの
  affinityを倍率表記から耐性%表記へ変換
- クライアントUIに属性バッジ・耐性一覧（6属性それぞれの%値、色分け表示）を追加
- ActionBarをキャラクターごとの実スキル名表示に対応（BOOST不足時はロック表示）
- コアのテストを9件に拡充し、**全件パス**

## Phase 4: BOOST/INSTABILITY演出・BREACH戦闘への遷移（完了）

実装済み:

- INSTABILITYの段階（安定/不安定/危険/BREACH）ごとに実際の効果が発生するよう実装
  （`packages/core/src/systems/instabilitySystem.ts`）：
  - 攻撃属性がランダムに変質する（スキル変質）
  - 攻撃力が低下する（ステータス変化）
  - 一定確率で行動そのものが失敗する（行動制限）
  - すべて乱数を外部注入可能にし（`getInstabilityRoll`）、決定的なユニットテストを実現
- INSTABILITYが100%に到達すると **BREACH** が発生し、`triggerBreach()` が場の星異体を
  「暴走状態」へ移行させ攻撃力・防御力を強化する（冪等設計：複数キャラが同時に条件を満たしても
  多重適用されない）
- クライアントUIにBOOSTゲージ（4段階セグメント表示）とINSTABILITYゲージ（段階に応じた色分け・
  ラベル表示）を追加（`StatusGauges.tsx`）
- BREACH発生時は戦闘画面に警告バナーを表示し、星異体パネルに脈動する赤い警告演出
  （`aa-panel--breach` / `aa-breach-banner`）を適用
- コアのテストを13件に拡充し、**全件パス**

## Phase 5: 基地管理画面・施設アップグレード（完了）

実装済み:

- 資源システム（ENERGY / CREDITS / RESEARCH_POINTS / ALLOY）と施設アップグレードのコアロジック
  （`packages/core/src/systems/baseSystem.ts`）：資源不足・最大レベル・未知施設IDを判定しつつ、
  イミュータブルにBaseStateを更新
- 8つの基地施設（COMMAND / RESEARCH / CONTAINMENT / MEDICAL / ARMORY / OBSERVATORY / CREW / ENERGY）
  を完全オリジナルの説明文とともにデータ化（各3レベル、`packages/data/facilities/base_facilities.json`）
- 施設ごとの累積効果計算（`getCumulativeFacilityEffects`）、コスト充足判定（`canAffordCost`）
- クライアントに基地管理画面（`apps/client/src/base`）を新設：資源バー、施設カード（現在の効果・
  次レベルのコストプレビュー・建造/アップグレードボタン、資源不足時の視覚的警告）
- アプリ全体に「基地」「戦闘」を切り替えるタブナビゲーションを追加（`App.tsx`）
- コアのテストを21件に拡充し、**全件パス**

## Phase 6: 銀河探索マップ（完了）

実装済み:

- ノード式の銀河探索システム（`packages/core/src/systems/explorationSystem.ts`）：
  - `travelTo()`：接続関係のあるノードへのみ移動可能（未接続への移動はエラー）
  - `exploreCurrentNode()`：ノードごとに設定された発見内容（資源/星異体/敵/NPC/遺跡/イベント/新惑星）
    を重み付き抽選で確定。乱数は外部注入可能（`chooseWeightedEncounter`）でテストも決定的に実施
  - 探索済みノードは再探索しても何も起きない、発見済みノードの可視化管理など
- 「基地 → 惑星 → 小惑星帯 → 宇宙ステーション → 未知領域 → 巨大天体 → 最終領域」の階層構造を持つ
  完全オリジナルの銀河マップデータ（`packages/data/exploration/galaxy_map.json`、8ノード）
- 探索での資源発見が実際に基地の資源プールへ反映されるよう、`useBase`をApp全体で共有する構成に変更
  （`addResources`ヘルパーをcoreに追加）
- クライアントに探索画面（`apps/client/src/exploration`）を新設：階層ごとのノードカード表示、
  現在地・探索済み・移動可否の視覚的区別、探索ログ
- アプリのタブナビゲーションに「探索」を追加（基地／探索／戦闘の3画面構成）
- コアのテストを31件に拡充し、**全件パス**

## Phase 7: 星異体の収容・研究（完了）

実装済み:

- 星異体の収容・研究システム（`packages/core/src/systems/containmentSystem.ts`）：
  - `discoverAnomaly()`：戦闘での撃破・探索での発見を発端に、収容レコードを冪等に登録
  - `investResearch()`：研究ポイントを投入し、`researchTrack`の閾値到達に応じて研究段階を解禁
    （一度に複数段階を解禁可能、既存段階の再解禁は行わない）
  - `evaluateAllContainmentConditions()` / `applyContainmentTick()`：星異体ごとの管理条件
    （`energyBelow` / `researchLevelAbove` など）を判定し、満たしていれば安定度が回復、
    満たしていなければ低下。0に達すると自動的にBREACH（`status: "breached"`）へ移行
  - `stabilizeContainment()`：プレイヤーの能動的な資源投入による安定度の直接回復
    （BREACH済みレコードには効果なし＝基地復旧などの別手段が必要という設計）
- 戦闘での星異体撃破・探索での星異体発見の両方から自動的に収容システムへ登録されるよう、
  `useCombat`（`onEnemyDefeated`）・`useExploration`（`onAnomalyDiscovered`）にコールバックを追加
- `useBase`に`trySpendResources()`を追加し、研究投入・安定化のコストが実際に基地資源から
  消費されるように連携（`useBase`・`useContainment`をApp全体で共有する構成に統一）
- クライアントに研究画面（`apps/client/src/containment`）を新設：収容安定度・研究進捗を
  可視化するカード、研究データ投入・収容安定化ボタン、管理サイクル進行ボタン
- アプリのタブナビゲーションに「研究」を追加（基地／探索／研究／戦闘の4画面構成）
- コアのテストを44件に拡充し、**全件パス**

## Phase 8: Supabase（完了）

実装済み:

- Supabase連携専用パッケージ`packages/supabase`を新設し、「本体」「MOD」「Supabase」を明確に分離
  （Auth / Database / Storageのラッパー関数を提供、`@supabase/supabase-js`ベース）
  - `supabase/schema.sql`の9テーブルと1対1対応する型定義（`types/database.ts`）
  - **重要な技術的知見**：TypeScriptの`interface`宣言はSupabase-jsが要求する`GenericTable`制約
    （`Record<string, unknown>`との構造的互換性）を満たせず型が`never`に潰れる問題があったため、
    Row/Insert/Update型はすべて`type`エイリアスとして定義している
  - Authラッパー（サインアップ/サインイン/サインアウト/セッション監視）
  - profilesテーブルのCRUD、game_configs読み取り、Storageアップロード/署名URL/一覧取得ヘルパー
  - 軽量クエリによる接続確認ヘルパー（`checkSupabaseConnection`）
- クライアントに未設定時でも安全に動作するSupabase接続層を追加（`apps/client/src/supabase`）：
  - `.env.local`が無い・値が空でもクラッシュせず「未設定」として扱い、オフラインプレイを継続可能
  - アカウント画面（サインアップ/サインイン/サインアウト、プロフィール表示名の保存、接続確認UI）
- アプリのタブナビゲーションに「アカウント」を追加（基地／探索／研究／戦闘／アカウントの5画面構成）

**接続確認について**：この開発環境はネットワークがnpm関連ドメインに限定されており、
実際のSupabaseプロジェクト（`*.supabase.co`）への到達性は確認できない。今回検証できたのは
「Supabase未設定時にアプリがクラッシュせず正しくオフライン動作すること」までであり、
実際のクラウド接続確認は利用者自身のSupabaseプロジェクトを用意し、
`apps/client/.env.local`（`.env.example`参照）に認証情報を設定した上で行う必要がある。

## Phase 9: クラウドセーブ（完了）

実装済み:

- セーブデータの型・システム（`packages/core/src/systems/saveSystem.ts`）：
  - `createSaveData()`：ゲームバージョン・保存日時・基地状態・探索状況・収容/研究状況・MOD一覧を
    まとめたセーブを構築
  - `serializeSaveData()` / `deserializeSaveData()`：JSON往復変換（不正なJSONも安全に検出）
  - `checkSaveModRequirements()`：セーブが要求するMODと現在インストール済みMODを比較し、
    不足・バージョン不一致を検出（ロード前の警告表示に使用）
  - `applySaveMigrations()`：スキーマバージョンを辿って登録済みマイグレーションを順次適用する
    仕組み（複数段階の連続適用、対応マイグレーション不在時の安全な停止を実装）
  - `compareSaveRecency()`：ローカル/クラウドの保存日時比較（競合解決に使用）
  - `SaveDataSchema`ほかのzodスキーマにより、外部から読み込むセーブデータを必ず検証
- `packages/supabase`に`saves`/`save_mods`テーブルのCRUD（`saves.ts`）を追加
- クライアントにローカルセーブ（`localStorage`）とクラウドセーブ（Supabase）の両方に対応した
  セーブ画面を新設。オフライン時はローカルのみで問題なく機能し、オンライン復帰時は
  「ローカル/クラウドを比較」で競合を検出し、「ローカルを使用」「クラウドを使用」を選択できる
- `useBase` / `useExploration` / `useContainment`に状態読み込み用の関数を追加し、
  すべてApp全体で共有する構成に統一（セーブロード時に各システムの状態を復元できるようにした）
- アプリのタブナビゲーションに「セーブ」を追加（基地／探索／研究／戦闘／アカウント／セーブの
  6画面構成）

## Phase 10: MODシステム（完了）

実装済み:

- MOD読み込み・レジストリ統合ロジック（`packages/core/src/systems/modLoader.ts`）：
  - `categorizeEntityFile()`：ファイルパス規約からエンティティ種別（キャラ/星異体/武器/スキル/施設）を判定
  - `loadModEntities()`：MODが提供するファイル群を種別ごとにスキーマ検証しながら読み込み、
    1ファイルの検証失敗が他のファイルに影響しないようにエラーを個別記録
  - `buildEntityRegistrySet()` / `populateRegistry()`：本体データ(priority=0)と複数MODのエンティティを
    `DataRegistry`（Phase1で実装済み）へ統合し、優先度に応じた上書きを行う
  - **重要な技術的知見**：`loadJsonWithSchema`の型パラメータ推論で、zodの`.default()`を使った
    フィールドがオプショナルとして誤推論される問題があり、`z.ZodType<T, z.ZodTypeDef, unknown>`
    と明示することで解決した
- クライアントにMODマネージャー画面（`apps/client/src/mods`）を新設：
  - ブラウザのフォルダ選択（`webkitdirectory`）でMODフォルダ（`manifest.json` + `entities/`）を
    アップロードし、JSONファイルのみを読み込む（実行可能コードは一切評価しない）
  - 同梱のサンプルMOD（`mods/example-mod`）をワンクリックで読み込むデモボタン（Viteの`?raw`
    インポートで実際のファイル内容を読み込むのと同じ経路を通す）
  - 読み込み済みMODの一覧・エンティティ件数・エラー表示、無効化（削除）
  - 依存関係・競合・循環依存の検証（Phase1の`resolveModLoadOrder`を実際に呼び出して使用）
  - 統合後の本体+MODデータ件数と、IDが競合した場合の上書き結果を表示
- コアのテストを66件に拡充し、**全件パス**

**スコープについて**：戦闘・基地・研究などの既存ゲームプレイ画面は、現時点ではまだ
`packages/data`の本体データを直接参照している（Phase1-9で構築したまま）。MODマネージャーで
統合されたレジストリを実際のゲームプレイ側（キャラクター選択・星異体データなど）に接続する
配線は、MODブラウザUIを実装するPhase 11、またはキャラクター編成システムを扱う将来のフェーズで
本格的に行う想定。今回はMODの検証・読み込み・優先度統合という中核機構を確実に動作させることを
優先した。

## Phase 11: ASTRAL WORKSHOP（完了）

実装済み:

- ゲーム内MODブラウザ向けの検索・並び替えロジック（`packages/core/src/systems/workshopSystem.ts`）：
  `filterAndSortMods()`が名前/説明文の部分一致検索、新着順/人気順/名前順の並び替えに対応
- `packages/supabase`に`mods.ts`（公開MOD一覧・詳細（バージョン履歴/依存関係付き）・ダウンロード
  記録）、`storage.ts`に`listFilesRecursive()`（MODのサブフォルダ構成を再帰的に列挙）を追加
- クライアントにASTRAL WORKSHOP画面（`apps/client/src/workshop`）を新設：
  - 検索バー・新着順/人気順/名前順の切り替え
  - MOD詳細パネル（作者名・最新バージョン・依存MOD・更新履歴・ダウンロード数）
  - 「インストール」ボタンでStorageから該当バージョンのファイル一式を取得し、Phase10で構築した
    検証パイプライン（`loadModEntities`→スキーマ検証→`DataRegistry`統合）にそのまま接続
  - インストール時にダウンロード記録（`mod_downloads`）を追加
- Phase10のMODマネージャーに有効化/無効化トグルを追加（アンインストールとは別に、
  レジストリ統合対象から一時的に外せるように変更）
- アプリのタブナビゲーションに「WORKSHOP」を追加（8画面構成）
- コアのテストを73件に拡充し、**全件パス**

**既知の制約**：`mods.downloads`集計値はRLS上クライアントから直接更新できない
（更新権限は作者のみ）。ダウンロード操作は`mod_downloads`への記録は行うが、
表示される集計値の自動更新にはDBトリガーやEdge Functionなどサーバー側の仕組みが別途必要になる
（今回はその設計指針をコード内コメントで明記するに留めている）。また、実際のSupabaseプロジェクトへの
接続確認はPhase8と同様の理由（サンドボックスのネットワーク制限）により実施できていない。

## Phase 12: テスト・最適化（完了）

実装済み:

- **テストカバレッジの拡充**：これまで間接的にしか検証されていなかったモジュールに専用の
  ユニットテストを追加した。特に`resolveModLoadOrder()`（MOD依存解決）は12件のテストで
  循環依存・自己参照・競合・バージョン不一致・優先度順序を網羅的に検証するようになった。
  - `actionPointSystem.test.ts`（9件）：AP消費・スキルコスト上書き・残量判定
  - `boostSystem.test.ts`（9件）：BOOSTゲージ加算・複数レベル同時上昇・MAX頭打ち・OVERDRIVE
  - `instabilitySystem.test.ts`（14件）：段階境界値・行動制限/属性変質の乱数分岐・BREACH閾値
  - `attributeSystem.test.ts`（9件）：耐性値↔倍率変換のクランプ・クリティカル・弱点判定
  - `loader.test.ts`（10件）：`DataRegistry`の優先度上書き・競合記録、`loadJsonWithSchema`の
    JSON構文エラー・スキーマ不一致の安全な処理
  - `modResolver.test.ts`（12件）：循環依存・自己参照・競合・依存バージョン不一致・
    priority順序の安定ソート
  - コアのテストは**73件→138件**に拡充し、**全件パス**
- **ビルド最適化**：
  - Viteのチャンク分割設定（`vendor-react` / `vendor-supabase`）を追加し、Supabase関連の
    重いライブラリを「アカウント/セーブ/WORKSHOP」タブでのみ読み込まれる別チャンクに分離
  - App.tsxの全画面を`React.lazy`+`Suspense`で遅延読み込み化
  - 結果、単一515.66kBチャンク（サイズ警告あり）から、初期表示に必要なJSを約236kB
    （`vendor-react` 140.87kB + `index` 91.54kB + 初期タブの画面コード数kB）まで削減。
    `vendor-supabase`（227.01kB）は該当タブを開くまで読み込まれないため、
    初回表示時間が大きく改善される。ビルド時のチャンクサイズ警告も解消
- 最適化はビルド設定と画面の遅延読み込みのみに限定し、ゲームロジック自体は変更していないため、
  既存の全テスト・型チェックが問題なく通ることを確認済み

## デプロイ（GitHub + Render）

このリポジトリはRenderの **Web Service** としてそのままデプロイできる構成になっている
（`render.yaml`を使ったBlueprintデプロイ）。

1. このリポジトリをGitHubへpushする。
2. [Render Dashboard](https://dashboard.render.com/) →「New」→「Blueprint」→ 該当リポジトリを接続する。
3. `render.yaml`が自動検出されるので、そのまま「Deploy Blueprint」を押すだけでよい
   （追加設定は不要）。

ビルド（`npm install && npm run build`）でモノレポ内の`packages/core` → `packages/supabase` →
`apps/client`の順にビルドされ、`apps/client/server.js`（外部依存のない軽量Node.js静的サーバー）が
`apps/client/dist`を配信する。

Supabase連携（アカウント・クラウドセーブ・ASTRAL WORKSHOP）を使いたい場合は、デプロイ後に
Renderダッシュボードの「Environment」タブから`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`を
追加し、「Manual Deploy」で再ビルドする（`VITE_*`はビルド時に静的ファイルへ埋め込まれるため、
追加後は再ビルドが必要）。未設定でもビルド・デプロイは成功し、ゲーム本編はオフラインで
問題なく動作する。

## Phase 13: ストーリーシステム + 第1話「着任」（完了）

実装済み:

- **ストーリーシステムの基礎**（`packages/core/src/systems/storySystem.ts`）：`StoryManager`として
  純粋関数群を集約。チャプター開始・イベント進行・選択肢分岐・Research Record解禁・
  ストーリーフラグ・チャプターロック判定・条件評価（`evaluateStoryCondition`、Phase14以降の
  分岐に使える汎用インターフェース）をすべて実装
- **データ駆動設計**：`packages/data/story/{chapters,events,records}/`にJSON形式で格納。
  イベント種別（dialogue/narration/choice/notification/research_record/battle_start/
  exploration_start/unlock/command/cinematic）に対応する柔軟な`StoryEventDefinition`型
- **第1話「着任」**：21イベントの完全なストーリー（着任→ATRS社説明→星異体説明→星異粒子説明→
  基地施設案内→チュートリアル星異体発見→初期任務→Research Record解禁→星異粒子付与→
  Chapter1 COMPLETE）。実データによるエンドツーエンドの進行シミュレーションで、
  全21イベントの到達・記録解禁・星異体発見・資源付与・Chapter2解禁までを確認済み
- **チュートリアル星異体「AA-000 微睡みの残響」**を完全オリジナルで新規追加
- **セーブ統合**：`SaveData.story`は**optional**にすることで、Phase12以前の古いセーブが
  ロード時にクラッシュしないことを保証（後方互換性テストあり）
- **MOD拡張基盤**：`entities/events/`, `entities/records/`, `entities/chapters/`からMODで
  ストーリーを追加できる設計（チャプターはID(数値)のため専用マージ関数で統合）
- 任意コード実行なし：commandイベントは既知のcommandId（`discover_anomaly`, `give_resources`）
  のみ実行し、未知のcommandIdは警告ログを出して安全にスキップ
- エラー処理：存在しないイベントID・チャプターID・空の話者/本文でもクラッシュせず、
  安全なフォールバック値を返す設計を徹底
- コアのテストを**173件**に拡充（Phase13で32件追加）し、**全件パス**。Phase1〜12の既存回帰も
  すべて確認済み

## 星異体カタログの刷新（AA-001〜AA-030）

旧設定のAA-001「空腹の恒星」・AA-014「逆さの月」を削除し、新デザインのAA-001〜AA-030
（30体）へ全面差し替えた。天体・生物・情報記憶・戦闘特化・ボスクラスまで幅広いテーマの
星異体を`packages/data/anomalies/base_anomalies.json`に収録している。

- Phase13のチュートリアル星異体「AA-000 微睡みの残響」はこのカタログとは別枠として維持
  （ストーリーの`discover_anomaly`コマンドが参照しているため）
- 各星異体は既存のスキーマ（`AnomalyDefinition`）にすべて準拠。ダメージ計算・収容・研究の
  既存ロジックはそのまま機能する
- 「昼夜サイクル」「視認判定によるBREACH」「十二重環の職員コピー」など、個体固有の複雑な
  ギミックは`abilityIds`のラベルと`description`/`breachConditions.description`に反映済みだが、
  実際のゲームロジックとしての実装は未着手（将来フェーズの対象）。現時点で数値的に機能するのは
  HP/攻撃/防御/速度/精神・属性耐性・収容条件（`energyBelow`/`researchLevelAbove`）・
  BREACH閾値・研究段階・星異粒子生成量のみ
- 武器・防具データ（`base_weapons.json`）は今回のスコープ外（星異体データのみを差し替え）
- 全31体（AA-000含む）をzodスキーマで検証済み。Phase13ストーリーとの整合性（AA-000参照）も
  実データで再確認済み

## セットアップ

```bash
npm install
npm run typecheck   # 全workspace型チェック
npm run build       # 全workspaceビルド
npm run test        # coreのユニットテスト
npm run dev:client  # デモUIを起動 (http://localhost:5173)
```

## 検証済み結果（Phase 12完了時点・全12フェーズ完了）

- `packages/core`: 型チェックOK / ビルドOK / テスト138件全パス
- `packages/supabase`: 型チェックOK / ビルドOK
- `apps/client`: 型チェックOK / ビルドOK / 開発サーバー起動確認OK / チャンク分割によるバンドル最適化済み

## 今後の開発について

全12フェーズの実装が完了した。今後の発展の方向性として以下が考えられる：

- MODマネージャー/WORKSHOPで統合したレジストリを実際のゲームプレイ（キャラクター編成・
  星異体エンカウント）に接続するキャラクター編成システムの実装
- ストーリー進行・イベントシステムの追加
- 実際のSupabaseプロジェクトを用意し、Authentication/Storageバケット/RLSの動作確認
- アートワーク（キャラクター・星異体のイラスト、UIテクスチャ、BGM/SE）の追加
- E2Eテスト（Playwright等）の導入
- Phase 4: BOOST/INSTABILITY演出・BREACH戦闘への遷移
- Phase 5: 基地管理画面・施設アップグレード
- Phase 6: 銀河探索マップ
- Phase 7: 星異体の収容・研究UI
- Phase 8: Supabase接続実装（Auth/DB/Storage）
- Phase 9: クラウドセーブ・マイグレーション
- Phase 10: MODシステムのランタイム組み込み
- Phase 11: ASTRAL WORKSHOP（MODブラウザ）UI
- Phase 12: テスト・最適化

## ディレクトリ構成

詳細は `docs/architecture.md` を参照。

## 無料クラウドセーブ（Firebase Spark）

旧Supabaseのプロジェクトが非アクティブで停止する問題に備え、Firebase Authentication + Cloud Firestore (Standard) のクラウドセーブに対応しています。
Firebase設定値を `apps/client/.env.local` またはホスティングのビルド環境に登録し、`firestore.rules` をデプロイすると有効になります。
未設定なら従来のSupabaseアカウント／セーブにフォールバックします。既存のSupabaseユーザーIDやセーブデータは自動でFirebaseに移されません。

**重要:** Firebase無料枠も無期限・無制限を保証するサービスではありません。将来の規約変更・容量上限・アカウント停止等に備え、ローカルのデータを保管してください。詳細は [Firebase設定と移行手順](docs/firebase-setup.md) を参照してください。
