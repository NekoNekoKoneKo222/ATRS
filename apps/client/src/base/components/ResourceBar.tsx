import type { ResourcePool } from "@astral-archive/core";
import { ALL_RESOURCE_IDS, getResourceMeta } from "../resourceMeta.js";

interface Props {
  resources: ResourcePool;
}

export function ResourceBar({ resources }: Props) {
  return (
    <div className="aa-panel" style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem" }}>
      {ALL_RESOURCE_IDS.map((id) => {
        const meta = getResourceMeta(id);
        const value = resources[id] ?? 0;
        return (
          <div key={id} style={{ display: "flex", flexDirection: "column", minWidth: "110px" }}>
            <span className="aa-mono" style={{ fontSize: "0.7rem", color: "var(--aa-text-dim)" }}>
              {meta.name}
            </span>
            <span className="aa-mono" style={{ fontSize: "1.2rem", color: meta.color }}>
              {value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
