import type { AstralSupabaseClient } from "./client.js";
import type { DataResult } from "./profiles.js";

/**
 * MOD本体・サムネイル用のStorageバケット名。
 * 実際のバケットはSupabase Dashboardまたは管理APIで事前に作成しておく必要がある。
 */
export const MOD_FILES_BUCKET = "mods";
export const MOD_THUMBNAILS_BUCKET = "mod-thumbnails";

/** ファイルをStorageへアップロードする */
export async function uploadFile(
  client: AstralSupabaseClient,
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean }
): Promise<DataResult<{ path: string }>> {
  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    ...(options?.contentType ? { contentType: options.contentType } : {}),
    upsert: options?.upsert ?? false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { path: data.path } };
}

/** 公開バケットのファイルURLを取得する */
export function getPublicUrl(client: AstralSupabaseClient, bucket: string, path: string): string {
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** 非公開バケット向けの期限付き署名URLを取得する */
export async function getSignedUrl(
  client: AstralSupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds: number = 3600
): Promise<DataResult<{ signedUrl: string }>> {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { signedUrl: data.signedUrl } };
}

/** 指定パス配下のファイル一覧を取得する（そのフォルダの直下のみ、非再帰） */
export async function listFiles(
  client: AstralSupabaseClient,
  bucket: string,
  prefix: string
): Promise<DataResult<{ name: string; isFolder: boolean }[]>> {
  const { data, error } = await client.storage.from(bucket).list(prefix);
  if (error) return { ok: false, error: error.message };
  // Supabase Storageではフォルダのプレースホルダーエントリは id が null になる
  const entries = (data ?? []).map((entry) => ({ name: entry.name, isFolder: entry.id === null }));
  return { ok: true, data: entries };
}

/**
 * 指定パス配下のファイルを再帰的に列挙する（サブフォルダも辿る）。
 * MODは `entities/characters/`, `entities/enemies/` のようにサブフォルダ構成を
 * 取るため、`manifest.json` と同じ階層だけを見るのでは不十分なことがある。
 * 深さはmaxDepthで制限し、意図しない無限再帰を防ぐ。
 */
export async function listFilesRecursive(
  client: AstralSupabaseClient,
  bucket: string,
  prefix: string,
  maxDepth: number = 4
): Promise<DataResult<string[]>> {
  const result = await listFiles(client, bucket, prefix);
  if (!result.ok || !result.data) return { ok: false, error: result.error ?? "unknown_error" };

  const filePaths: string[] = [];

  for (const entry of result.data) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isFolder) {
      if (maxDepth <= 0) continue;
      const nested = await listFilesRecursive(client, bucket, entryPath, maxDepth - 1);
      if (nested.ok && nested.data) filePaths.push(...nested.data);
    } else {
      filePaths.push(entryPath);
    }
  }

  return { ok: true, data: filePaths };
}
