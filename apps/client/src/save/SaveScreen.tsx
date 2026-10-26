import type { Session } from "@supabase/supabase-js";
import type { User } from "firebase/auth";
import { firebaseConfigured } from "../firebase/firebaseClient.js";
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
  firebaseUser: User | null;
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
  firebaseUser,
}: Props) {
  const { message, conflict, saveLocal, loadLocal, exportSaveFile, importSaveFile, saveToCloud, loadCloud, checkConflict, resolveConflict } = useSave({
    baseState,
    explorationState,
    containmentCollection,
    ...(storyState ? { storyState } : {}),
    loadBaseState,
    loadExplorationState,
    loadContainmentCollection,
    ...(loadStoryState ? { loadStoryState } : {}),
    session,
    firebaseUser,
  });

  const cloudConfigured = firebaseConfigured || supabaseConfigured;
  const cloudDisabled = firebaseConfigured ? !firebaseUser : !supabaseConfigured || !session;

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>セーブデータ</h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 9 — ローカルセーブとクラウドセーブ（Firebase／旧Supabase）
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
          <button className="aa-button" onClick={exportSaveFile}>
            セーブファイルを書き出す
          </button>
        </div>
        <label style={{ display: "block", marginTop: "0.8rem", fontSize: "0.8rem" }}>
          JSONバックアップから読み込む：
          <input type="file" accept=".json,application/json" style={{ display: "block", marginTop: "0.4rem" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importSaveFile(file);
              event.target.value = "";
            }} />
        </label>
      </section>

      <section className="aa-panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>クラウドセーブ（{firebaseConfigured ? "Firebase Firestore" : "Supabase（旧方式）"}）</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--aa-text-dim)" }}>
          {firebaseConfigured
            ? firebaseUser
              ? "Firebaseにサインイン済み。無料枠内でクラウド保存/読み込みができます。"
              : "Firebaseにサインインしてください。旧Supabaseのセーブは自動移行されません。"
            : supabaseConfigured
              ? session
                ? "旧Supabaseにサインイン済み。従来のクラウドセーブを利用します。"
                : "クラウド機能を使うには「アカウント」タブからサインインしてください。"
              : "クラウドが未設定です（docs/firebase-setup.md を参照）。"}
        </p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button className="aa-button aa-button--primary" onClick={saveToCloud} disabled={cloudDisabled}>
            クラウドに保存
          </button>
          <button className="aa-button" onClick={loadCloud} disabled={cloudDisabled}>
            クラウドから読み込む
          </button>
          <button className="aa-button" onClick={checkConflict} disabled={!cloudConfigured}>
            ローカル/クラウドを比較
          </button>
        </div>
      </section>
    </div>
  );
}
