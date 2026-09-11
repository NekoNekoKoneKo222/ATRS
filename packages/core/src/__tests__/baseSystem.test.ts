import { test } from "node:test";
import assert from "node:assert/strict";
import {
  upgradeFacility,
  getFacilityState,
  getCumulativeFacilityEffects,
  canAffordCost,
} from "../systems/baseSystem.js";
import type { BaseState, FacilityDefinition } from "../types/base.js";

const testFacilityDef: FacilityDefinition = {
  id: "TEST_FACILITY",
  name: "テスト施設",
  description: "テスト用の施設定義",
  maxLevel: 3,
  levels: [
    {
      level: 1,
      upgradeCost: { CREDITS: 100, ALLOY: 10 },
      effectDescription: "エネルギー容量+10",
      effects: { energyCapacity: 10 },
    },
    {
      level: 2,
      upgradeCost: { CREDITS: 300, ALLOY: 30 },
      effectDescription: "エネルギー容量+20",
      effects: { energyCapacity: 20 },
    },
    {
      level: 3,
      upgradeCost: { CREDITS: 900, ALLOY: 90 },
      effectDescription: "エネルギー容量+40",
      effects: { energyCapacity: 40 },
    },
  ],
  source: "base",
};

function makeBaseState(overrides: Partial<BaseState> = {}): BaseState {
  return {
    resources: { ENERGY: 100, CREDITS: 1000, RESEARCH_POINTS: 0, ALLOY: 500 },
    facilities: [],
    ...overrides,
  };
}

test("未建造の施設は新規建造（レベル1へ）できる", () => {
  const base = makeBaseState();
  const result = upgradeFacility(base, "TEST_FACILITY", [testFacilityDef]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.newLevel, 1);
    assert.equal(getFacilityState(result.state, "TEST_FACILITY").level, 1);
    assert.equal(result.state.resources.CREDITS, 900); // 1000 - 100
    assert.equal(result.state.resources.ALLOY, 490); // 500 - 10
  }
});

test("資源が不足していればアップグレードできない", () => {
  const base = makeBaseState({ resources: { ENERGY: 0, CREDITS: 50, RESEARCH_POINTS: 0, ALLOY: 5 } });
  const result = upgradeFacility(base, "TEST_FACILITY", [testFacilityDef]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "insufficient_resources");
  }
});

test("最大レベルに達した施設はそれ以上アップグレードできない", () => {
  const base = makeBaseState({ facilities: [{ facilityId: "TEST_FACILITY", level: 3 }] });
  const result = upgradeFacility(base, "TEST_FACILITY", [testFacilityDef]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "already_max_level");
  }
});

test("存在しない施設IDを指定するとエラーになる", () => {
  const base = makeBaseState();
  const result = upgradeFacility(base, "UNKNOWN_FACILITY", [testFacilityDef]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "facility_not_found");
  }
});

test("元のBaseStateはアップグレードによって変更されない（イミュータブル）", () => {
  const base = makeBaseState();
  const originalCredits = base.resources.CREDITS;
  upgradeFacility(base, "TEST_FACILITY", [testFacilityDef]);

  assert.equal(base.resources.CREDITS, originalCredits);
  assert.equal(base.facilities.length, 0);
});

test("累積効果はレベルに応じて正しく合算される", () => {
  const level0Effects = getCumulativeFacilityEffects(testFacilityDef, 0);
  assert.equal(level0Effects.energyCapacity, undefined);

  const level2Effects = getCumulativeFacilityEffects(testFacilityDef, 2);
  assert.equal(level2Effects.energyCapacity, 30); // 10 + 20

  const level3Effects = getCumulativeFacilityEffects(testFacilityDef, 3);
  assert.equal(level3Effects.energyCapacity, 70); // 10 + 20 + 40
});

test("canAffordCostは資源が足りている場合と不足している場合を正しく判定する", () => {
  const resources = { CREDITS: 100, ALLOY: 10 };
  assert.equal(canAffordCost(resources, { CREDITS: 100 }), true);
  assert.equal(canAffordCost(resources, { CREDITS: 101 }), false);
  assert.equal(canAffordCost(resources, { CREDITS: 50, ALLOY: 5 }), true);
  assert.equal(canAffordCost(resources, {}), true);
});

test("複数回アップグレードするとレベルが順に上がる", () => {
  let base = makeBaseState();

  const first = upgradeFacility(base, "TEST_FACILITY", [testFacilityDef]);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  base = first.state;
  assert.equal(getFacilityState(base, "TEST_FACILITY").level, 1);

  const second = upgradeFacility(base, "TEST_FACILITY", [testFacilityDef]);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  base = second.state;
  assert.equal(getFacilityState(base, "TEST_FACILITY").level, 2);
  assert.equal(base.resources.CREDITS, 1000 - 100 - 300);
});
