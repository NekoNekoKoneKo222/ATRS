import type { ExplorationLogEntry } from "@astral-archive/core";

interface Props {
  log: ExplorationLogEntry[];
}

export function ExplorationLog({ log }: Props) {
  return (
    <div
      className="aa-panel aa-mono"
      style={{ fontSize: "0.82rem", lineHeight: 1.7, maxHeight: "12rem", overflowY: "auto" }}
    >
      {log
        .slice(-12)
        .reverse()
        .map((entry, i) => (
          <div key={i} style={{ color: i === 0 ? "var(--aa-text)" : "var(--aa-text-dim)" }}>
            {entry.message}
          </div>
        ))}
    </div>
  );
}
