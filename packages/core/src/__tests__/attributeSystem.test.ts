import { test } from "node:test";
import assert from "node:assert/strict";
import { resistancePercentToMultiplier, calculateAttributeMultiplier, calculateDamage } from "../systems/attributeSystem.js";

test("resistancePercentToMultiplierは0%で等倍を返す", () => {
  assert.equal(resistancePercentToMultiplier(0), 1.0);
});

test("resistancePercentToMultiplierは正の値(耐性)で倍率が下がる", () => {
  assert.equal(resistancePercentToMultiplier(20), 0.8);
  assert.equal(resistancePercentToMultiplier(50), 0.5);
});

test("resistancePercentToMultiplierは負の値(弱点)で倍率が上がる", () => {
  assert.equal(resistancePercentToMultiplier(-25), 1.25);
  assert.equal(resistancePercentToMultiplier(-50), 1.5);
});

test("resistancePercentToMultiplierは極端な値をクランプする", () => {
  assert.equal(resistancePercentToMultiplier(1000), 0.1); // 下限
  assert.equal(resistancePercentToMultiplier(-1000), 3.0); // 上限
});

test("calculateAttributeMultiplierは耐性値未定義の属性を0%(等倍)として扱う", () => {
  const multiplier = calculateAttributeMultiplier({ attackerAttribute: "VOID", defenderAffinity: { HEAT: -50 } });
  assert.equal(multiplier, 1.0);
});

test("calculateAttributeMultiplierは対応する属性の耐性値を正しく参照する", () => {
  const multiplier = calculateAttributeMultiplier({ attackerAttribute: "HEAT", defenderAffinity: { HEAT: -50 } });
  assert.equal(multiplier, 1.5);
});

test("calculateDamageは最低1ダメージを保証する", () => {
  const { damage } = calculateDamage({
    attackerAttack: 1,
    attackerAttribute: "HEAT",
    defenderDefense: 999,
    defenderAffinity: {},
    attributeDamageMultiplier: 1.0,
    isCritical: false,
    criticalMultiplier: 1.5,
    variance: 0,
  });
  assert.ok(damage >= 1);
});

test("calculateDamageはクリティカル時に威力が上昇する", () => {
  const base = {
    attackerAttack: 100,
    attackerAttribute: "HEAT",
    defenderDefense: 10,
    defenderAffinity: {},
    attributeDamageMultiplier: 1.0,
    criticalMultiplier: 2.0,
    variance: 0, // 乱数振れ幅を0にして決定的に比較する
  };
  const normal = calculateDamage({ ...base, isCritical: false });
  const critical = calculateDamage({ ...base, isCritical: true });
  assert.ok(critical.damage > normal.damage);
});

test("calculateDamageは弱点属性を突くとダメージが増加する", () => {
  const base = {
    attackerAttack: 100,
    attackerAttribute: "HEAT",
    defenderDefense: 10,
    attributeDamageMultiplier: 1.0,
    isCritical: false,
    criticalMultiplier: 1.5,
    variance: 0,
  };
  const neutral = calculateDamage({ ...base, defenderAffinity: {} });
  const weak = calculateDamage({ ...base, defenderAffinity: { HEAT: -50 } });
  assert.ok(weak.damage > neutral.damage);
});

test("calculateDamageはmultiplierAppliedとして適用倍率を返す", () => {
  const { multiplierApplied } = calculateDamage({
    attackerAttack: 100,
    attackerAttribute: "HEAT",
    defenderDefense: 10,
    defenderAffinity: { HEAT: 50 },
    attributeDamageMultiplier: 1.0,
    isCritical: false,
    criticalMultiplier: 1.5,
    variance: 0,
  });
  assert.equal(multiplierApplied, 0.5);
});
