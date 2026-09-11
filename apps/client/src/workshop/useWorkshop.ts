import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { filterAndSortMods, type WorkshopSortBy, type ModEntityFile } from "@astral-archive/core";
import {
  listPublishedMods,
  fetchModDetail,
  recordModDownload,
  listFilesRecursive,
  getSignedUrl,
  getProfile,
  MOD_FILES_BUCKET,
  type ModRow,
  type ModDetail,
} from "@astral-archive/supabase";
import { supabaseClient, supabaseConfigured } from "../supabase/supabaseClient.js";
import { toWorkshopSummary } from "./workshopData.js";

interface UseWorkshopOptions {
  onInstallMod: (manifestRaw: string, entityFiles: ModEntityFile[]) => void;
  session: Session | null;
}

export function useWorkshop({ onInstallMod, session }: UseWorkshopOptions) {
  const [mods, setMods] = useState<ModRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<WorkshopSortBy>("newest");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ModDetail | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabaseClient) {
      setMessage("Supabaseが未設定のため、ASTRAL WORKSHOPのMOD一覧は取得できません。");
      return;
    }
    setLoading(true);
    const result = await listPublishedMods(supabaseClient);
    setLoading(false);
    if (!result.ok || !result.data) {
      setMessage(result.error ?? "MOD一覧の取得に失敗しました。");
      return;
    }
    setMods(result.data);
    setMessage(null);
  }, []);

  const filteredMods = useMemo(() => {
    return filterAndSortMods(mods.map(toWorkshopSummary), { searchText, sortBy });
  }, [mods, searchText, sortBy]);

  const selectMod = useCallback(async (modId: string) => {
    setSelectedModId(modId);
    setDetail(null);
    setAuthorName(null);
    if (!supabaseClient) return;

    const result = await fetchModDetail(supabaseClient, modId);
    if (!result.ok || !result.data) {
      setMessage(result.error ?? "MOD詳細の取得に失敗しました。");
      return;
    }
    setDetail(result.data);

    const profileResult = await getProfile(supabaseClient, result.data.mod.author_id);
    if (profileResult.ok && profileResult.data) setAuthorName(profileResult.data.display_name);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedModId(null);
    setDetail(null);
    setAuthorName(null);
  }, []);

  /**
   * 選択中のMODの最新バージョンをStorageからダウンロードしてインストールする。
   * manifest.json とすべてのentitiesファイルを再帰的に取得し、
   * Phase10のuseMods.addMod()と同じ検証パイプラインへ渡す。
   */
  const installSelectedMod = useCallback(async () => {
    if (!supabaseClient || !detail || !detail.latestVersion) {
      setMessage("インストールできません（未接続、またはバージョン情報がありません）。");
      return;
    }

    setInstalling(true);
    try {
      const filesResult = await listFilesRecursive(supabaseClient, MOD_FILES_BUCKET, detail.latestVersion.storage_path);
      if (!filesResult.ok || !filesResult.data) {
        setMessage(filesResult.error ?? "MODファイル一覧の取得に失敗しました。");
        return;
      }

      let manifestRaw: string | null = null;
      const entityFiles: ModEntityFile[] = [];

      for (const fullPath of filesResult.data) {
        const urlResult = await getSignedUrl(supabaseClient, MOD_FILES_BUCKET, fullPath);
        if (!urlResult.ok || !urlResult.data) continue;

        const response = await fetch(urlResult.data.signedUrl);
        const text = await response.text();

        const relativePath = fullPath.slice(detail.latestVersion.storage_path.length + 1);
        if (relativePath === "manifest.json") {
          manifestRaw = text;
        } else {
          entityFiles.push({ path: relativePath, content: text });
        }
      }

      if (!manifestRaw) {
        setMessage("manifest.jsonが見つかりませんでした。");
        return;
      }

      onInstallMod(manifestRaw, entityFiles);

      await recordModDownload(supabaseClient, {
        modId: detail.mod.id,
        modVersionId: detail.latestVersion.id,
        userId: session?.user.id ?? null,
      });

      setMessage(`「${detail.mod.name}」をインストールしました。`);
    } catch (e) {
      setMessage(`インストール中にエラーが発生しました：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setInstalling(false);
    }
  }, [detail, onInstallMod, session]);

  return {
    supabaseConfigured,
    mods: filteredMods,
    searchText,
    setSearchText,
    sortBy,
    setSortBy,
    loading,
    message,
    refresh,
    selectedModId,
    detail,
    authorName,
    selectMod,
    closeDetail,
    installSelectedMod,
    installing,
  };
}
