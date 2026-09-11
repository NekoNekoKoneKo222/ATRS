import type { Session } from "@supabase/supabase-js";
import type { ModEntityFile, WorkshopSortBy } from "@astral-archive/core";
import { useEffect } from "react";
import { useWorkshop } from "./useWorkshop.js";
import { ModListCard } from "./components/ModListCard.js";
import { ModDetailPanel } from "./components/ModDetailPanel.js";

interface Props {
  onInstallMod: (manifestRaw: string, entityFiles: ModEntityFile[]) => void;
  session: Session | null;
}

const SORT_OPTIONS: { id: WorkshopSortBy; label: string }[] = [
  { id: "newest", label: "新着順" },
  { id: "popular", label: "人気順" },
  { id: "name", label: "名前順" },
];

export function WorkshopScreen({ onInstallMod, session }: Props) {
  const {
    supabaseConfigured,
    mods,
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
  } = useWorkshop({ onInstallMod, session });

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>ASTRAL WORKSHOP</h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 11 — 公開されているMODを検索・閲覧・インストールする
        </p>
      </header>

      {!supabaseConfigured && (
        <div className="aa-panel" style={{ marginBottom: "1rem", color: "var(--aa-text-dim)" }}>
          Supabaseが未設定のため、ASTRAL WORKSHOPは利用できません。「アカウント」タブの案内を参照してください。
        </div>
      )}

      {message && (
        <div className="aa-panel" style={{ marginBottom: "1rem", color: "var(--aa-signal-amber)" }}>
          {message}
        </div>
      )}

      <section className="aa-panel" style={{ marginBottom: "1.2rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <input
          className="aa-mono"
          type="text"
          placeholder="MODを検索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            background: "var(--aa-bg-panel-raised)",
            border: "1px solid var(--aa-line-bright)",
            color: "var(--aa-text)",
            padding: "0.5rem 0.7rem",
            borderRadius: "4px",
            fontSize: "0.85rem",
          }}
        />
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className={`aa-button${sortBy === opt.id ? " aa-button--primary" : ""}`}
            onClick={() => setSortBy(opt.id)}
          >
            {opt.label}
          </button>
        ))}
        <button className="aa-button" onClick={refresh} disabled={loading}>
          {loading ? "更新中..." : "再読み込み"}
        </button>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: detail ? "1fr 1fr" : "1fr", gap: "1.2rem" }}>
        <section>
          {mods.length === 0 ? (
            <div className="aa-panel" style={{ color: "var(--aa-text-dim)" }}>
              {supabaseConfigured ? "公開されているMODが見つかりませんでした。" : "MOD一覧を表示するにはSupabaseの設定が必要です。"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              {mods.map((mod) => (
                <ModListCard key={mod.id} mod={mod} isSelected={mod.id === selectedModId} onSelect={selectMod} />
              ))}
            </div>
          )}
        </section>

        {detail && (
          <section>
            <ModDetailPanel
              detail={detail}
              authorName={authorName}
              onInstall={installSelectedMod}
              onClose={closeDetail}
              installing={installing}
            />
          </section>
        )}
      </div>
    </div>
  );
}
