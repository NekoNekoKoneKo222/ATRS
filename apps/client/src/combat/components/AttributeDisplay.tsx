import { getAttributeMeta, ALL_ATTRIBUTE_IDS } from "../attributeMeta.js";

interface BadgeProps {
  attributeId: string;
}

/** 攻撃属性を示す小さなバッジ */
export function AttributeBadge({ attributeId }: BadgeProps) {
  const meta = getAttributeMeta(attributeId);
  return (
    <span
      className="aa-mono"
      style={{
        display: "inline-block",
        border: `1px solid ${meta.color}`,
        color: meta.color,
        borderRadius: "2px",
        padding: "0.05rem 0.4rem",
        fontSize: "0.7rem",
      }}
    >
      {meta.name}
    </span>
  );
}

interface ResistanceRowProps {
  affinity: Record<string, number>;
}

/** 6属性それぞれの耐性値(%)を一覧表示する。正=耐性(軽減)、負=弱点(増加)。 */
export function ResistanceRow({ affinity }: ResistanceRowProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.4rem" }}>
      {ALL_ATTRIBUTE_IDS.map((id) => {
        const value = affinity[id] ?? 0;
        const meta = getAttributeMeta(id);
        const isWeak = value < 0;
        const isResist = value > 0;
        const label = value > 0 ? `+${value}%` : `${value}%`;
        return (
          <span
            key={id}
            className="aa-mono"
            title={`${meta.name}: ${label}${isWeak ? "（弱点）" : isResist ? "（耐性）" : ""}`}
            style={{
              fontSize: "0.65rem",
              padding: "0.05rem 0.3rem",
              borderRadius: "2px",
              border: `1px solid ${isWeak ? "var(--aa-signal-rose)" : isResist ? "var(--aa-signal-teal)" : "var(--aa-line)"}`,
              color: isWeak ? "var(--aa-signal-rose)" : isResist ? "var(--aa-signal-teal)" : "var(--aa-text-dim)",
            }}
          >
            {meta.name} {label}
          </span>
        );
      })}
    </div>
  );
}
