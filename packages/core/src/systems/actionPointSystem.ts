import type { ActionKind, ActionPointConfig, CombatAction } from "../types/combat.js";

export function getActionCost(
  config: ActionPointConfig,
  kind: ActionKind,
  skillId?: string
): number {
  if (kind === "skill" && skillId && config.skillCostOverrides[skillId] !== undefined) {
    return config.skillCostOverrides[skillId];
  }
  return config.costs[kind];
}

export function canAffordAction(
  config: ActionPointConfig,
  actionPointsRemaining: number,
  action: CombatAction
): boolean {
  const cost = getActionCost(config, action.kind, action.skillId);
  return actionPointsRemaining >= cost;
}

export function spendActionPoints(
  config: ActionPointConfig,
  actionPointsRemaining: number,
  action: CombatAction
): number {
  const cost = getActionCost(config, action.kind, action.skillId);
  return Math.max(0, actionPointsRemaining - cost);
}

export function refillActionPoints(config: ActionPointConfig): number {
  return config.maxActionPoints;
}
