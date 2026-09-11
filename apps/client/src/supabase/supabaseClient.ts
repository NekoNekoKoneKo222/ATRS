import { createSupabaseClient, isSupabaseConfigured, type AstralSupabaseClient, type SupabaseConfig } from "@astral-archive/supabase";

const config: Partial<SupabaseConfig> = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export const supabaseConfigured = isSupabaseConfigured(config);

/**
 * 設定が揃っている場合のみSupabaseクライアントを生成する。
 * 未設定時にモジュール読み込み時点でエラーにならないよう、遅延生成にしている。
 */
export const supabaseClient: AstralSupabaseClient | null = isSupabaseConfigured(config)
  ? createSupabaseClient(config)
  : null;
