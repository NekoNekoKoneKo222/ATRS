import type { CharacterRuntime } from "./character.js";
import type { AnomalyDefinition } from "./anomaly.js";

export type ActionKind =
  | "attack"
  | "defend"
  | "skill"
  | "ultimate"
  | "item"
  | "wait";

/** 行動ポイントコスト設定。バランス調整用に設定ファイルへ分離する。 */
export interface ActionPointConfig {
  maxActionPoints: number;
  costs: Record<ActionKind, number>;
  /** スキルごとに個別コストを上書きしたい場合 */
  skillCostOverrides: Record<string, number>;
}

export interface CombatAction {
  actorId: string;
  kind: ActionKind;
  targetIds: string[];
  skillId?: string;
  itemId?: string;
}

export type CombatSide = "player" | "enemy";

export interface CombatantState {
  side: CombatSide;
  character: CharacterRuntime;
  actionPointsRemaining: number;
  isDefending: boolean;
  isDefeated: boolean;
}

export interface CombatEnemyState {
  side: "enemy";
  anomalyId: string;
  runtime: CharacterRuntime;
  isDefeated: boolean;
}

export type BreachTrigger = "instabilityMax" | "scripted" | "manual";

export interface CombatLogEntry {
  turn: number;
  message: string;
  data?: Record<string, unknown>;
}

export interface CombatState {
  turn: number;
  combatants: CombatantState[];
  enemies: CombatEnemyState[];
  log: CombatLogEntry[];
  isBreached: boolean;
  isFinished: boolean;
  winner?: CombatSide;
}

export interface CombatConfig {
  actionPoints: ActionPointConfig;
  boostGaugePerAction: number;
  boostGaugeMax: number;
  instabilityPerBoostUse: number;
  breachThreshold: number;
  /** 防御中に受けるダメージの倍率（例: 0.5 = 半減） */
  defendDamageMultiplier: number;
  /** アイテム「回復薬」使用時の暫定回復量（Phase5でアイテムデータ化予定） */
  itemHealAmount: number;
  /** BREACH発生時、戦場の星異体（生存中の敵）の攻撃力・防御力に掛かる倍率 */
  breachEnemyBuffMultiplier: number;
}
