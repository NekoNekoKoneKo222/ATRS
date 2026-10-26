import { test } from "node:test";
import assert from "node:assert/strict";
import {
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
} from "../systems/storySystem.js";
import type { StoryDataBundle, StoryEventDefinition } from "../types/story.js";

const testStoryData: StoryDataBundle = {
  chapters: [
    { id: 1, title: "テスト章1", description: "", firstEventId: "ev_1", source: "base" },
    { id: 2, title: "テスト章2", description: "", firstEventId: "ev_missing_first", source: "base" },
  ],
  events: [
    { id: "ev_1", chapter: 1, type: "narration", text: "はじまり", nextEventId: "ev_2", source: "base" },
    { id: "ev_2", chapter: 1, type: "dialogue", speaker: "ARCHIVIST", text: "こんにちは", nextEventId: "ev_choice", source: "base" },
    {
      id: "ev_choice",
      chapter: 1,
      type: "choice",
      text: "どうする？",
      choices: [
        { id: "opt_a", text: "選択A", nextEventId: "ev_a", setFlags: { chose_a: true } },
        { id: "opt_b", text: "選択B", nextEventId: "ev_b" },
      ],
      source: "base",
    },
    { id: "ev_a", chapter: 1, type: "narration", text: "Aを選んだ", source: "base" },
    { id: "ev_b", chapter: 1, type: "narration", text: "Bを選んだ", source: "base" },
    {
      id: "ev_record",
      chapter: 1,
      type: "research_record",
      text: "記録を解禁した",
      unlockRecordId: "record_001",
      source: "base",
    },
    {
      id: "ev_dead_end",
      chapter: 1,
      type: "narration",
      text: "存在しない次のイベントを指す",
      nextEventId: "ev_does_not_exist",
      source: "base",
    },
  ],
  records: [{ id: "record_001", title: "テスト記録", content: "内容", source: "base" }],
};

test("createInitialStoryStateは未開始状態を返す", () => {
  const state = createInitialStoryState();
  assert.equal(state.currentChapter, 0);
  assert.equal(state.currentEventId, null);
  assert.deepEqual(state.completedEvents, []);
  assert.deepEqual(state.unlockedRecords, []);
  assert.deepEqual(state.discoveredAnomalies, []);
});

test("findChapter/findEvent/findRecordは存在しないIDに対してundefinedを返す", () => {
  assert.equal(findChapter(testStoryData, 999), undefined);
  assert.equal(findEvent(testStoryData, "unknown"), undefined);
  assert.equal(findRecord(testStoryData, "unknown"), undefined);
});

test("getSafeSpeakerName/getSafeEventTextはイベントが無い場合でも安全な値を返す", () => {
  assert.equal(getSafeSpeakerName(undefined), "???");
  assert.equal(getSafeEventText(undefined), "（このイベントは読み込めませんでした）");
});

test("getSafeEventTextは話者・本文が空でも空文字を返す（クラッシュしない）", () => {
  const event: StoryEventDefinition = { id: "e", chapter: 1, type: "narration", source: "base" };
  assert.equal(getSafeSpeakerName(event), "");
  assert.equal(getSafeEventText(event), "");
});

test("beginChapterは最初のイベントへ正しく遷移する", () => {
  const result = beginChapter(createInitialStoryState(), testStoryData, 1);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.currentChapter, 1);
    assert.equal(result.state.currentEventId, "ev_1");
    assert.equal(result.event?.id, "ev_1");
  }
});

test("beginChapterは存在しないチャプターに対してエラーを返し、状態を変更しない", () => {
  const initial = createInitialStoryState();
  const result = beginChapter(initial, testStoryData, 999);
  assert.equal(result.ok, false);
  assert.deepEqual(result.state, initial);
});

test("beginChapterは最初のイベントが存在しないチャプターに対してエラーを返す", () => {
  const initial = createInitialStoryState();
  const result = beginChapter(initial, testStoryData, 2);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /ev_missing_first/);
  }
});

test("completeEvent/isEventCompletedは冪等に動作する", () => {
  let state = createInitialStoryState();
  assert.equal(isEventCompleted(state, "ev_1"), false);
  state = completeEvent(state, "ev_1");
  assert.equal(isEventCompleted(state, "ev_1"), true);
  const again = completeEvent(state, "ev_1");
  assert.equal(again.completedEvents.length, 1);
});

test("unlockRecord/hasUnlockedRecordは冪等に動作する", () => {
  let state = createInitialStoryState();
  assert.equal(hasUnlockedRecord(state, "record_001"), false);
  state = unlockRecord(state, "record_001");
  assert.equal(hasUnlockedRecord(state, "record_001"), true);
  const again = unlockRecord(state, "record_001");
  assert.equal(again.unlockedRecords.length, 1);
});

test("setStoryFlag/getStoryFlagは値を正しく保存・取得する", () => {
  let state = createInitialStoryState();
  assert.equal(getStoryFlag(state, "some_flag"), undefined);
  state = setStoryFlag(state, "some_flag", true);
  assert.equal(getStoryFlag(state, "some_flag"), true);
  state = setStoryFlag(state, "some_number", 42);
  assert.equal(getStoryFlag(state, "some_number"), 42);
});

