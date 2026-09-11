import type { Session, User } from "@supabase/supabase-js";
import type { AstralSupabaseClient } from "./client.js";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/** メールアドレス・パスワードでサインアップする */
export async function signUpWithEmail(
  client: AstralSupabaseClient,
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await client.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** メールアドレス・パスワードでサインインする */
export async function signInWithEmail(
  client: AstralSupabaseClient,
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** サインアウトする */
export async function signOut(client: AstralSupabaseClient): Promise<AuthResult> {
  const { error } = await client.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 現在のセッションを取得する（未ログイン時はnull） */
export async function getCurrentSession(client: AstralSupabaseClient): Promise<Session | null> {
  const { data } = await client.auth.getSession();
  return data.session;
}

/** 現在のユーザーを取得する（未ログイン時はnull） */
export async function getCurrentUser(client: AstralSupabaseClient): Promise<User | null> {
  const { data } = await client.auth.getUser();
  return data.user;
}

/**
 * セッション変化（ログイン/ログアウト/トークン更新）を購読する。
 * 戻り値のunsubscribe関数をコンポーネントのクリーンアップで呼び出すこと。
 */
export function onAuthStateChange(
  client: AstralSupabaseClient,
  callback: (session: Session | null) => void
): () => void {
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
