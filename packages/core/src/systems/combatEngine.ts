import type {
  CombatAction,
  CombatConfig,
  CombatState,
  CombatantState,
  CombatEnemyState,
} from "../types/combat.js";
import type { SkillDefinition } from "../types/equipment.js";
import { canAffordAction, spendActionPoints, refillActionPoints } from "./actionPointSystem.js";
import { calculateDamage } from "./attributeSystem.js";
import { increaseBoost, getBoostModifiers, consumeOverdrive } from "./boostSystem.js";
import {
  increaseInstability,
  getInstabilityTier,
  resolveInstabilityEffect,
  createRandomInstabilityRoll,
  type InstabilityEffectRoll,
} from "./instabilitySystem.js";

export interface CombatEngineDeps {
  config: CombatConfig;
  /** skillId からスキル定義を引く関数。指定があれば属性・威力倍率をスキルのものに上書きする。 */
  getSkillDefinition?: (skillId: string) => SkillDefinition | undefined;
  /**
   * INSTABILITY効果判定用の乱数ロールを生成する関数。
   * テストで固定値を注入したい場合に上書きする。未指定時はMath.random()を使用する。
   */
  getInstabilityRoll?: () => InstabilityEffectRoll;
}

/** 新しい戦闘を初期化する（AP全回復、BOOST/INSTABILITYは引き継ぎ） */
export function initializeCombat(
  combatants: CombatantState[],
  enemies: CombatEnemyState[],
  deps: CombatEngineDeps
): CombatState {
  for (const c of combatants) {
    c.actionPointsRemaining = refillActionPoints(deps.config.actionPoints);
  }
  return {
    turn: 1,
    combatants,
    enemies,
    log: [{ turn: 1, message: "戦闘開始" }],
    isBreached: false,
    isFinished: false,
  };
}

export type ActionResult =
  | { ok: true; damage?: number; breached?: boolean; blockedByInstability?: boolean }
  | { ok: false; reason: string };

/**
 * BREACHを発生させる。冪等（すでにBREACH済みなら何もしない）ため、
 * 複数キャラクターが同時にBREACH条件を満たしても効果は一度だけ適用される。
 * 生存中の星異体を「暴走状態」へ移行させ、攻撃力・防御力を引き上げる。
 */
export function triggerBreach(combatState: CombatState, deps: CombatEngineDeps): CombatState {
  if (combatState.isBreached) return combatState;

  combatState.isBreached = true;
  for (const enemy of getAliveEnemies(combatState)) {
    enemy.runtime.currentStats.attack = Math.round(
      enemy.runtime.currentStats.attack * deps.config.breachEnemyBuffMultiplier
    );
    enemy.runtime.currentStats.defense = Math.round(
      enemy.runtime.currentStats.defense * deps.config.breachEnemyBuffMultiplier
    );
  }

  combatState.log.push({
    turn: combatState.turn,
    message: "BREACH発生！ 収容中の星異体が暴走状態へ移行し、危険度が急上昇した。",
  });

  return combatState;
}

/**
 * 1つの行動を解決する。副作用としてcombatStateを直接更新する
 * （呼び出し側でイミュータブルにしたい場合は事前にディープコピーする）。
 */
