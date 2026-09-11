import type { CombatEnemyState } from "@astral-archive/core";
import { displayNames } from "../sampleData.js";
import { AttributeBadge, ResistanceRow } from "./AttributeDisplay.js";

interface Props {
  enemies: CombatEnemyState[];
  isTargetable: boolean;
  onSelectAsTarget: (id: string) => void;
  isBreachCombat?: boolean;
}

export function EnemyField({ enemies, isTargetable, onSelectAsTarget, isBreachCombat = false }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
      {enemies.map((e) => {
        const name = displayNames[e.anomalyId] ?? e.anomalyId;
        const hpPct = Math.round((e.runtime.currentStats.hp / e.runtime.currentStats.maxHp) * 100);
        const clickable = isTargetable && !e.isDefeated;
        const showBreachStyle = isBreachCombat && !e.isDefeated;

        return (
          <button
            key={e.anomalyId}
            className={`aa-panel aa-panel--enemy${showBreachStyle ? " aa-panel--breach" : ""}`}
            onClick={() => clickable && onSelectAsTarget(e.anomalyId)}
            disabled={!clickable}
            style={{
              textAlign: "left",
              cursor: clickable ? "crosshair" : "default",
              opacity: e.isDefeated ? 0.35 : 1,
              font: "inherit",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontSize: "1.05rem" }}>{name}</strong>
              <span className="aa-mono" style={{ fontSize: "0.7rem", color: "var(--aa-text-dim)" }}>{e.anomalyId}</span>
            </div>
            {showBreachStyle && (
              <div style={{ fontSize: "0.7rem", color: "var(--aa-signal-rose)", margin: "0.1rem 0 0.2rem" }}>暴走中</div>
            )}
            <div style={{ margin: "0.3rem 0" }}>
              <AttributeBadge attributeId={e.runtime.attackAttributeId} />
            </div>
            <div className="aa-mono" style={{ fontSize: "0.75rem", margin: "0.4rem 0 0.15rem" }}>
              HP {e.runtime.currentStats.hp}/{e.runtime.currentStats.maxHp}
            </div>
            <div className="aa-bar-track">
              <div className="aa-bar-fill" style={{ width: `${hpPct}%`, background: "var(--aa-signal-rose)" }} />
            </div>
            <ResistanceRow affinity={e.runtime.affinity} />
            {e.isDefeated && (
              <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", color: "var(--aa-text-dim)" }}>収容/撃破済み</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
