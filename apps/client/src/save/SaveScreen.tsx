import type { Session } from "@supabase/supabase-js";
import type { BaseState, ContainmentCollection, ExplorationState, StoryState } from "@astral-archive/core";
import { supabaseConfigured } from "../supabase/supabaseClient.js";
import { useSave } from "./useSave.js";

interface Props {
  baseState: BaseState;
  explorationState: ExplorationState;
  containmentCollection: ContainmentCollection;
  storyState?: StoryState;
  loadBaseState: (state: BaseState) => void;
  loadExplorationState: (state: ExplorationState) => void;
  loadContainmentCollection: (collection: ContainmentCollection) => void;
  loadStoryState?: (state: StoryState) => void;
  session: Session | null;
}

export function SaveScreen({
  baseState,
  explorationState,
  containmentCollection,
  storyState,
  loadBaseState,
  loadExplorationState,
  loadContainmentCollection,
  loadStoryState,
  session,
}: Props) {
  const { message, conflict, saveLocal, loadLocal, saveToCloud, loadCloud, checkConflict, resolveConflict } = useSave({
    baseState,
    explorationState,
    containmentCollection,
    ...(storyState ? { storyState } : {}),
    loadBaseState,
    loadExplorationState,
    loadContainmentCollection,
    ...(loadStoryState ? { loadStoryState } : {}),
    session,
  });

  const cloudDisabled = !supabaseConfigured || !session;

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>セーブデータ</h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 9 — ローカルセーブとクラウドセーブ（Supabase）の両方に対応
        </p>
      </header>

      {message && (
        <div className="aa-panel" style={{ marginBottom: "1rem", color: "var(--aa-signal-amber)" }}>
          {message}
        </div>
      )}

      {conflict && (
        <div className="aa-panel" style={{ marginBottom: "1rem", borderColor: "var(--aa-signal-rose)" }}>
          <p style={{ fontSize: "0.85rem", marginTop: 0 }}>
            ローカルとクラウドでセーブ内容が異なります。どちらを使用しますか？
          </p>
          <div style={{ display: "flex", gap: "0.8rem", fontSize: "0.78rem", color: "var(--aa-text-dim)", marginBottom: "0.8rem" }}>
            <span>ローカル: {conflict.localSave.meta.savedAt}{conflict.comparison === "a_newer" ? "（新しい）" : ""}</span>
            <span>クラウド: {conflict.cloudSave.meta.savedAt}{conflict.comparison === "b_newer" ? "（新しい）" : ""}</span>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button className="aa-button aa-button--primary" onClick={() => resolveConflict("local")}>
              ローカルを使用
            </button>
            <button className="aa-button aa-button--primary" onClick={() => resolveConflict("cloud")}>
              クラウドを使用
            </button>
          </div>
        </div>
      )}

      <section className="aa-panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>ローカルセーブ</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--aa-text-dim)" }}>
          このブラウザ内にセーブを保存する。オフラインでも利用可能。
        </p>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button className="aa-button aa-button--primary" onClick={saveLocal}>
            ローカルに保存
          </button>
          <button className="aa-button" onClick={loadLocal}>
            ローカルから読み込む
          </button>
        </div>
      </section>

      <section className="aa-panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>クラウドセーブ（Supabase）</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--aa-text-dim)" }}>
          {supabaseConfigured
            ? session
              ? "サインイン済み。クラウドへの保存/読み込みが利用できます。"
              : "クラウド機能を使うには「アカウント」タブからサインインしてください。"
            : "Supabaseが未設定のため、クラウド機能は利用できません（.env.local を参照）。"}
        </p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button className="aa-button aa-button--primary" onClick={saveToCloud} disabled={cloudDisabled}>
            クラウドに保存
          </button>
          <button className="aa-button" onClick={loadCloud} disabled={cloudDisabled}>
            クラウドから読み込む
          </button>
          <button className="aa-button" onClick={checkConflict} disabled={!supabaseConfigured}>
            ローカル/クラウドを比較
          </button>
        </div>
      </section>
    </div>
  );
}
