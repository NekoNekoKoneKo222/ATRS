/**
 * ASTRAL WORKSHOP（ゲーム内MODブラウザ）向けの、Supabaseへの依存を持たない
 * 純粋なフィルタ・並び替えロジック。実際のデータ取得は packages/supabase 側が担う。
 */
export interface WorkshopModSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  authorName: string;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export type WorkshopSortBy = "newest" | "popular" | "name";

export interface WorkshopFilterOptions {
  /** 名前・説明文に対する部分一致検索（大文字小文字を区別しない） */
  searchText?: string;
  sortBy: WorkshopSortBy;
}

/** 検索語に部分一致するかを判定する（名前・説明文の両方を対象にする） */
function matchesSearch(mod: WorkshopModSummary, searchText: string): boolean {
  const needle = searchText.trim().toLowerCase();
  if (needle === "") return true;
  return mod.name.toLowerCase().includes(needle) || mod.description.toLowerCase().includes(needle);
}

/**
 * MOD一覧をフィルタ・並び替えする。
 * 元の配列は変更せず、新しい配列を返す。
 */
export function filterAndSortMods(mods: WorkshopModSummary[], options: WorkshopFilterOptions): WorkshopModSummary[] {
  const filtered = options.searchText ? mods.filter((m) => matchesSearch(m, options.searchText!)) : [...mods];

  const sorted = filtered.sort((a, b) => {
    switch (options.sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "popular":
        return b.downloads - a.downloads;
      case "name":
        return a.name.localeCompare(b.name, "ja");
      default:
        return 0;
    }
  });

  return sorted;
}
