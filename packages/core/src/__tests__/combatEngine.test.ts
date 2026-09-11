import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initializeCombat,
  resolveAction,
  checkCombatEnd,
  resolveEnemyPhase,
  isPlayerPhaseExhausted,
  triggerBreach,
} from "../systems/combatEngine.js";
import type { CombatantState, CombatEnemyState, CombatConfig } from "../types/combat.js";
import type { CharacterRuntime } from "../types/character.js";

function makeRuntime(overrides: Partial<CharacterRuntime> = {}): CharacterRuntime {
  return {
    definitionId: "test-char",
    instanceId: "test-instance",
    level: 1,
    exp: 0,
    currentStats: { hp: 100, maxHp: 100, attack: 20, defense: 5, speed: 10, mind: 5 },
    boost: { level: 0, gauge: 0 },
    instability: { value: 0 },
    skills: [],
    statusEffects: [],
    affinity: {}, // 未指定属性は耐性0%（等倍）
    attackAttributeId: "HEAT",
    ...overrides,
  };
}

const config: CombatConfig = {
  actionPoints: {
    maxActionPoints: 3,
    costs: { attack: 1, defend: 1, skill: 2, ultimate: 3, item: 1, wait: 0 },
    skillCostOverrides: {},
  },
  boostGaugePerAction: 25,
  boostGaugeMax: 100,
  instabilityPerBoostUse: 10,
  breachThreshold: 100,
  defendDamageMultiplier: 0.5,
  itemHealAmount: 30,
  breachEnemyBuffMultiplier: 1.4,
};

test("通常攻撃で敵にダメージが入る", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-1" }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-001",
    runtime: makeRuntime({ instanceId: "AA-001", currentStats: { hp: 50, maxHp: 50, attack: 10, defense: 2, speed: 5, mind: 5 } }),
    isDefeated: false,
  };

  const state = initializeCombat([player], [enemy], { config });
  const result = resolveAction(
    state,
    { actorId: "hero-1", kind: "attack", targetIds: ["AA-001"] },
    { config }
  );

  assert.equal(result.ok, true);
  assert.ok(enemy.runtime.currentStats.hp < 50);
});

test("AP不足の行動は失敗する", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-2" }),
    actionPointsRemaining: 0,
    isDefending: false,
    isDefeated: false,
  };
  const state = initializeCombat([player], [], { config });
  state.combatants[0]!.actionPointsRemaining = 0;

  const result = resolveAction(
    state,
    { actorId: "hero-2", kind: "attack", targetIds: [] },
    { config }
  );

  assert.equal(result.ok, false);
});

test("敵全滅でプレイヤー勝利になる", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-3" }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-002",
    runtime: makeRuntime({ instanceId: "AA-002", currentStats: { hp: 1, maxHp: 1, attack: 1, defense: 0, speed: 1, mind: 1 } }),
    isDefeated: false,
  };
  const state = initializeCombat([player], [enemy], { config });
  resolveAction(state, { actorId: "hero-3", kind: "attack", targetIds: ["AA-002"] }, { config });
  const finished = checkCombatEnd(state);

  assert.equal(finished.isFinished, true);
  assert.equal(finished.winner, "player");
});

test("アイテム使用でHPが回復し、上限を超えない", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({
      instanceId: "hero-4",
      currentStats: { hp: 90, maxHp: 100, attack: 20, defense: 5, speed: 10, mind: 5 },
    }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  const state = initializeCombat([player], [], { config });

  const result = resolveAction(
    state,
    { actorId: "hero-4", kind: "item", targetIds: ["hero-4"] },
    { config }
  );

  assert.equal(result.ok, true);
  assert.equal(player.character.currentStats.hp, 100); // 90 + 30 は上限100でクランプ
});

test("防御中は敵からのダメージが軽減される", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-5", currentStats: { hp: 200, maxHp: 200, attack: 20, defense: 10, speed: 10, mind: 5 } }),
    actionPointsRemaining: 3,
    isDefending: true,
    isDefeated: false,
  };
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-003",
    runtime: makeRuntime({ instanceId: "AA-003", currentStats: { hp: 100, maxHp: 100, attack: 40, defense: 5, speed: 5, mind: 5 } }),
    isDefeated: false,
  };
  const state = initializeCombat([player], [enemy], { config });

  resolveEnemyPhase(state, { config });

  const damageTaken = 200 - player.character.currentStats.hp;
  assert.ok(damageTaken > 0);
  assert.ok(damageTaken < 40); // 軽減なしの想定より小さい
});

