import { test } from "node:test";
import assert from "node:assert/strict";
import { getActionCost, canAffordAction, spendActionPoints, refillActionPoints } from "../systems/actionPointSystem.js";
import type { ActionPointConfig } from "../types/combat.js";

const config: ActionPointConfig = {
  maxActionPoints: 5,
  costs: { attack: 1, defend: 1, skill: 2, ultimate: 3, item: 1, wait: 0 },
  skillCostOverrides: { skill_expensive: 4 },
};

test("getActionCostは行動種別ごとの基本コストを返す", () => {
  assert.equal(getActionCost(config, "attack"), 1);
  assert.equal(getActionCost(config, "ultimate"), 3);
  assert.equal(getActionCost(config, "wait"), 0);
});

test("getActionCostはskillCostOverridesが設定されていればそちらを優先する", () => {
  assert.equal(getActionCost(config, "skill", "skill_expensive"), 4);
});

test("getActionCostはoverrideが無いスキルには基本コストを使う", () => {
  assert.equal(getActionCost(config, "skill", "skill_normal"), 2);
});

test("getActionCostはskillId未指定なら基本コストを使う", () => {
  assert.equal(getActionCost(config, "skill"), 2);
});

test("canAffordActionはAPが足りていればtrueを返す", () => {
  const result = canAffordAction(config, 3, { actorId: "a", kind: "skill", targetIds: [] });
  assert.equal(result, true);
});

test("canAffordActionはAPが足りなければfalseを返す", () => {
  const result = canAffordAction(config, 1, { actorId: "a", kind: "ultimate", targetIds: [] });
  assert.equal(result, false);
});

test("spendActionPointsはコスト分を正しく減算する", () => {
  const result = spendActionPoints(config, 5, { actorId: "a", kind: "skill", targetIds: [] });
  assert.equal(result, 3);
});

test("spendActionPointsは0未満にはならない", () => {
  const result = spendActionPoints(config, 1, { actorId: "a", kind: "ultimate", targetIds: [] });
  assert.equal(result, 0);
});

test("refillActionPointsは最大APを返す", () => {
  assert.equal(refillActionPoints(config), 5);
});
