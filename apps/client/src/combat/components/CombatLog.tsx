import type { CombatLogEntry } from "@astral-archive/core";

interface Props {
  log: CombatLogEntry[];
}

export function CombatLog({ log }: Props) {
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
            <span style={{ color: "var(--aa-signal-teal)" }}>[T{entry.turn}]</span> {entry.message}
          </div>
        ))}
    </div>
  );
}
