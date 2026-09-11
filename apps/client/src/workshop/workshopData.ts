import type { WorkshopModSummary } from "@astral-archive/core";
import type { ModRow } from "@astral-archive/supabase";

/**
 * SupabaseのModRowをWorkshop表示用の要約型へ変換する。
 * 作者名の解決にはprofilesテーブルへの追加クエリが必要になるため、
 * 一覧表示では簡略化してauthor_id（短縮表示）をそのまま使う。
 * 詳細画面では別途プロフィールを取得して正式な表示名に置き換える。
 */
export function toWorkshopSummary(row: ModRow): WorkshopModSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    authorName: `作者ID: ${row.author_id.slice(0, 8)}...`,
    downloads: row.downloads,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
