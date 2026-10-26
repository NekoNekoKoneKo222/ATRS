import { useState } from "react";
import { updateProfile, type User } from "firebase/auth";
import type { FirebaseAuthStatus } from "./useFirebaseAuth.js";

interface Props {
  status: FirebaseAuthStatus;
  user: User | null;
  errorMessage: string | null;
  signUp: (email: string, password: string) => void;
  signIn: (email: string, password: string) => void;
  signOut: () => void;
}

export function FirebaseAccountScreen({ status, user, errorMessage, signUp, signIn, signOut }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const saveName = async () => {
    if (!user) return;
    const name = displayName.trim();
    if (name.length < 1 || name.length > 40) {
      setProfileMessage("表示名は1～40文字で設定してください。");
      return;
    }
    try {
      await updateProfile(user, { displayName: name });
      setProfileMessage("表示名を保存しました。");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  };

  const inputStyle = {
    background: "var(--aa-bg-panel-raised)", border: "1px solid var(--aa-line-bright)",
    color: "var(--aa-text)", padding: "0.5rem 0.7rem", borderRadius: "4px", width: "100%",
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.6rem" }}>アカウント（Firebase 無料プラン）</h1>
      <p style={{ color: "var(--aa-text-dim)", fontSize: "0.85rem" }}>
        Firebase Authentication でログインすると Firestore にクラウドセーブを保存できます。
      </p>
      {status === "loading" && <div className="aa-panel">ログイン状態を確認しています...</div>}
      {status === "not_configured" && (
        <div className="aa-panel">
          Firebaseが未設定です。<code>apps/client/.env.local</code> の設定方法は
          <code> docs/firebase-setup.md</code> を参照してください。ローカルセーブは引き続き使えます。
        </div>
      )}
      {status === "signed_out" && (
        <div className="aa-panel" style={{ display: "grid", gap: "0.7rem" }}>
          <input type="email" autoComplete="email" placeholder="メールアドレス" value={email}
            onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
          <input type="password" autoComplete="current-password" placeholder="パスワード（6文字以上）"
            value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: "0.7rem" }}>
            <button className="aa-button aa-button--primary" onClick={() => signIn(email, password)}>サインイン</button>
            <button className="aa-button" onClick={() => signUp(email, password)}>新規登録</button>
          </div>
          {errorMessage && <p style={{ color: "var(--aa-signal-rose)" }}>{errorMessage}</p>}
        </div>
      )}
      {status === "signed_in" && user && (
        <div className="aa-panel" style={{ display: "grid", gap: "0.7rem" }}>
          <div>ログイン中: {user.email}</div>
          <div>表示名: {user.displayName || "未設定"}</div>
          <input type="text" maxLength={40} placeholder="表示名（1～40文字）" value={displayName}
            onChange={(event) => setDisplayName(event.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: "0.7rem" }}>
            <button className="aa-button aa-button--primary" onClick={saveName}>表示名を保存</button>
            <button className="aa-button" onClick={signOut}>サインアウト</button>
          </div>
          {profileMessage && <p>{profileMessage}</p>}
          {errorMessage && <p style={{ color: "var(--aa-signal-rose)" }}>{errorMessage}</p>}
        </div>
      )}
    </div>
  );
}
