/**
 * ストーリーイベントの種別。
 * 将来の拡張を見越して文字列型として扱う（MODによる新種別の追加を許容する）。
 * Phase13では dialogue / narration / notification / research_record / unlock / command を
 * 中心的に実装し、choice / battle_start / exploration_start / cinematic は
 * 拡張可能な形だけ用意する。
 */
export type StoryEventType =
  | "dialogue"
  | "narration"
  | "choice"
  | "notification"
  | "research_record"
  | "battle_start"
  | "exploration_start"
  | "unlock"
  | "command"
  | "cinematic"
  | string;

export interface StoryChoiceOption {
  id: string;
  /** 選択肢に表示するテキスト */
  text: string;
  /** 選択後に進むイベントID（省略時はnextEventIdを使う） */
  nextEventId?: string;
  /** 選択したときに立てるストーリーフラグ */
  setFlags?: Record<string, boolean | number | string>;
}

/**
 * ストーリーイベント定義。
 * すべてのイベント種別を1つの柔軟な構造で表現する：
 * - dialogue/narration/notification/cinematic: speaker(任意) + text
 * - choice: choices配列
 * - research_record: unlockRecordId
 * - unlock: unlockRecordId または setFlags
 * - battle_start/exploration_start: targetId（星異体IDやノードIDなど）
 * - command: commandId + payload（既知のコマンドのみ実行される。任意コード実行はしない）
 * 将来追加される未知の種別のためにpayloadを汎用の逃げ場として用意している。
 */
export interface StoryEventDefinition {
  id: string;
  chapter: number;
  type: StoryEventType;
  /** UI表示用の話者名。dialogue以外では省略可。 */
  speaker?: string;
  title?: string;
  text?: string;
  choices?: StoryChoiceOption[];
  /** 次に進むイベントID。undefinedならこの流れの終端（チャプター完了トリガー等は別途判定）。 */
  nextEventId?: string;
  unlockRecordId?: string;
  targetId?: string;
  commandId?: string;
  setFlags?: Record<string, boolean | number | string>;
  /** 未知の将来拡張用の汎用ペイロード（MODでの独自データにも使える） */
  payload?: Record<string, unknown>;
  source: "base" | "mod";
}

export interface StoryChapterDefinition {
  /** チャプター番号（1始まり） */
  id: number;
  title: string;
  description: string;
  /** このチャプターを開始したときに最初に表示されるイベントID */
  firstEventId: string;
  source: "base" | "mod";
}

export interface ResearchRecordDefinition {
  id: string;
  title: string;
  content: string;
  category?: string;
  source: "base" | "mod";
}

/**
 * ストーリー進行フラグ。
 * 章のロック状態（例: "chapter02_locked": false で解禁）や、
 * 分岐選択の記録など、汎用的な進行状態をここに保持する。
 */
export type StoryFlags = Record<string, boolean | number | string>;

export interface StoryState {
  /** 現在到達しているチャプター番号（0=未開始） */
  currentChapter: number;
  /** 現在表示中のイベントID（イベント進行中でなければnull） */
  currentEventId: string | null;
  /** UI表示用の現在シーン識別子（セーブ再開時の表示補助、必須ではない） */
  currentScene: string | null;
  /** 完了済みイベントID一覧 */
  completedEvents: string[];
  /** 解禁済みResearch Record ID一覧 */
  unlockedRecords: string[];
  storyFlags: StoryFlags;
  /** ストーリー経由で発見した星異体ID一覧（収容システムのcontainmentとは別に、ストーリー上の既知リストとして保持） */
  discoveredAnomalies: string[];
  /** このセーブが前提とするストーリーデータのバージョン。MOD/本体データの更新でセーブが壊れないための互換性チェックに使う。 */
  requiredStoryVersion: string;
}

/** ストーリーデータ全体（本体＋MODを統合した後の実行時データ集合） */
export interface StoryDataBundle {
  chapters: StoryChapterDefinition[];
  events: StoryEventDefinition[];
  records: ResearchRecordDefinition[];
}