export function resolveAction(
  combatState: CombatState,
  action: CombatAction,
  deps: CombatEngineDeps
): ActionResult {
  const actor = combatState.combatants.find(
    (c) => c.character.instanceId === action.actorId
  );
  if (!actor) return { ok: false, reason: "actor_not_found" };
  if (actor.isDefeated) return { ok: false, reason: "actor_defeated" };

  if (!canAffordAction(deps.config.actionPoints, actor.actionPointsRemaining, action)) {
    return { ok: false, reason: "insufficient_action_points" };
  }

  actor.actionPointsRemaining = spendActionPoints(
    deps.config.actionPoints,
    actor.actionPointsRemaining,
    action
  );

  switch (action.kind) {
    case "defend": {
      actor.isDefending = true;
      combatState.log.push({ turn: combatState.turn, message: `${actor.character.instanceId} は防御した` });
      return { ok: true };
    }
    case "wait": {
      combatState.log.push({ turn: combatState.turn, message: `${actor.character.instanceId} は待機した` });
      return { ok: true };
    }
    case "attack":
    case "skill":
    case "ultimate": {
      const target = combatState.enemies.find((e) => e.anomalyId === action.targetIds[0]);
      if (!target) return { ok: false, reason: "target_not_found" };
      if (target.isDefeated) return { ok: false, reason: "target_already_defeated" };

      const boostMods = getBoostModifiers(actor.character.boost.level);
      const skillDef = action.skillId ? deps.getSkillDefinition?.(action.skillId) : undefined;
      let effectiveAttribute = skillDef?.attributeId ?? actor.character.attackAttributeId;
      const powerMultiplier = skillDef?.powerMultiplier ?? 1.0;

      // 未知エネルギーを使用する行動は、成否にかかわらずBOOSTゲージとINSTABILITYを変動させる。
      actor.character.boost = increaseBoost(
        actor.character.boost,
        deps.config.boostGaugePerAction,
        deps.config
      );

      if (action.kind === "ultimate" && actor.character.boost.level >= 4) {
        actor.character.boost = consumeOverdrive(actor.character.boost);
      }

      const { state: newInstability, breached } = increaseInstability(
        actor.character.instability,
        deps.config.instabilityPerBoostUse,
        deps.config
      );
      actor.character.instability = newInstability;

      // INSTABILITYの段階に応じて、行動そのものの失敗・攻撃属性の変質・威力低下が起こりうる。
      const tier = getInstabilityTier(actor.character.instability.value);
      const roll = deps.getInstabilityRoll ? deps.getInstabilityRoll() : createRandomInstabilityRoll();
      const instabilityEffect = resolveInstabilityEffect(tier, roll);

      if (instabilityEffect.actionBlocked) {
        combatState.log.push({
          turn: combatState.turn,
          message: `${actor.character.instanceId} は不安定化の影響で行動に失敗した！（不安定度: ${tier}）`,
        });

        if (breached) {
          triggerBreach(combatState, deps);
        }

        return { ok: true, damage: 0, breached, blockedByInstability: true };
      }

      if (instabilityEffect.attributeOverride) {
        effectiveAttribute = instabilityEffect.attributeOverride;
      }

      // 攻撃属性に対する倍率は「対象個体が持つその属性への耐性値」のみで決まる。
      // 属性同士の固定相性（じゃんけん）は一切参照しない。
      const { damage, multiplierApplied } = calculateDamage({
        attackerAttack: actor.character.currentStats.attack,
        attackerAttribute: effectiveAttribute,
        defenderDefense: target.runtime.currentStats.defense,
        defenderAffinity: target.runtime.affinity,
        attributeDamageMultiplier:
          boostMods.attributeDamageMultiplier * powerMultiplier * instabilityEffect.attackMultiplier,
        isCritical: false,
        criticalMultiplier: 1.5,
        variance: 0.1,
      });

      target.runtime.currentStats.hp = Math.max(0, target.runtime.currentStats.hp - damage);
      if (target.runtime.currentStats.hp <= 0) target.isDefeated = true;

      const actionLabel = action.kind === "attack" ? "通常攻撃" : action.kind === "skill" ? "スキル" : "特殊技";
      const effectivenessNote =
        multiplierApplied >= 1.15 ? "（弱点を突いた）" : multiplierApplied <= 0.85 ? "（耐性で軽減）" : "";
      const mutateNote = instabilityEffect.attributeOverride ? "（属性が変質した！）" : "";
      combatState.log.push({
        turn: combatState.turn,
        message: `${actor.character.instanceId} の${actionLabel}(${effectiveAttribute})！ ${target.anomalyId}に${damage}ダメージ${effectivenessNote}${mutateNote}`,
        data: { damage, targetId: target.anomalyId, multiplierApplied },
      });

      if (target.isDefeated) {
        combatState.log.push({ turn: combatState.turn, message: `${target.anomalyId} を撃破/収容した` });
      }

      if (breached) {
        triggerBreach(combatState, deps);
      }

      return { ok: true, damage, breached };
    }
    case "item": {
      const targetAlly = combatState.combatants.find(
        (c) => c.character.instanceId === action.targetIds[0]
      );
      if (!targetAlly) return { ok: false, reason: "target_not_found" };
      if (targetAlly.isDefeated) return { ok: false, reason: "target_already_defeated" };

      const healed = Math.min(
        targetAlly.character.currentStats.maxHp - targetAlly.character.currentStats.hp,
        deps.config.itemHealAmount
      );
      targetAlly.character.currentStats.hp += healed;

      combatState.log.push({
        turn: combatState.turn,
        message: `${actor.character.instanceId} がアイテムを使用。${targetAlly.character.instanceId}のHPが${healed}回復`,
        data: { healed, targetId: targetAlly.character.instanceId },
      });

      return { ok: true, damage: -healed };
    }
    default:
      return { ok: false, reason: "not_implemented" };
  }
}

