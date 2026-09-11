import type { ModDetail } from "@astral-archive/supabase";

interface Props {
  detail: ModDetail;
  authorName: string | null;
  onInstall: () => void;
  onClose: () => void;
  installing: boolean;
}

export function ModDetailPanel({ detail, authorName, onInstall, onClose, installing }: Props) {
  const { mod, versions, latestVersion, dependencies } = detail;

  return (
    <div className="aa-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{mod.name}</h2>
        <button className="aa-button" onClick={onClose}>
          閉じる
        </button>
      </div>

      <p style={{ fontSize: "0.8rem", color: "var(--aa-text-dim)", margin: "0.5rem 0" }}>{mod.description}</p>

      <div className="aa-mono" style={{ fontSize: "0.75rem", color: "var(--aa-text-dim)", marginBottom: "0.6rem" }}>
        作者: {authorName ?? "取得中..."} ／ 最新バージョン: {latestVersion?.version ?? "不明"} ／ ダウンロード数:{" "}
        {mod.downloads}
      </div>

      {dependencies.length > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--aa-signal-amber)", marginBottom: "0.5rem" }}>
          必要MOD: {dependencies.map((d) => `${d.depends_on_mod_id}@${d.depends_on_version}`).join(", ")}
        </div>
      )}

      {versions.length > 1 && (
        <div style={{ fontSize: "0.72rem", color: "var(--aa-text-dim)", marginBottom: "0.6rem" }}>
          更新履歴: {versions.map((v) => v.version).join(" → ")}
        </div>
      )}

      <button className="aa-button aa-button--primary" onClick={onInstall} disabled={installing || !latestVersion}>
        {installing ? "インストール中..." : "インストール"}
      </button>
    </div>
  );
}
