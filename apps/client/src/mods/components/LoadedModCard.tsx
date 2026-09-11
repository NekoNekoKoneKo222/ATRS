import type { LoadedMod } from "../useMods.js";

interface Props {
  mod: LoadedMod;
  onRemove: (modId: string) => void;
  onToggleEnabled: (modId: string) => void;
}

export function LoadedModCard({ mod, onRemove, onToggleEnabled }: Props) {
  const { manifest, entities, enabled } = mod;
  const counts = [
    ["キャラクター", entities.characters.length],
    ["星異体", entities.anomalies.length],
    ["武器", entities.weapons.length],
    ["スキル", entities.skills.length],
    ["施設", entities.facilities.length],
  ] as const;

  return (
    <div className="aa-panel" style={{ opacity: enabled ? 1 : 0.55 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: "1rem" }}>{manifest.name}</strong>
        <span className="aa-mono" style={{ fontSize: "0.7rem", color: enabled ? "var(--aa-signal-teal)" : "var(--aa-text-dim)" }}>
          {enabled ? "有効" : "無効"} ／ v{manifest.version}
        </span>
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--aa-text-dim)", margin: "0.4rem 0 0.5rem" }}>
        {manifest.description}
      </p>
      <div className="aa-mono" style={{ fontSize: "0.7rem", color: "var(--aa-text-dim)", marginBottom: "0.3rem" }}>
        作者: {manifest.author} ／ priority: {manifest.priority}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.6rem" }}>
        {counts
          .filter(([, count]) => count > 0)
          .map(([label, count]) => (
            <span
              key={label}
              className="aa-mono"
              style={{
                fontSize: "0.68rem",
                border: "1px solid var(--aa-line-bright)",
                borderRadius: "2px",
                padding: "0.05rem 0.4rem",
                color: "var(--aa-signal-teal)",
              }}
            >
              {label} {count}
            </span>
          ))}
      </div>
      {entities.errors.length > 0 && (
        <ul style={{ fontSize: "0.7rem", color: "var(--aa-signal-rose)", margin: "0 0 0.6rem", paddingLeft: "1.1rem" }}>
          {entities.errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="aa-button" onClick={() => onToggleEnabled(manifest.id)}>
          {enabled ? "無効化する" : "有効化する"}
        </button>
        <button className="aa-button" onClick={() => onRemove(manifest.id)}>
          アンインストール
        </button>
      </div>
    </div>
  );
}
