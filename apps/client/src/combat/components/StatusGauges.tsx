import { getBoostModifiers, getInstabilityTier, type BoostState, type InstabilityState } from "@astral-archive/core";

const INSTABILITY_TIER_COLOR: Record<string, string> = {
  stable: "var(--aa-signal-teal)",
  unstable: "var(--aa-signal-amber)",
  critical: "#e0703f",
  breach: "var(--aa-signal-rose)",
};

const INSTABILITY_TIER_LABEL: Record<string, string> = {
  stable: "安定",
  unstable: "不安定",
  critical: "危険",
  breach: "BREACH",
};

interface BoostGaugeProps {
  boost: BoostState;
}

/** BOOSTレベル(0-4)を4分割セグメントで表示するゲージ */
export function BoostGauge({ boost }: BoostGaugeProps) {
  const mods = getBoostModifiers(boost.level);
  const segments = [0, 1, 2, 3];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--aa-text-dim)", marginBottom: "0.2rem" }}>
        <span>BOOST Lv{boost.level}{mods.ultimateUnlocked ? "（特殊技解禁）" : ""}</span>
      </div>
      <div style={{ display: "flex", gap: "2px" }}>
        {segments.map((seg) => {
          const filled = boost.level > seg || (boost.level === seg + 1);
          const isCurrentPartial = boost.level === seg && boost.level < 4;
          const fillPct = isCurrentPartial ? Math.round(boost.gauge) : filled ? 100 : 0;
          return (
            <div key={seg} className="aa-bar-track" style={{ flex: 1 }}>
              <div
                className="aa-bar-fill"
                style={{
                  width: `${boost.level > seg ? 100 : fillPct}%`,
                  background: boost.level >= 4 ? "var(--aa-signal-amber)" : "var(--aa-signal-teal)",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface InstabilityGaugeProps {
  instability: InstabilityState;
}

/** INSTABILITYを段階（安定/不安定/危険/BREACH）とともに表示するゲージ */
export function InstabilityGauge({ instability }: InstabilityGaugeProps) {
  const tier = getInstabilityTier(instability.value);
  const color = INSTABILITY_TIER_COLOR[tier] ?? "var(--aa-text-dim)";
  const label = INSTABILITY_TIER_LABEL[tier] ?? tier;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color, marginBottom: "0.2rem" }}>
        <span>不安定度 {instability.value}%</span>
        <span>{label}</span>
      </div>
      <div className="aa-bar-track">
        <div
          className="aa-bar-fill"
          style={{
            width: `${instability.value}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
