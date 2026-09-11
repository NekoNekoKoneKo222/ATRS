import type { WorkshopModSummary } from "@astral-archive/core";

interface Props {
  mod: WorkshopModSummary;
  isSelected: boolean;
  onSelect: (modId: string) => void;
}

export function ModListCard({ mod, isSelected, onSelect }: Props) {
  return (
    <button
      className="aa-panel"
      onClick={() => onSelect(mod.id)}
      style={{
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        borderColor: isSelected ? "var(--aa-signal-amber)" : undefined,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: "0.95rem" }}>{mod.name}</strong>
        <span className="aa-mono" style={{ fontSize: "0.68rem", color: "var(--aa-signal-teal)" }}>
          DL {mod.downloads}
        </span>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--aa-text-dim)", margin: "0.4rem 0 0" }}>{mod.description}</p>
    </button>
  );
}
