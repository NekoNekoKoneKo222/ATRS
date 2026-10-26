import { useCallback, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { firebaseAuth, firebaseConfigured } from "./firebaseClient.js";

export type FirebaseAuthStatus = "not_configured" | "loading" | "signed_out" | "signed_in";

function friendlyError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  switch (code) {
    case "auth/email-already-in-use": return "このメールアドレスは既に登録されています。";
    case "auth/invalid-email": return "メールアドレスの形式が正しくありません。";
    case "auth/weak-password": return "パスワードをもう少し長くしてください。";
    case "auth/invalid-credential": return "メールアドレスかパスワードが正しくありません。";
    case "auth/too-many-requests": return "試行回数が多すぎます。しばらく待ってから再試行してください。";
    default: return error instanceof Error ? error.message : "認証に失敗しました。";
  }
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<FirebaseAuthStatus>(firebaseConfigured ? "loading" : "not_configured");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseAuth) {
      setStatus("not_configured");
      return;
    }
    return onAuthStateChanged(
      firebaseAuth,
      (nextUser) => {
        setUser(nextUser);
        setStatus(nextUser ? "signed_in" : "signed_out");
      },
      (error) => {
        setErrorMessage(friendlyError(error));
        setStatus("signed_out");
      }
    );
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!firebaseAuth) return;
    setErrorMessage(null);
    try { await createUserWithEmailAndPassword(firebaseAuth, email, password); }
    catch (error) { setErrorMessage(friendlyError(error)); }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!firebaseAuth) return;
    setErrorMessage(null);
    try { await signInWithEmailAndPassword(firebaseAuth, email, password); }
    catch (error) { setErrorMessage(friendlyError(error)); }
  }, []);

  const signOut = useCallback(async () => {
    if (!firebaseAuth) return;
    setErrorMessage(null);
    try { await firebaseSignOut(firebaseAuth); }
    catch (error) { setErrorMessage(friendlyError(error)); }
  }, []);

  return { user, status, errorMessage, signUp, signIn, signOut };
}
