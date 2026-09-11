import type { AstralSupabaseClient } from "./client.js";
import type { GameConfigRow } from "./types/database.js";
import type { DataResult } from "./profiles.js";

/**
 * サーバー配信のゲームバランス設定を取得する。
 * RLSにより読み取りは誰でも可能（書き込みはservice_role経由のみ）。
 * クライアント側のローカル設定（packages/data/config）を上書きする用途を想定。
 */
export async function fetchGameConfig(
  client: AstralSupabaseClient,
  key: string
): Promise<DataResult<GameConfigRow>> {
  const { data, error } = await client.from("game_configs").select("*").eq("key", key).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "config_not_found" };
  return { ok: true, data };
}

export async function fetchAllGameConfigs(
  client: AstralSupabaseClient
): Promise<DataResult<GameConfigRow[]>> {
  const { data, error } = await client.from("game_configs").select("*");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}