/** 生存している味方一覧 */
export function getAliveCombatants(combatState: CombatState): CombatantState[] {
  return combatState.combatants.filter((c) => !c.isDefeated);
}

/** 生存している敵一覧 */
export function getAliveEnemies(combatState: CombatState): CombatEnemyState[] {
  return combatState.enemies.filter((e) => !e.isDefeated);
}

/** 全ての味方のAPが尽きているか（プレイヤーフェーズ終了の目安） */
export function isPlayerPhaseExhausted(combatState: CombatState): boolean {
  return getAliveCombatants(combatState).every((c) => c.actionPointsRemaining <= 0);
}

/**
 * 敵フェーズを解決する。
 * 簡易AI: 生存している敵それぞれが、生存しているランダムな味方1体を攻撃する。
 * 対象が防御中の場合はダメージを defendDamageMultiplier 分軽減する。
 */
export function resolveEnemyPhase(
  combatState: CombatState,
  deps: CombatEngineDeps
): CombatState {
  const aliveEnemies = getAliveEnemies(combatState);

  for (const enemy of aliveEnemies) {
    const aliveTargets = getAliveCombatants(combatState);
    if (aliveTargets.length === 0) break;

    const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)]!;

    const { damage: rawDamage, multiplierApplied } = calculateDamage({
      attackerAttack: enemy.runtime.currentStats.attack,
      attackerAttribute: enemy.runtime.attackAttributeId,
      defenderDefense: target.character.currentStats.defense,
      defenderAffinity: target.character.affinity,
      attributeDamageMultiplier: 1.0,
      isCritical: false,
      criticalMultiplier: 1.5,
      variance: 0.15,
    });

    const damage = target.isDefending
      ? Math.max(1, Math.round(rawDamage * deps.config.defendDamageMultiplier))
      : rawDamage;

    target.character.currentStats.hp = Math.max(0, target.character.currentStats.hp - damage);
    if (target.character.currentStats.hp <= 0) target.isDefeated = true;

    const effectivenessNote =
      multiplierApplied >= 1.15 ? "（弱点を突かれた）" : multiplierApplied <= 0.85 ? "（耐性で軽減）" : "";
    combatState.log.push({
      turn: combatState.turn,
      message: `${enemy.anomalyId} の攻撃(${enemy.runtime.attackAttributeId})！ ${target.character.instanceId}に${damage}ダメージ${
        target.isDefending ? "（防御中）" : ""
      }${effectivenessNote}`,
      data: { damage, targetId: target.character.instanceId },
    });

    if (target.isDefeated) {
      combatState.log.push({ turn: combatState.turn, message: `${target.character.instanceId} は戦闘不能になった` });
    }
  }

  return combatState;
}

/** 全滅判定＋勝敗確定 */
export function checkCombatEnd(combatState: CombatState): CombatState {
  const allEnemiesDefeated = combatState.enemies.every((e) => e.isDefeated);
  const allPlayersDefeated = combatState.combatants.every((c) => c.isDefeated);

  if (allEnemiesDefeated) {
    combatState.isFinished = true;
    combatState.winner = "player";
  } else if (allPlayersDefeated) {
    combatState.isFinished = true;
    combatState.winner = "enemy";
  }
  return combatState;
}

/** ターンを進める（AP回復、防御フラグ解除） */
export function advanceTurn(combatState: CombatState, deps: CombatEngineDeps): CombatState {
  combatState.turn += 1;
  for (const c of combatState.combatants) {
    c.actionPointsRemaining = refillActionPoints(deps.config.actionPoints);
    c.isDefending = false;
  }
  combatState.log.push({ turn: combatState.turn, message: `ターン${combatState.turn}開始` });
  return combatState;
}
