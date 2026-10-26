import type {
  ResearchRecordDefinition,
  StoryChapterDefinition,
  StoryDataBundle,
  StoryEventDefinition,
  StoryState,
} from "../types/story.js";

export const CURRENT_STORY_VERSION = "1.0";

/** 新規ゲーム開始時の初期ストーリー状態 */
export function createInitialStoryState(): StoryState {
  return {
    currentChapter: 0,
    currentEventId: null,
    currentScene: null,
    completedEvents: [],
    unlockedRecords: [],
    storyFlags: {},
    discoveredAnomalies: [],
    requiredStoryVersion: CURRENT_STORY_VERSION,
  };
}

/**
 * ストーリーデータの検索は必ずこの安全なヘルパー経由で行う。
 * データが存在しない・IDが不正な場合も例外を投げず undefined を返す
 * （呼び出し側でフォールバック表示を行うことを想定）。
 */
export function findChapter(storyData: StoryDataBundle, chapterId: number): StoryChapterDefinition | undefined {
  return storyData.chapters.find((c) => c.id === chapterId);
}

export function findEvent(storyData: StoryDataBundle, eventId: string): StoryEventDefinition | undefined {
  return storyData.events.find((e) => e.id === eventId);
}

export function findRecord(storyData: StoryDataBundle, recordId: string): ResearchRecordDefinition | undefined {
  return storyData.records.find((r) => r.id === recordId);
}

/** UI表示用に、話者名が無い/不正な場合の安全なフォールバック文字列を返す */
export function getSafeSpeakerName(event: StoryEventDefinition | undefined): string {
  if (!event) return "???";
  if (typeof event.speaker === "string" && event.speaker.trim() !== "") return event.speaker;
  return "";
}

/** UI表示用に、本文が無い/不正な場合の安全なフォールバック文字列を返す */
export function getSafeEventText(event: StoryEventDefinition | undefined): string {
  if (!event) return "（このイベントは読み込めませんでした）";
  if (typeof event.text === "string" && event.text.trim() !== "") return event.text;
  return "";
}

export type StoryActionResult =
  | { ok: true; state: StoryState; event: StoryEventDefinition | null }
  | { ok: false; state: StoryState; error: string };

/**
 * 指定したチャプターを開始する。
 * チャプターまたは最初のイベントが見つからない場合は state を変更せずエラーを返す
 * （壊れたストーリーデータでゲームをクラッシュさせないため）。
 */
export function beginChapter(state: StoryState, storyData: StoryDataBundle, chapterId: number): StoryActionResult {
  const chapter = findChapter(storyData, chapterId);
  if (!chapter) {
    return { ok: false, state, error: `チャプター${chapterId}のデータが見つかりません。` };
  }

  const firstEvent = findEvent(storyData, chapter.firstEventId);
  if (!firstEvent) {
    return { ok: false, state, error: `チャプター${chapterId}の開始イベント「${chapter.firstEventId}」が見つかりません。` };
  }

  const nextState: StoryState = {
    ...state,
    currentChapter: chapterId,
    currentEventId: firstEvent.id,
    currentScene: firstEvent.id,
  };

  return { ok: true, state: nextState, event: firstEvent };
}

/** イベントIDを既読（完了済み）として記録する（冪等） */
export function completeEvent(state: StoryState, eventId: string): StoryState {
  if (state.completedEvents.includes(eventId)) return state;
  return { ...state, completedEvents: [...state.completedEvents, eventId] };
}

export function isEventCompleted(state: StoryState, eventId: string): boolean {
  return state.completedEvents.includes(eventId);
}

/** Research Recordを解禁する（冪等） */
export function unlockRecord(state: StoryState, recordId: string): StoryState {
  if (state.unlockedRecords.includes(recordId)) return state;
  return { ...state, unlockedRecords: [...state.unlockedRecords, recordId] };
}

export function hasUnlockedRecord(state: StoryState, recordId: string): boolean {
  return state.unlockedRecords.includes(recordId);
}

/** ストーリーフラグを設定する（不変更新） */
export function setStoryFlag(
  state: StoryState,
  key: string,
  value: boolean | number | string
): StoryState {
  return { ...state, storyFlags: { ...state.storyFlags, [key]: value } };
}

export function getStoryFlag(state: StoryState, key: string): boolean | number | string | undefined {
  return state.storyFlags[key];
}

/** ストーリー経由で星異体を「既知」として記録する（冪等） */
export function discoverAnomalyInStory(state: StoryState, anomalyId: string): StoryState {
  if (state.discoveredAnomalies.includes(anomalyId)) return state;
  return { ...state, discoveredAnomalies: [...state.discoveredAnomalies, anomalyId] };
}

