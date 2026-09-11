import type { GalaxyNodeDefinition } from "@astral-archive/core";
import { getNodeTypeMeta, getEncounterTypeLabel } from "../nodeTypeMeta.js";

interface Props {
  node: GalaxyNodeDefinition;
  isCurrent: boolean;
  isExplored: boolean;
  isDirectlyReachable: boolean;
  onTravel: (nodeId: string) => void;
  onExplore: () => void;
}

export function NodeCard({ node, isCurrent, isExplored, isDirectlyReachable, onTravel, onExplore }: Props) {
  const typeMeta = getNodeTypeMeta(node.nodeType);

  return (
    <div
      className="aa-panel"
      style={{
        borderColor: isCurrent ? "var(--aa-signal-amber)" : undefined,
        opacity: isCurrent ? 1 : 0.9,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: "0.95rem" }}>{node.name}</strong>
        {isCurrent && (
          <span className="aa-mono" style={{ fontSize: "0.65rem", color: "var(--aa-signal-amber)" }}>
            現在地
          </span>
        )}
      </div>

      <span
        className="aa-mono"
        style={{
          display: "inline-block",
          marginTop: "0.3rem",
          fontSize: "0.65rem",
          border: `1px solid ${typeMeta.color}`,
          color: typeMeta.color,
          borderRadius: "2px",
          padding: "0.02rem 0.35rem",
        }}
      >
        {typeMeta.label}
      </span>

      <p style={{ fontSize: "0.76rem", color: "var(--aa-text-dim)", margin: "0.5rem 0" }}>{node.description}</p>

      {node.encounters.length > 0 && (
        <div style={{ fontSize: "0.68rem", color: "var(--aa-text-dim)", marginBottom: "0.5rem" }}>
          想定される発見：{Array.from(new Set(node.encounters.map((e) => getEncounterTypeLabel(e.type)))).join(" / ")}
        </div>
      )}

      {isExplored && <div style={{ fontSize: "0.72rem", color: "var(--aa-signal-teal)", marginBottom: "0.5rem" }}>探索済み</div>}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {isCurrent && !isExplored && (
          <button className="aa-button aa-button--primary" onClick={onExplore}>
            探索する
          </button>
        )}
        {!isCurrent && isDirectlyReachable && (
          <button className="aa-button" onClick={() => onTravel(node.id)}>
            移動する
          </button>
        )}
      </div>
    </div>
  );
}
