import { useState } from "react";
import { EventView } from "./components/EventView.js";
import { EventLogPanel } from "./components/EventLogPanel.js";
import { ResearchRecordList } from "./components/ResearchRecordList.js";
import type { useStory } from "./useStory.js";

type StoryHookResult = ReturnType<typeof useStory>;

interface Props extends StoryHookResult {
  onRequestScreen?: (screen: "combat" | "exploration") => void;
}

export function StoryScreen({
  state,
  storyData,
  currentEvent,
  message,
  begin,
  advance,
  resetStory,
  isChapterLocked,
  onRequestScreen,
}: Props) {
  const [tab, setTab] = useState<"story" | "log" | "records">("story");

  const chapter1 = storyData.chapters.find((c) => c.id === 1);
  const notStarted = state.currentChapter === 0;
  const chapterFinished = state.currentChapter > 0 && state.currentEventId === null;

  function handleChoose(choiceId: string) {
    advance(choiceId);
  }

  function handleAdvanceOrTransition() {
    if (currentEvent?.type === "battle_start") {
      onRequestScreen?.("combat");
      advance();
      return;
    }
    if (currentEvent?.type === "exploration_start") {
      onRequestScreen?.("exploration");
      advance();
      return;
    }
    advance();
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>ストーリー</h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 13 — {chapter1 ? `CHAPTER 01「${chapter1.title}」` : "ストーリーデータ未読み込み"}
        </p>
      </header>

      {message && (
        <div className="aa-panel" style={{ marginBottom: "1rem", borderColor: "var(--aa-signal-rose)", color: "var(--aa-signal-rose)" }}>
          {message}
        </div>
      )}

      <nav style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button className={`aa-button${tab === "story" ? " aa-button--primary" : ""}`} onClick={() => setTab("story")}>
          ストーリー
        </button>
        <button className={`aa-button${tab === "log" ? " aa-button--primary" : ""}`} onClick={() => setTab("log")}>
          ログ
        </button>
        <button className={`aa-button${tab === "records" ? " aa-button--primary" : ""}`} onClick={() => setTab("records")}>
          研究記録
        </button>
      </nav>

      {tab === "story" && (
        <section>
          {notStarted && chapter1 && (
            <div className="aa-panel">
              <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{chapter1.title}</h2>
              <p style={{ color: "var(--aa-text-dim)", fontSize: "0.85rem" }}>{chapter1.description}</p>
              <button className="aa-button aa-button--primary" onClick={() => begin(1)}>
                CHAPTER 01 を開始する
              </button>
            </div>
          )}

          {notStarted && !chapter1 && (
            <div className="aa-panel" style={{ color: "var(--aa-signal-rose)" }}>
              ストーリーデータが見つかりません。ゲームデータの読み込みに問題がある可能性があります。
            </div>
          )}

          {!notStarted && !chapterFinished && (
            <EventView event={currentEvent} onAdvance={handleAdvanceOrTransition} onChoose={handleChoose} />
          )}

          {chapterFinished && (
            <div className="aa-panel" style={{ borderColor: "var(--aa-signal-amber)" }}>
              <div className="aa-mono" style={{ fontSize: "0.8rem", color: "var(--aa-signal-amber)", marginBottom: "0.5rem" }}>
                CHAPTER {String(state.currentChapter).padStart(2, "0")} COMPLETE
              </div>
              <p style={{ color: "var(--aa-text-dim)", fontSize: "0.85rem" }}>
                このチャプターは完了しました。「基地」「探索」「戦闘」などの他のタブから、通常のゲームプレイを続けてください。
              </p>
              <p style={{ color: "var(--aa-text-dim)", fontSize: "0.75rem" }}>
                次のチャプターの解禁状況: {isChapterLocked(state.currentChapter + 1) ? "未解禁" : "解禁済み"}
              </p>
              <button className="aa-button" onClick={resetStory}>
                ストーリー進行をリセット（デバッグ用）
              </button>
            </div>
          )}
        </section>
      )}

      {tab === "log" && <EventLogPanel state={state} storyData={storyData} />}
      {tab === "records" && <ResearchRecordList state={state} storyData={storyData} />}
    </div>
  );
}