test("discoverAnomalyInStoryは冪等に動作する", () => {
  let state = createInitialStoryState();
  state = discoverAnomalyInStory(state, "AA-TUTORIAL");
  state = discoverAnomalyInStory(state, "AA-TUTORIAL");
  assert.deepEqual(state.discoveredAnomalies, ["AA-TUTORIAL"]);
});

test("isChapterLockedはチャプター1を常に解禁済みとして扱う", () => {
  const state = createInitialStoryState();
  assert.equal(isChapterLocked(state, 1), false);
});

test("isChapterLockedはフラグ未設定のチャプターをロック中として扱う", () => {
  const state = createInitialStoryState();
  assert.equal(isChapterLocked(state, 2), true);
});

test("completeChapterは次のチャプターのロックを解除する", () => {
  const state = completeChapter(createInitialStoryState(), 1);
  assert.equal(isChapterLocked(state, 2), false);
  assert.equal(state.currentEventId, null);
});

test("completeChapterはnextChapterIdを明示指定できる", () => {
  const state = completeChapter(createInitialStoryState(), 1, 5);
  assert.equal(isChapterLocked(state, 5), false);
  assert.equal(isChapterLocked(state, 2), true); // 明示指定していないので2はまだロック
});

test("evaluateStoryConditionはflagEqualsを正しく判定する", () => {
  const state = setStoryFlag(createInitialStoryState(), "met_archivist", true);
  assert.equal(evaluateStoryCondition({ type: "flagEquals", key: "met_archivist", value: true }, state), true);
  assert.equal(evaluateStoryCondition({ type: "flagEquals", key: "met_archivist", value: false }, state), false);
});

test("evaluateStoryConditionはeventCompletedを正しく判定する", () => {
  const state = completeEvent(createInitialStoryState(), "ev_1");
  assert.equal(evaluateStoryCondition({ type: "eventCompleted", key: "ev_1" }, state), true);
  assert.equal(evaluateStoryCondition({ type: "eventCompleted", key: "ev_2" }, state), false);
});

test("evaluateStoryConditionはchapterAtLeastを正しく判定する", () => {
  const state = { ...createInitialStoryState(), currentChapter: 3 };
  assert.equal(evaluateStoryCondition({ type: "chapterAtLeast", value: 3 }, state), true);
  assert.equal(evaluateStoryCondition({ type: "chapterAtLeast", value: 4 }, state), false);
});

test("evaluateStoryConditionは未知の条件タイプに対してfalseを返す（クラッシュしない）", () => {
  const state = createInitialStoryState();
  assert.equal(evaluateStoryCondition({ type: "unknown_condition_type" }, state), false);
});

test("resolveNextEventはnextEventIdに従って次のイベントへ進む", () => {
  const state = createInitialStoryState();
  const event = findEvent(testStoryData, "ev_1")!;
  const result = resolveNextEvent(state, testStoryData, event);
  assert.equal(result.nextEvent?.id, "ev_2");
  assert.equal(isEventCompleted(result.state, "ev_1"), true);
});

test("resolveNextEventはchoiceイベントで選択したフラグを反映する", () => {
  const state = createInitialStoryState();
  const event = findEvent(testStoryData, "ev_choice")!;
  const result = resolveNextEvent(state, testStoryData, event, "opt_a");
  assert.equal(result.nextEvent?.id, "ev_a");
  assert.equal(getStoryFlag(result.state, "chose_a"), true);
});

test("resolveNextEventは選択肢Bを選ぶと別の分岐へ進む", () => {
  const state = createInitialStoryState();
  const event = findEvent(testStoryData, "ev_choice")!;
  const result = resolveNextEvent(state, testStoryData, event, "opt_b");
  assert.equal(result.nextEvent?.id, "ev_b");
});

test("resolveNextEventはunlockRecordIdを持つイベントで記録を解禁する", () => {
  const state = createInitialStoryState();
  const event = findEvent(testStoryData, "ev_record")!;
  const result = resolveNextEvent(state, testStoryData, event);
  assert.equal(hasUnlockedRecord(result.state, "record_001"), true);
  assert.equal(result.nextEvent, null); // nextEventId未指定なので終端
});

test("resolveNextEventは存在しないnextEventIdを指していてもクラッシュせず終端として扱う", () => {
  const state = createInitialStoryState();
  const event = findEvent(testStoryData, "ev_dead_end")!;
  const result = resolveNextEvent(state, testStoryData, event);
  assert.equal(result.nextEvent, null);
  assert.equal(result.state.currentEventId, null);
  assert.equal(isEventCompleted(result.state, "ev_dead_end"), true);
});

test("resolveNextEventはnextEventIdが無いイベントで終端としてcurrentEventIdをnullにする", () => {
  const state = createInitialStoryState();
  const event = findEvent(testStoryData, "ev_a")!;
  const result = resolveNextEvent(state, testStoryData, event);
  assert.equal(result.nextEvent, null);
  assert.equal(result.state.currentEventId, null);
});
