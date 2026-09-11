import { test } from "node:test";
import assert from "node:assert/strict";
import { increaseBoost, consumeOverdrive, getBoostModifiers } from "../systems/boostSystem.js";
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

test("increaseBoostはゲージを加算するだけでレベルアップしない場合がある", () => {
  const result = increaseBoost({ level: 0, gauge: 0 }, 50, config);
  assert.equal(result.level, 0);
  assert.equal(result.gauge, 50);
});

test("increaseBoostはゲージがmaxに達するとレベルアップする", () => {
  const result = increaseBoost({ level: 0, gauge: 80 }, 30, config);
  assert.equal(result.level, 1);
  assert.equal(result.gauge, 10); // 80+30=110 -> 100を超えた分の10が繰り越し
});

test("increaseBoostは一度に複数レベル上昇することがある", () => {
  const result = increaseBoost({ level: 0, gauge: 0 }, 250, config);
  assert.equal(result.level, 2);
  assert.equal(result.gauge, 50); // 250 - 100*2 = 50
});

test("increaseBoostはレベル4(MAX)で頭打ちになる", () => {
  const result = increaseBoost({ level: 0, gauge: 0 }, 1000, config);
  assert.equal(result.level, 4);
  assert.equal(result.gauge, 100);
});

test("increaseBoostはすでにレベル4なら変化しない", () => {
  const state = { level: 4 as const, gauge: 100 };
  const result = increaseBoost(state, 50, config);
  assert.deepEqual(result, state);
});

test("consumeOverdriveはBOOSTを0にリセットする", () => {
  const result = consumeOverdrive({ level: 4, gauge: 100 });
  assert.deepEqual(result, { level: 0, gauge: 0 });
});

test("getBoostModifiersはレベル0では補正なしを返す", () => {
  const mods = getBoostModifiers(0);
  assert.equal(mods.attackMultiplier, 1.0);
  assert.equal(mods.ultimateUnlocked, false);
});

test("getBoostModifiersはレベル3以上で特殊技が解禁される", () => {
  assert.equal(getBoostModifiers(3).ultimateUnlocked, true);
  assert.equal(getBoostModifiers(4).ultimateUnlocked, true);
  assert.equal(getBoostModifiers(2).ultimateUnlocked, false);
});

test("getBoostModifiersはレベルが上がるほど倍率が単調増加する", () => {
  const levels = [0, 1, 2, 3, 4] as const;
  const multipliers = levels.map((l) => getBoostModifiers(l).attackMultiplier);
  for (let i = 1; i < multipliers.length; i++) {
    assert.ok(multipliers[i]! > multipliers[i - 1]!);
  }
});
