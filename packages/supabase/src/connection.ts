import type { AstralSupabaseClient } from "./client.js";

export interface ConnectionCheckResult {
  ok: boolean;
  message: string;
}

/**
 * Supabaseへの接続を軽量なクエリで確認する。
 * game_configsはRLS上「誰でも読み取り可能」なため、未ログイン状態でも
 * このクエリが成功すればURL/anonKeyの設定とDB到達性を確認できる。
 * 実際のネットワークエラー（DNS失敗・タイムアウト等）も例外としてここで捕捉する。
 */
export async function checkSupabaseConnection(client: AstralSupabaseClient): Promise<ConnectionCheckResult> {
  try {
    const { error } = await client.from("game_configs").select("key").limit(1);
    if (error) {
      return { ok: false, message: `接続エラー: ${error.message}` };
    }
    return { ok: true, message: "Supabaseへの接続に成功しました。" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `接続に失敗しました: ${message}` };
  }
}
