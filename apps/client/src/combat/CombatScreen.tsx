import { useState } from "react";
import type { ActionKind } from "@astral-archive/core";
import { useCombat } from "./useCombat.js";
import { actionRequiresTarget, ACTION_LABELS } from "./types.js";
import { PartyRoster } from "./components/PartyRoster.js";
import { EnemyField } from "./components/EnemyField.js";
import { ActionBar } from "./components/ActionBar.js";
import { CombatLog } from "./components/CombatLog.js";
import { combatConfig } from "./sampleData.js";

interface Props {
  onEnemyDefeated?: (anomalyId: string) => void;
}

export function CombatScreen({ onEnemyDefeated }: Props) {
  const {
    combatState,
    phase,
    pendingAction,
    selectAction,
    chooseTarget,
    cancelPendingAction,
    endPlayerPhase,
    proceedToNextTurn,
    resetBattle,
  } = useCombat(onEnemyDefeated ? { onEnemyDefeated } : {});

  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);

  const selectedActor = combatState.combatants.find((c) => c.character.instanceId === selectedActorId) ?? null;

  const selectableActorIds =
    phase === "player" && !pendingAction
      ? combatState.combatants
          .filter((c) => !c.isDefeated && c.actionPointsRemaining > 0)
          .map((c) => c.character.instanceId)
      : [];

  function handleSelectActor(id: string) {
    setSelectedActorId(id);
  }

  function handleSelectAction(kind: ActionKind, skillId?: string) {
    if (!selectedActorId) return;
    selectAction(selectedActorId, kind, skillId);
    if (!actionRequiresTarget(kind).requires) {
      setSelectedActorId(null);
    }
  }

  function handleChooseTarget(targetId: string) {
    chooseTarget(targetId);
    setSelectedActorId(null);
  }

  function handleCancelPending() {
    cancelPendingAction();
  }

  const isTargetingEnemy = pendingAction?.targetSide === "enemy";
  const isTargetingAlly = pendingAction?.targetSide === "ally";

  return (
    <div style={{ minHeight: "100vh", padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>
          ASTRAL ARCHIVE <span style={{ color: "var(--aa-text-dim)", fontSize: "0.55em", fontWeight: 500 }}>(working title)</span>
        </h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 4 — ターン {combatState.turn} ／ フェーズ：
          {phase === "player" ? "プレイヤー" : phase === "enemy" ? "星異体" : "決着"}
          {combatState.isBreached ? "（BREACH中）" : ""}
        </p>
      </header>

      {combatState.isBreached && (
        <div className="aa-breach-banner" style={{ marginBottom: "1rem" }}>
          ⚠ BREACH発生：収容中の星異体が暴走状態へ移行した。戦況が悪化している。
        </div>
      )}

      <section style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", color: "var(--aa-text-dim)", marginBottom: "0.5rem" }}>星異体</h2>
        <EnemyField
          enemies={combatState.enemies}
          isTargetable={isTargetingEnemy}
          onSelectAsTarget={handleChooseTarget}
          isBreachCombat={combatState.isBreached}
        />
      </section>

      <section style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", color: "var(--aa-text-dim)", marginBottom: "0.5rem" }}>編成</h2>
        <PartyRoster
          combatants={combatState.combatants}
          selectedActorId={selectedActorId}
          selectableActorIds={selectableActorIds}
          onSelectActor={handleSelectActor}
          isTargetable={isTargetingAlly}
          onSelectAsTarget={handleChooseTarget}
        />
      </section>

      {phase === "player" && (
        <section style={{ marginBottom: "1rem" }}>
          {pendingAction ? (
            <div className="aa-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                {ACTION_LABELS[pendingAction.kind]} の対象を{pendingAction.targetSide === "enemy" ? "星異体" : "編成"}から選択してください。
              </span>
              <button className="aa-button" onClick={handleCancelPending}>
                キャンセル
              </button>
            </div>
          ) : (
            <ActionBar actor={selectedActor} config={combatConfig} onSelectAction={handleSelectAction} />
          )}
        </section>
      )}

      <section style={{ marginBottom: "1.2rem", display: "flex", gap: "0.6rem" }}>
        {phase === "player" && (
          <button className="aa-button aa-button--primary" onClick={endPlayerPhase}>
            ターン終了（星異体フェーズへ）
          </button>
        )}
        {phase === "enemy" && (
          <button className="aa-button aa-button--primary" onClick={proceedToNextTurn}>
            次のターンへ
          </button>
        )}
        {phase === "result" && (
          <>
            <span style={{ alignSelf: "center", color: "var(--aa-signal-amber)" }}>
              決着：{combatState.winner === "player" ? "プレイヤー勝利" : "全滅"}
            </span>
            <button className="aa-button" onClick={resetBattle}>
              もう一度
            </button>
          </>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: "1rem", color: "var(--aa-text-dim)", marginBottom: "0.5rem" }}>戦闘ログ</h2>
        <CombatLog log={combatState.log} />
      </section>
    </div>
  );
}
