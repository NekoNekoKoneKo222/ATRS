import type { ActionKind, CombatantState, CombatConfig } from "@astral-archive/core";
import { getActionCost } from "@astral-archive/core";
import { characterDefsById, skillsById } from "../sampleData.js";

interface Props {
  actor: CombatantState | null;
  config: CombatConfig;
  onSelectAction: (kind: ActionKind, skillId?: string) => void;
}

interface ActionButtonSpec {
  key: string;
  label: string;
  kind: ActionKind;
  skillId?: string;
  cost: number;
  accent?: boolean;
}

export function ActionBar({ actor, config, onSelectAction }: Props) {
  if (!actor) {
    return (
      <div className="aa-panel" style={{ color: "var(--aa-text-dim)" }}>
        行動するキャラクターを選択してください。
      </div>
    );
  }

  const def = characterDefsById.get(actor.character.definitionId);

  const buttons: ActionButtonSpec[] = [
    { key: "attack", label: "通常攻撃", kind: "attack", cost: getActionCost(config.actionPoints, "attack"), accent: true },
  ];

  for (const skillId of def?.skillIds ?? []) {
    const skill = skillsById.get(skillId);
    if (!skill) continue;
    buttons.push({
      key: skillId,
      label: skill.name,
      kind: "skill",
      skillId,
      cost: skill.apCostOverride ?? getActionCost(config.actionPoints, "skill"),
    });
  }

  if (def?.ultimateSkillId) {
    const ultimate = skillsById.get(def.ultimateSkillId);
    if (ultimate) {
      const unlocked = actor.character.boost.level >= 3;
      buttons.push({
        key: def.ultimateSkillId,
        label: `${ultimate.name}${unlocked ? "" : "（BOOST不足）"}`,
        kind: "ultimate",
        skillId: def.ultimateSkillId,
        cost: ultimate.apCostOverride ?? getActionCost(config.actionPoints, "ultimate"),
      });
    }
  }

  buttons.push(
    { key: "defend", label: "防御", kind: "defend", cost: getActionCost(config.actionPoints, "defend") },
    { key: "item", label: "アイテム", kind: "item", cost: getActionCost(config.actionPoints, "item") },
    { key: "wait", label: "待機", kind: "wait", cost: getActionCost(config.actionPoints, "wait") }
  );

  return (
    <div className="aa-panel">
      <div style={{ marginBottom: "0.6rem", color: "var(--aa-text-dim)", fontSize: "0.85rem" }}>
        行動を選択：残りAP {actor.actionPointsRemaining}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {buttons.map((b) => {
          const isUltimateLocked = b.kind === "ultimate" && actor.character.boost.level < 3;
          const affordable = actor.actionPointsRemaining >= b.cost && !isUltimateLocked;
          return (
            <button
              key={b.key}
              className={`aa-button${b.accent ? " aa-button--primary" : ""}`}
              disabled={!affordable}
              onClick={() => onSelectAction(b.kind, b.skillId)}
            >
              {b.label}
              <span className="aa-mono" style={{ marginLeft: "0.4rem", color: "var(--aa-text-dim)", fontSize: "0.75rem" }}>
                AP{b.cost}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
