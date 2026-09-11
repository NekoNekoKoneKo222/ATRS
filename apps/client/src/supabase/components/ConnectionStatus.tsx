import { useState } from "react";
import { checkSupabaseConnection } from "@astral-archive/supabase";
import { supabaseClient, supabaseConfigured } from "../supabaseClient.js";

type CheckState = { phase: "idle" } | { phase: "checking" } | { phase: "done"; ok: boolean; message: string };

export function ConnectionStatus() {
  const [check, setCheck] = useState<CheckState>({ phase: "idle" });

  async function handleCheck() {
    if (!supabaseClient) return;
    setCheck({ phase: "checking" });
    const result = await checkSupabaseConnection(supabaseClient);
    setCheck({ phase: "done", ok: result.ok, message: result.message });
  }

  if (!supabaseConfigured) {
    return (
      <div className="aa-panel" style={{ color: "var(--aa-text-dim)" }}>
        Supabaseは未設定です。<code className="aa-mono">apps/client/.env.local</code> に
        <code className="aa-mono"> VITE_SUPABASE_URL</code> / <code className="aa-mono">VITE_SUPABASE_ANON_KEY</code>{" "}
        を設定すると、クラウド機能（アカウント・クラウドセーブ・MOD配布）が有効になります。
        未設定でもゲーム本編はローカルで問題なくプレイできます。
      </div>
    );
  }

  return (
    <div className="aa-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <strong style={{ fontSize: "0.9rem" }}>Supabase接続状態</strong>
        <button className="aa-button" onClick={handleCheck} disabled={check.phase === "checking"}>
          {check.phase === "checking" ? "確認中..." : "接続を確認"}
        </button>
      </div>
      {check.phase === "done" && (
        <div style={{ fontSize: "0.8rem", color: check.ok ? "var(--aa-signal-teal)" : "var(--aa-signal-rose)" }}>
          {check.message}
        </div>
      )}
      {check.phase === "idle" && (
        <div style={{ fontSize: "0.8rem", color: "var(--aa-text-dim)" }}>
          「接続を確認」でプロジェクトへの到達性をチェックできます。
        </div>
      )}
    </div>
  );
}
