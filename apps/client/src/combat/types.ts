import type { ActionKind } from "@astral-archive/core";

export type CombatPhase = "player" | "enemy" | "result";

/** UI上で「行動選択中」の状態。ターゲットが必要な行動を選ぶと次にターゲット選択へ進む */
export interface PendingAction {
  actorId: string;
  kind: ActionKind;
  skillId?: string;
  requiresTarget: boolean;
  targetSide: "enemy" | "ally" | "none";
}

export function actionRequiresTarget(kind: ActionKind): { requires: boolean; side: "enemy" | "ally" | "none" } {
  switch (kind) {
    case "attack":
    case "skill":
    case "ultimate":
      return { requires: true, side: "enemy" };
    case "item":
      return { requires: true, side: "ally" };
    case "defend":
    case "wait":
      return { requires: false, side: "none" };
  }
}

export const ACTION_LABELS: Record<ActionKind, string> = {
  attack: "通常攻撃",
  defend: "防御",
  skill: "スキル",
  ultimate: "特殊技",
  item: "アイテム",
  wait: "待機",
};
