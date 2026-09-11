import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types/database.js";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type AstralSupabaseClient = SupabaseClient<Database>;

/** urlとanonKeyの両方が空でない文字列として設定されているかを判定する */
export function isSupabaseConfigured(
  config: Partial<SupabaseConfig> | null | undefined
): config is SupabaseConfig {
  return Boolean(config?.url && config.url.trim() !== "" && config.anonKey && config.anonKey.trim() !== "");
}

/**
 * Supabaseクライアントを新規作成する。
 * 呼び出し側でconfigを注入する設計にしているため、テスト時や複数プロジェクトの
 * 切り替えが必要な場面でも柔軟に対応できる（モジュールレベルのシングルトンに依存しない）。
 */
export function createSupabaseClient(config: SupabaseConfig): AstralSupabaseClient {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