/**
 * 指定チャプター番号が現在ロックされているかを判定する。
 * チャプター1は常に解禁済み。それ以外は `chapterNN_locked` フラグが
 * 明示的にfalseになっていない限りロックされているとみなす
 * （フラグ未設定 = まだ解禁されていない、という安全側のデフォルト）。
 */
export function isChapterLocked(state: StoryState, chapterId: number): boolean {
  if (chapterId <= 1) return false;
  const flagKey = `chapter${String(chapterId).padStart(2, "0")}_locked`;
  const flagValue = state.storyFlags[flagKey];
  return flagValue !== false;
}

/**
 * チャプターを完了状態にし、次のチャプターのロックを解除する。
 * nextChapterId を省略した場合は chapterId+1 を解禁対象とする。
 */
export function completeChapter(state: StoryState, chapterId: number, nextChapterId?: number): StoryState {
  const unlockTarget = nextChapterId ?? chapterId + 1;
  const flagKey = `chapter${String(unlockTarget).padStart(2, "0")}_locked`;
  return {
    ...state,
    currentEventId: null,
    storyFlags: { ...state.storyFlags, [flagKey]: false },
  };
}

export interface StoryCondition {
  /** "flagEquals" | "eventCompleted" | "chapterAtLeast" など。未知の条件タイプは判定不能として false を返す。 */
  type: string;
  key?: string;
  value?: boolean | number | string;
}

/**
 * 将来の分岐・解禁条件判定のための汎用関数。
 * Phase13では主要な使用箇所はないが、Phase14以降のイベント分岐や
 * MOD追加イベントの解禁条件として使える形を用意しておく。
 */
export function evaluateStoryCondition(condition: StoryCondition, state: StoryState): boolean {
  switch (condition.type) {
    case "flagEquals":
      return condition.key !== undefined && state.storyFlags[condition.key] === condition.value;
    case "eventCompleted":
      return condition.key !== undefined && isEventCompleted(state, condition.key);
    case "chapterAtLeast":
      return typeof condition.value === "number" && state.currentChapter >= condition.value;
    default:
      return false;
  }
}

/**
 * 選択されたchoiceId（choiceイベントの場合）に応じてストーリーフラグを反映し、
 * 次に進むべきイベントIDを解決する。次のイベントが見つからない場合は
 * nextEventIdをnullで返す（そのイベント連鎖の終端、または壊れたデータ）。
 */
export function resolveNextEvent(
  state: StoryState,
  storyData: StoryDataBundle,
  currentEvent: StoryEventDefinition,
  choiceId?: string
): { state: StoryState; nextEvent: StoryEventDefinition | null } {
  let nextState = completeEvent(state, currentEvent.id);
  let nextEventId: string | undefined = currentEvent.nextEventId;

  if (currentEvent.type === "choice" && choiceId) {
    const choice = currentEvent.choices?.find((c) => c.id === choiceId);
    if (choice) {
      if (choice.setFlags) {
        for (const [key, value] of Object.entries(choice.setFlags)) {
          nextState = setStoryFlag(nextState, key, value);
        }
      }
      nextEventId = choice.nextEventId ?? nextEventId;
    }
  }

  if (currentEvent.unlockRecordId) {
    nextState = unlockRecord(nextState, currentEvent.unlockRecordId);
  }
  if (currentEvent.targetId && (currentEvent.type === "battle_start" || currentEvent.type === "exploration_start")) {
    nextState = discoverAnomalyInStory(nextState, currentEvent.targetId);
  }
  if (currentEvent.setFlags) {
    for (const [key, value] of Object.entries(currentEvent.setFlags)) {
      nextState = setStoryFlag(nextState, key, value);
    }
  }

  if (!nextEventId) {
    return { state: { ...nextState, currentEventId: null }, nextEvent: null };
  }

  const nextEvent = findEvent(storyData, nextEventId);
  if (!nextEvent) {
    // 壊れたデータ（存在しないnextEventId）でも進行を止めるだけでクラッシュしない
    return { state: { ...nextState, currentEventId: null }, nextEvent: null };
  }

  return { state: { ...nextState, currentEventId: nextEvent.id, currentScene: nextEvent.id }, nextEvent };
}

/**
 * StoryManager: ここまでの純粋関数群をまとめたエントリポイント。
 * 個々の関数を直接importしても良いが、まとまったオブジェクトとして
 * 参照したい場合はこちらを使う。
 */
export const StoryManager = {
  createInitialStoryState,
  findChapter,
  findEvent,
  findRecord,
  getSafeSpeakerName,
  getSafeEventText,
  beginChapter,
  completeEvent,
  isEventCompleted,
  unlockRecord,
  hasUnlockedRecord,
  setStoryFlag,
  getStoryFlag,
  discoverAnomalyInStory,
  isChapterLocked,
  completeChapter,
  evaluateStoryCondition,
  resolveNextEvent,
};