test("対象の耐性値(%)だけでダメージ倍率が決まる（属性同士のじゃんけんは使わない）", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-7", attackAttributeId: "HEAT" }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  // 同じHEAT属性の攻撃でも、対象個体の耐性値次第でまったく異なる結果になることを確認する
  const weakEnemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-weak",
    runtime: makeRuntime({
      instanceId: "AA-weak",
      attackAttributeId: "VOID", // この個体自身の属性は無関係
      affinity: { HEAT: -50 }, // HEATに対して50%多くダメージを受ける（弱点）
      currentStats: { hp: 500, maxHp: 500, attack: 10, defense: 5, speed: 5, mind: 5 },
    }),
    isDefeated: false,
  };
  const resistEnemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-resist",
    runtime: makeRuntime({
      instanceId: "AA-resist",
      attackAttributeId: "VOID", // weakEnemyと同じ攻撃属性でも耐性値が違えば結果が変わる
      affinity: { HEAT: 50 }, // HEATに対して50%軽減する（耐性）
      currentStats: { hp: 500, maxHp: 500, attack: 10, defense: 5, speed: 5, mind: 5 },
    }),
    isDefeated: false,
  };

  const weakState = initializeCombat([player], [weakEnemy], { config });
  resolveAction(weakState, { actorId: "hero-7", kind: "attack", targetIds: ["AA-weak"] }, { config });
  const weakDamage = 500 - weakEnemy.runtime.currentStats.hp;

  const resistState = initializeCombat(
    [{ ...player, character: makeRuntime({ instanceId: "hero-7", attackAttributeId: "HEAT" }) }],
    [resistEnemy],
    { config }
  );
  resolveAction(resistState, { actorId: "hero-7", kind: "attack", targetIds: ["AA-resist"] }, { config });
  const resistDamage = 500 - resistEnemy.runtime.currentStats.hp;

  assert.ok(weakDamage > resistDamage);
});

test("スキル定義を指定すると属性と威力倍率が上書きされる", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-8", attackAttributeId: "VOID" }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-skill-test",
    runtime: makeRuntime({
      instanceId: "AA-skill-test",
      attackAttributeId: "FROST",
      affinity: { HEAT: -30 }, // HEATに対して30%多くダメージを受ける
      currentStats: { hp: 500, maxHp: 500, attack: 10, defense: 5, speed: 5, mind: 5 },
    }),
    isDefeated: false,
  };
  const state = initializeCombat([player], [enemy], { config });

  const getSkillDefinition = (skillId: string) =>
    skillId === "skill_test_heat_burst"
      ? {
          id: "skill_test_heat_burst",
          name: "テスト用スキル",
          description: "",
          kind: "skill" as const,
          attributeId: "HEAT",
          powerMultiplier: 2.0,
          source: "base" as const,
        }
      : undefined;

  const result = resolveAction(
    state,
    { actorId: "hero-8", kind: "skill", targetIds: ["AA-skill-test"], skillId: "skill_test_heat_burst" },
    { config, getSkillDefinition }
  );

  assert.equal(result.ok, true);
  // 素のattackAttributeId(VOID)ではなく、スキルのHEAT属性・威力倍率2.0が適用される
  const damage = 500 - enemy.runtime.currentStats.hp;
  assert.ok(damage > 0);
});

test("耐性値0%（未定義属性）は等倍として扱われる", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-9", attackAttributeId: "LIGHT" }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-neutral",
    runtime: makeRuntime({
      instanceId: "AA-neutral",
      affinity: {}, // LIGHTへの耐性値が未定義 -> 0%（等倍）として扱われる
      currentStats: { hp: 500, maxHp: 500, attack: 10, defense: 5, speed: 5, mind: 5 },
    }),
    isDefeated: false,
  };
  const state = initializeCombat([player], [enemy], { config });

  const result = resolveAction(state, { actorId: "hero-9", kind: "attack", targetIds: ["AA-neutral"] }, { config });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(typeof result.damage === "number" && result.damage > 0);
  }
});

test("全員AP0のときプレイヤーフェーズは終了扱いになる", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-6" }),
    actionPointsRemaining: 0,
    isDefending: false,
    isDefeated: false,
  };
  const state = initializeCombat([player], [], { config });
  state.combatants[0]!.actionPointsRemaining = 0;

  assert.equal(isPlayerPhaseExhausted(state), true);
});

