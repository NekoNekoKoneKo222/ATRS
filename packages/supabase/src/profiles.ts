import type { AstralSupabaseClient } from "./client.js";
import type { ProfileRow } from "./types/database.js";

export interface DataResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** 指定ユーザーIDのプロフィールを取得する */
export async function getProfile(
  client: AstralSupabaseClient,
  userId: string
): Promise<DataResult<ProfileRow>> {
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "profile_not_found" };
  return { ok: true, data };
}

/**
 * プロフィールを作成または更新する（upsert）。
 * RLSポリシー上、自分自身（auth.uid() === id）のプロフィールしか書き込めない。
 */
export async function upsertProfile(
  client: AstralSupabaseClient,
  profile: { id: string; display_name: string; avatar_url?: string | null }
): Promise<DataResult<ProfileRow>> {
  const { data, error } = await client
    .from("profiles")
    .upsert({ id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url ?? null })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
