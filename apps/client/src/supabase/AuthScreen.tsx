import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getProfile, upsertProfile, type ProfileRow } from "@astral-archive/supabase";
import { supabaseClient, supabaseConfigured } from "./supabaseClient.js";
import type { AuthStatus } from "./useSupabaseAuth.js";
import { ConnectionStatus } from "./components/ConnectionStatus.js";

interface Props {
  status: AuthStatus;
  session: Session | null;
  errorMessage: string | null;
  signUp: (email: string, password: string) => void;
  signIn: (email: string, password: string) => void;
  signOut: () => void;
}

export function AuthScreen({ status, session, errorMessage, signUp, signIn, signOut }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseClient || !session) {
      setProfile(null);
      return;
    }
    getProfile(supabaseClient, session.user.id).then((result) => {
      if (result.ok && result.data) {
        setProfile(result.data);
        setDisplayName(result.data.display_name);
      }
    });
  }, [session]);

  async function handleSaveProfile() {
    if (!supabaseClient || !session) return;
    const result = await upsertProfile(supabaseClient, { id: session.user.id, display_name: displayName });
    if (result.ok && result.data) {
      setProfile(result.data);
      setProfileMessage("プロフィールを保存しました。");
    } else {
      setProfileMessage(result.error ?? "プロフィールの保存に失敗しました。");
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>アカウント</h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 8 — Supabase Authentication / Database / Storage との連携
        </p>
      </header>

      <section style={{ marginBottom: "1.2rem" }}>
        <ConnectionStatus />
      </section>

      {supabaseConfigured && status === "signed_out" && (
        <section className="aa-panel" style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1rem", marginTop: 0 }}>サインイン / 新規登録</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "0.8rem" }}>
            <input
              className="aa-mono"
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              className="aa-mono"
              type="password"
              placeholder="パスワード（8文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="aa-button aa-button--primary" onClick={() => signIn(email, password)}>
              サインイン
            </button>
            <button className="aa-button" onClick={() => signUp(email, password)}>
              新規登録
            </button>
          </div>
          {errorMessage && <p style={{ color: "var(--aa-signal-rose)", fontSize: "0.8rem" }}>{errorMessage}</p>}
        </section>
      )}

      {supabaseConfigured && status === "signed_in" && session && (
        <section className="aa-panel" style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1rem", marginTop: 0 }}>プロフィール</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--aa-text-dim)" }}>{session.user.email}</p>
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <input
              className="aa-mono"
              type="text"
              placeholder="表示名"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
            />
            <button className="aa-button aa-button--primary" onClick={handleSaveProfile}>
              保存
            </button>
          </div>
          {profile && (
            <p style={{ fontSize: "0.75rem", color: "var(--aa-signal-teal)" }}>
              現在の表示名: {profile.display_name}
            </p>
          )}
          {profileMessage && <p style={{ fontSize: "0.75rem", color: "var(--aa-text-dim)" }}>{profileMessage}</p>}
          <button className="aa-button" onClick={signOut} style={{ marginTop: "0.6rem" }}>
            サインアウト
          </button>
        </section>
      )}

      {status === "loading" && (
        <div className="aa-panel" style={{ color: "var(--aa-text-dim)" }}>
          セッションを確認しています...
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--aa-bg-panel-raised)",
  border: "1px solid var(--aa-line-bright)",
  color: "var(--aa-text)",
  padding: "0.5rem 0.7rem",
  borderRadius: "4px",
  fontSize: "0.85rem",
};
