import type { BaseState, FacilityDefinition } from "@astral-archive/core";
import {
  getFacilityState,
  getNextLevelSpec,
  getCumulativeFacilityEffects,
  canAffordCost,
} from "@astral-archive/core";
import { getResourceMeta } from "../resourceMeta.js";

interface Props {
  definition: FacilityDefinition;
  baseState: BaseState;
  onUpgrade: (facilityId: string) => void;
}

export function FacilityCard({ definition, baseState, onUpgrade }: Props) {
  const state = getFacilityState(baseState, definition.id);
  const nextSpec = getNextLevelSpec(definition, state.level);
  const cumulativeEffects = getCumulativeFacilityEffects(definition, state.level);
  const isMaxed = !nextSpec;
  const affordable = nextSpec ? canAffordCost(baseState.resources, nextSpec.upgradeCost) : false;
  const isUnbuilt = state.level === 0;

  return (
    <div className="aa-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: "1.05rem" }}>{definition.name}</strong>
        <span className="aa-mono" style={{ fontSize: "0.75rem", color: "var(--aa-text-dim)" }}>
          Lv {state.level} / {definition.maxLevel}
        </span>
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--aa-text-dim)", margin: "0.4rem 0 0.6rem" }}>
        {definition.description}
      </p>

      {Object.keys(cumulativeEffects).length > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--aa-signal-teal)", marginBottom: "0.5rem" }}>
          現在の効果：
          {Object.entries(cumulativeEffects)
            .map(([key, value]) => `${key} +${value}`)
            .join(" / ")}
        </div>
      )}

      {nextSpec ? (
        <>
          <div style={{ fontSize: "0.78rem", color: "var(--aa-text-dim)", marginBottom: "0.4rem" }}>
            次のレベル（Lv{nextSpec.level}）：{nextSpec.effectDescription}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.6rem" }}>
            {Object.entries(nextSpec.upgradeCost).map(([resourceId, amount]) => {
              const meta = getResourceMeta(resourceId);
              const have = baseState.resources[resourceId] ?? 0;
              const enough = have >= (amount ?? 0);
              return (
                <span
                  key={resourceId}
                  className="aa-mono"
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.1rem 0.4rem",
                    border: `1px solid ${enough ? "var(--aa-line-bright)" : "var(--aa-signal-rose)"}`,
                    color: enough ? meta.color : "var(--aa-signal-rose)",
                    borderRadius: "2px",
                  }}
                >
                  {meta.name} {amount}
                </span>
              );
            })}
          </div>
          <button className="aa-button aa-button--primary" disabled={!affordable} onClick={() => onUpgrade(definition.id)}>
            {isUnbuilt ? "建造する" : "アップグレード"}
          </button>
        </>
      ) : (
        <div style={{ fontSize: "0.8rem", color: "var(--aa-signal-amber)" }}>最大レベルに到達済み</div>
      )}

      {isMaxed === false && !affordable && (
        <div style={{ fontSize: "0.7rem", color: "var(--aa-signal-rose)", marginTop: "0.4rem" }}>資源が不足しています</div>
      )}
    </div>
  );
}
