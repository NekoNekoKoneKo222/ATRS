import type { AstralSupabaseClient } from "./client.js";
import type { ModRow, ModVersionRow, ModDependencyRow } from "./types/database.js";
import type { DataResult } from "./profiles.js";

/** 公開済みMODの一覧を取得する（ASTRAL WORKSHOPのMOD一覧に使用） */
export async function listPublishedMods(client: AstralSupabaseClient): Promise<DataResult<ModRow[]>> {
  const { data, error } = await client.from("mods").select("*").eq("status", "published");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

export interface ModDetail {
  mod: ModRow;
  versions: ModVersionRow[];
  latestVersion: ModVersionRow | null;
  dependencies: ModDependencyRow[];
}

/** MOD詳細（バージョン履歴・依存関係を含む）を取得する */
export async function fetchModDetail(client: AstralSupabaseClient, modId: string): Promise<DataResult<ModDetail>> {
  const modResult = await client.from("mods").select("*").eq("id", modId).maybeSingle();
  if (modResult.error) return { ok: false, error: modResult.error.message };
  if (!modResult.data) return { ok: false, error: "mod_not_found" };

  const versionsResult = await client
    .from("mod_versions")
    .select("*")
    .eq("mod_id", modId)
    .order("created_at", { ascending: false });
  if (versionsResult.error) return { ok: false, error: versionsResult.error.message };

  const versions = versionsResult.data ?? [];
  const latestVersion = versions[0] ?? null;

  let dependencies: ModDependencyRow[] = [];
  if (latestVersion) {
    const depsResult = await client.from("mod_dependencies").select("*").eq("mod_version_id", latestVersion.id);
    if (depsResult.error) return { ok: false, error: depsResult.error.message };
    dependencies = depsResult.data ?? [];
  }

  return { ok: true, data: { mod: modResult.data, versions, latestVersion, dependencies } };
}

/**
 * MODダウンロードの記録を1件追加する。
 * 注意：mods.downloads の集計値そのものはRLS上クライアントから直接更新できない
 * （更新は作者のみに許可されているため）。実際の集計・自動更新はサーバー側
 * （DBトリガーやEdge Function）で行う想定で、ここでは監査ログとしての記録のみを行う。
 */
export async function recordModDownload(
  client: AstralSupabaseClient,
  params: { modId: string; modVersionId: string; userId: string | null }
): Promise<DataResult<null>> {
  const { error } = await client.from("mod_downloads").insert({
    mod_id: params.modId,
    mod_version_id: params.modVersionId,
    user_id: params.userId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
