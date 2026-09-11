import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getInstabilityTier,
  increaseInstability,
  decreaseInstability,
  getInstabilityEffectFlags,
  resolveInstabilityEffect,
  createRandomInstabilityRoll,
} from "../systems/instabilitySystem.js";
import type { CombatConfig } from "../types/combat.js";

const config: CombatConfig = {
  actionPoints: {
    maxActionPoints: 5,
    costs: { attack: 1, defend: 1, skill: 2, ultimate: 3, item: 1, wait: 0 },
    skillCostOverrides: {},
  },
  boostGaugePerAction: 20,
  boostGaugeMax: 100,
  instabilityPerBoostUse: 8,
  breachThreshold: 100,
  defendDamageMultiplier: 0.5,
  itemHealAmount: 30,
  breachEnemyBuffMultiplier: 1.4,
};

test("getInstabilityTierは値に応じた段階境界を正しく判定する", () => {
  assert.equal(getInstabilityTier(0), "stable");
  assert.equal(getInstabilityTier(39), "stable");
  assert.equal(getInstabilityTier(40), "unstable");
  assert.equal(getInstabilityTier(69), "unstable");
  assert.equal(getInstabilityTier(70), "critical");
  assert.equal(getInstabilityTier(99), "critical");
  assert.equal(getInstabilityTier(100), "breach");
});

test("increaseInstabilityは100を超えて増加しない", () => {
  const result = increaseInstability({ value: 95 }, 20, config);
  assert.equal(result.state.value, 100);
  assert.equal(result.breached, true);
});

test("increaseInstabilityはbreachThreshold未満ならbreachしない", () => {
  const result = increaseInstability({ value: 10 }, 10, config);
  assert.equal(result.state.value, 20);
  assert.equal(result.breached, false);
});

test("decreaseInstabilityは0未満にならない", () => {
  const result = decreaseInstability({ value: 5 }, 20);
  assert.equal(result.value, 0);
});

test("decreaseInstabilityは正しく減算する", () => {
  const result = decreaseInstability({ value: 50 }, 20);
  assert.equal(result.value, 30);
});

test("getInstabilityEffectFlagsはstableで全てfalseを返す", () => {
  const flags = getInstabilityEffectFlags("stable");
  assert.equal(flags.skillMayMutate, false);
  assert.equal(flags.statMayShift, false);
  assert.equal(flags.actionMayBeRestricted, false);
});

test("getInstabilityEffectFlagsはcritical以上で全てtrueを返す", () => {
  for (const tier of ["critical", "breach"] as const) {
    const flags = getInstabilityEffectFlags(tier);
    assert.equal(flags.skillMayMutate, true);
    assert.equal(flags.statMayShift, true);
    assert.equal(flags.actionMayBeRestricted, true);
  }
});

test("resolveInstabilityEffectはstable段階では何も発生させない", () => {
  const result = resolveInstabilityEffect("stable", { mutateRoll: 0, restrictRoll: 0, attributeRoll: 0 });
  assert.equal(result.actionBlocked, false);
  assert.equal(result.attributeOverride, undefined);
  assert.equal(result.attackMultiplier, 1.0);
});

test("resolveInstabilityEffectはrestrictRollが閾値未満だと行動を失敗させる", () => {
  const result = resolveInstabilityEffect("breach", { mutateRoll: 1, restrictRoll: 0.1, attributeRoll: 0 });
  assert.equal(result.actionBlocked, true);
});

test("resolveInstabilityEffectは行動失敗時は属性変質を発生させない", () => {
  const result = resolveInstabilityEffect("breach", { mutateRoll: 0, restrictRoll: 0.1, attributeRoll: 0 });
  assert.equal(result.actionBlocked, true);
  assert.equal(result.attributeOverride, undefined);
});

test("resolveInstabilityEffectはmutateRollが閾値未満だと属性を変質させる", () => {
  const result = resolveInstabilityEffect("critical", { mutateRoll: 0, restrictRoll: 1, attributeRoll: 0 });
  assert.equal(result.actionBlocked, false);
  assert.equal(typeof result.attributeOverride, "string");
});

test("resolveInstabilityEffectはattributeRollに応じて異なる属性を選ぶ", () => {
  const low = resolveInstabilityEffect("critical", { mutateRoll: 0, restrictRoll: 1, attributeRoll: 0 });
  const high = resolveInstabilityEffect("critical", { mutateRoll: 0, restrictRoll: 1, attributeRoll: 0.99 });
  assert.notEqual(low.attributeOverride, high.attributeOverride);
});

test("resolveInstabilityEffectはbreach段階で攻撃力倍率が最も低い", () => {
  const stable = resolveInstabilityEffect("stable", { mutateRoll: 1, restrictRoll: 1, attributeRoll: 0 });
  const breach = resolveInstabilityEffect("breach", { mutateRoll: 1, restrictRoll: 1, attributeRoll: 0 });
  assert.ok(breach.attackMultiplier < stable.attackMultiplier);
});

test("createRandomInstabilityRollは0.0-1.0の範囲の値を返す", () => {
  const roll = createRandomInstabilityRoll();
  for (const value of [roll.mutateRoll, roll.restrictRoll, roll.attributeRoll]) {
    assert.ok(value >= 0 && value < 1);
  }
});
