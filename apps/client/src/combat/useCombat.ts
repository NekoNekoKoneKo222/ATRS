import { useCallback, useMemo, useState } from "react";
import {
  resolveAction,
  resolveEnemyPhase,
  checkCombatEnd,
  advanceTurn,
  isPlayerPhaseExhausted,
  type ActionKind,
  type CombatState,
} from "@astral-archive/core";
import { combatConfig, getSkillDefinition, createSampleCombat } from "./sampleData.js";
import { actionRequiresTarget, type CombatPhase, type PendingAction } from "./types.js";

interface UseCombatOptions {
  /** 星異体（敵）を撃破したときに呼ばれるコールバック。収容システムへの連携に使う。 */
  onEnemyDefeated?: (anomalyId: string) => void;
}

export function useCombat(options: UseCombatOptions = {}) {
  const [combatState, setCombatState] = useState<CombatState>(() => createSampleCombat());
  const [phase, setPhase] = useState<CombatPhase>("player");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const deps = useMemo(() => ({ config: combatConfig, getSkillDefinition }), []);

  const selectAction = useCallback((actorId: string, kind: ActionKind, skillId?: string) => {
    const { requires, side } = actionRequiresTarget(kind);
    if (!requires) {
      applyAction({ actorId, kind, targetIds: [], ...(skillId ? { skillId } : {}) });
      return;
    }
    setPendingAction({ actorId, kind, requiresTarget: true, targetSide: side, ...(skillId ? { skillId } : {}) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyAction(action: { actorId: string; kind: ActionKind; targetIds: string[]; skillId?: string }) {
    setCombatState((prev) => {
      const next = structuredClone(prev);
      resolveAction(next, action, deps);
      checkCombatEnd(next);

      // 新たに撃破された星異体があれば、収容システムへ通知する
      for (const enemy of next.enemies) {
        const wasDefeated = prev.enemies.find((e) => e.anomalyId === enemy.anomalyId)?.isDefeated ?? false;
        if (enemy.isDefeated && !wasDefeated) {
          options.onEnemyDefeated?.(enemy.anomalyId);
        }
      }

      return next;
    });
    setPendingAction(null);
  }

  const chooseTarget = useCallback(
    (targetId: string) => {
      if (!pendingAction) return;
      applyAction({
        actorId: pendingAction.actorId,
        kind: pendingAction.kind,
        targetIds: [targetId],
        ...(pendingAction.skillId ? { skillId: pendingAction.skillId } : {}),
      });
    },
    [pendingAction] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const cancelPendingAction = useCallback(() => setPendingAction(null), []);

  const endPlayerPhase = useCallback(() => {
    setPhase("enemy");
    setCombatState((prev) => {
      const next = structuredClone(prev);
      resolveEnemyPhase(next, deps);
      checkCombatEnd(next);
      return next;
    });
  }, [deps]);

  const proceedToNextTurn = useCallback(() => {
    setCombatState((prev) => {
      const next = structuredClone(prev);
      advanceTurn(next, deps);
      return next;
    });
    setPhase("player");
  }, [deps]);

  const resetBattle = useCallback(() => {
    setCombatState(createSampleCombat());
    setPhase("player");
    setPendingAction(null);
  }, []);

  const effectivePhase: CombatPhase = combatState.isFinished ? "result" : phase;
  const canEndPlayerPhase = phase === "player" && !combatState.isFinished;
  const allApExhausted = isPlayerPhaseExhausted(combatState);

  return {
    combatState,
    phase: effectivePhase,
    pendingAction,
    selectAction,
    chooseTarget,
    cancelPendingAction,
    endPlayerPhase,
    proceedToNextTurn,
    resetBattle,
    canEndPlayerPhase,
    allApExhausted,
  };
}
