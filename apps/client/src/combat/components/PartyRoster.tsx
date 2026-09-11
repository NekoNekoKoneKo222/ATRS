import type { CombatantState } from "@astral-archive/core";
import { displayNames } from "../sampleData.js";
import { AttributeBadge, ResistanceRow } from "./AttributeDisplay.js";
import { BoostGauge, InstabilityGauge } from "./StatusGauges.js";

interface Props {
  combatants: CombatantState[];
  selectedActorId: string | null;
  selectableActorIds: string[];
  onSelectActor: (id: string) => void;
  isTargetable: boolean;
  onSelectAsTarget: (id: string) => void;
}

export function PartyRoster({
  combatants,
  selectedActorId,
  selectableActorIds,
  onSelectActor,
  isTargetable,
  onSelectAsTarget,
}: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
      {combatants.map((c) => {
        const id = c.character.instanceId;
        const name = displayNames[id] ?? id;
        const hpPct = Math.round((c.character.currentStats.hp / c.character.currentStats.maxHp) * 100);
        const isSelected = selectedActorId === id;
        const isSelectable = selectableActorIds.includes(id) && !c.isDefeated;
        const clickable = isTargetable ? !c.isDefeated : isSelectable;

        return (
          <button
            key={id}
            className="aa-panel"
            onClick={() => (isTargetable ? onSelectAsTarget(id) : isSelectable && onSelectActor(id))}
            disabled={!clickable}
            style={{
              textAlign: "left",
              cursor: clickable ? "pointer" : "default",
              borderColor: isSelected ? "var(--aa-signal-amber)" : undefined,
              opacity: c.isDefeated ? 0.4 : 1,
              font: "inherit",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontSize: "1.05rem" }}>{name}</strong>
              <span className="aa-mono" style={{ fontSize: "0.75rem", color: "var(--aa-text-dim)" }}>
                AP {c.actionPointsRemaining}
              </span>
            </div>
            <div style={{ margin: "0.3rem 0" }}>
              <AttributeBadge attributeId={c.character.attackAttributeId} />
            </div>

            <div className="aa-mono" style={{ fontSize: "0.75rem", margin: "0.4rem 0 0.15rem" }}>
              HP {c.character.currentStats.hp}/{c.character.currentStats.maxHp}
            </div>
            <div className="aa-bar-track">
              <div
                className="aa-bar-fill"
                style={{
                  width: `${hpPct}%`,
                  background: hpPct > 40 ? "var(--aa-signal-teal)" : "var(--aa-signal-rose)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", gap: "0.6rem" }}>
              <div style={{ flex: 1 }}>
                <BoostGauge boost={c.character.boost} />
              </div>
            </div>
            <div style={{ marginTop: "0.4rem" }}>
              <InstabilityGauge instability={c.character.instability} />
            </div>
            <ResistanceRow affinity={c.character.affinity} />
            {c.isDefending && (
              <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", color: "var(--aa-signal-teal)" }}>防御中</div>
            )}
            {c.isDefeated && (
              <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", color: "var(--aa-signal-rose)" }}>戦闘不能</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