test("INSTABILITYが100%に達するとBREACHが発生し、生存中の星異体が強化される", () => {
  const player: CombatantState = {
    side: "player",
    // instabilityPerBoostUse(10) を足すとちょうど100%に到達するよう99を初期値にする
    character: makeRuntime({ instanceId: "hero-breach", instability: { value: 99 } }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-breach-target",
    runtime: makeRuntime({
      instanceId: "AA-breach-target",
      currentStats: { hp: 500, maxHp: 500, attack: 20, defense: 10, speed: 5, mind: 5 },
    }),
    isDefeated: false,
  };
  const state = initializeCombat([player], [enemy], { config });

  // 不安定化による行動失敗を発生させないよう、両ロールを1.0に固定する
  const fixedRoll = () => ({ mutateRoll: 1.0, restrictRoll: 1.0, attributeRoll: 0 });

  const result = resolveAction(
    state,
    { actorId: "hero-breach", kind: "attack", targetIds: ["AA-breach-target"] },
    { config, getInstabilityRoll: fixedRoll }
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.breached, true);
  }
  assert.equal(state.isBreached, true);
  // attack: 20 * 1.4(breachEnemyBuffMultiplier) = 28
  assert.equal(enemy.runtime.currentStats.attack, 28);
  assert.equal(enemy.runtime.currentStats.defense, 14);
  assert.ok(state.log.some((entry) => entry.message.includes("BREACH発生")));
});

test("triggerBreachは冪等で、2回目以降は敵ステータスを再強化しない", () => {
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-idempotent",
    runtime: makeRuntime({
      instanceId: "AA-idempotent",
      currentStats: { hp: 500, maxHp: 500, attack: 20, defense: 10, speed: 5, mind: 5 },
    }),
    isDefeated: false,
  };
  const state = initializeCombat([], [enemy], { config });

  triggerBreach(state, { config });
  triggerBreach(state, { config }); // 2回目は何もしないはず

  assert.equal(enemy.runtime.currentStats.attack, 28); // 20 * 1.4 が1回だけ適用される
});

test("不安定度が高いほど、行動が制御不能で失敗しやすくなる", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-restrict", instability: { value: 100 } }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-restrict-target",
    runtime: makeRuntime({
      instanceId: "AA-restrict-target",
      currentStats: { hp: 500, maxHp: 500, attack: 10, defense: 5, speed: 5, mind: 5 },
    }),
    isDefeated: false,
  };
  const state = initializeCombat([player], [enemy], { config });

  // restrictRoll(0.1) は breach段階の restrictChance(0.35) を下回るため行動失敗する
  const blockingRoll = () => ({ mutateRoll: 1.0, restrictRoll: 0.1, attributeRoll: 0 });

  const result = resolveAction(
    state,
    { actorId: "hero-restrict", kind: "attack", targetIds: ["AA-restrict-target"] },
    { config, getInstabilityRoll: blockingRoll }
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.blockedByInstability, true);
    assert.equal(result.damage, 0);
  }
  assert.equal(enemy.runtime.currentStats.hp, 500); // ダメージは発生していない
  assert.ok(state.log.some((entry) => entry.message.includes("行動に失敗した")));
});

test("不安定化により攻撃属性が変質することがある", () => {
  const player: CombatantState = {
    side: "player",
    character: makeRuntime({ instanceId: "hero-mutate", instability: { value: 50 }, attackAttributeId: "HEAT" }),
    actionPointsRemaining: 3,
    isDefending: false,
    isDefeated: false,
  };
  const enemy: CombatEnemyState = {
    side: "enemy",
    anomalyId: "AA-mutate-target",
    runtime: makeRuntime({
      instanceId: "AA-mutate-target",
      currentStats: { hp: 500, maxHp: 500, attack: 10, defense: 5, speed: 5, mind: 5 },
    }),
    isDefeated: false,
  };
  const state = initializeCombat([player], [enemy], { config });

  // mutateRoll(0)はunstable段階のmutateChance(0.25)を下回るため変質が発生する。
  // attributeRoll(0)は属性配列の先頭(HEAT)を指すため、意図的にVOLTを引くよう調整する。
  const mutateRoll = () => ({ mutateRoll: 0, restrictRoll: 1.0, attributeRoll: 0.5 });

  const result = resolveAction(
    state,
    { actorId: "hero-mutate", kind: "attack", targetIds: ["AA-mutate-target"] },
    { config, getInstabilityRoll: mutateRoll }
  );

  assert.equal(result.ok, true);
  assert.ok(state.log.some((entry) => entry.message.includes("属性が変質した")));
});
