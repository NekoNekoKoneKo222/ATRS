import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initializeExploration,
  getAvailableDestinations,
  travelTo,
  chooseWeightedEncounter,
  exploreCurrentNode,
} from "../systems/explorationSystem.js";
import type { GalaxyMapDefinition } from "../types/exploration.js";

const testMap: GalaxyMapDefinition = {
  id: "test-map",
  name: "テストマップ",
  nodes: [
    {
      id: "base",
      name: "基地",
      description: "出発地点",
      nodeType: "base",
      tier: 0,
      connections: ["planet-a"],
      encounters: [],
      source: "base",
    },
    {
      id: "planet-a",
      name: "テスト惑星A",
      description: "テスト用の惑星",
      nodeType: "planet",
      tier: 1,
      connections: ["asteroid-belt", "base"],
      encounters: [
        { id: "enc-resource", type: "resource", description: "資源を発見した", weight: 7, resourceReward: { CREDITS: 50 } },
        { id: "enc-anomaly", type: "anomaly", description: "星異体を発見した", weight: 3, anomalyId: "AA-001" },
      ],
      source: "base",
    },
    {
      id: "asteroid-belt",
      name: "テスト小惑星帯",
      description: "テスト用の小惑星帯",
      nodeType: "asteroidBelt",
      tier: 2,
      connections: ["planet-a"],
      encounters: [],
      source: "base",
    },
  ],
};

test("initializeExplorationは開始ノードとその接続先を発見済みにする", () => {
  const state = initializeExploration(testMap, "base");

  assert.equal(state.currentNodeId, "base");
  assert.deepEqual(new Set(state.discoveredNodeIds), new Set(["base", "planet-a"]));
  assert.equal(state.exploredNodeIds.length, 0);
});

test("getAvailableDestinationsは現在ノードから接続されたノードのみ返す", () => {
  const state = initializeExploration(testMap, "base");
  const destinations = getAvailableDestinations(state, testMap);

  assert.equal(destinations.length, 1);
  assert.equal(destinations[0]!.id, "planet-a");
});

test("travelToは接続されたノードへ正しく移動できる", () => {
  const state = initializeExploration(testMap, "base");
  const result = travelTo(state, testMap, "planet-a");

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.currentNodeId, "planet-a");
    // planet-aの接続先(asteroid-belt, base)も新たに発見済みになる
    assert.deepEqual(
      new Set(result.state.discoveredNodeIds),
      new Set(["base", "planet-a", "asteroid-belt"])
    );
  }
});

test("接続されていないノードへは移動できない", () => {
  const state = initializeExploration(testMap, "base");
  const result = travelTo(state, testMap, "asteroid-belt"); // baseから直接は繋がっていない

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "not_connected");
  }
});

test("存在しないノードへの移動はエラーになる", () => {
  const state = initializeExploration(testMap, "base");
  const result = travelTo(state, testMap, "unknown-node");

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "target_node_not_found");
  }
});

test("chooseWeightedEncounterは重みに応じてエンカウントを選ぶ", () => {
  const encounters = [
    { id: "a", type: "resource", description: "A", weight: 1 },
    { id: "b", type: "resource", description: "B", weight: 1 },
    { id: "c", type: "resource", description: "C", weight: 1 },
  ];

  // 3等分の重みなので、roll=0.1 -> a, roll=0.4 -> b, roll=0.9 -> c
  assert.equal(chooseWeightedEncounter(encounters, 0.1)?.id, "a");
  assert.equal(chooseWeightedEncounter(encounters, 0.4)?.id, "b");
  assert.equal(chooseWeightedEncounter(encounters, 0.9)?.id, "c");
});

test("chooseWeightedEncounterは空配列や重み0のみの場合undefinedを返す", () => {
  assert.equal(chooseWeightedEncounter([], 0.5), undefined);
  assert.equal(
    chooseWeightedEncounter([{ id: "z", type: "resource", description: "Z", weight: 0 }], 0.5),
    undefined
  );
});

test("exploreCurrentNodeはノードのエンカウントを確定し、探索済みにする", () => {
  const base = initializeExploration(testMap, "base");
  const atPlanet = travelTo(base, testMap, "planet-a");
  assert.equal(atPlanet.ok, true);
  if (!atPlanet.ok) return;

  const result = exploreCurrentNode(atPlanet.state, testMap, 0.1); // weight 7/10 -> enc-resource

  assert.equal(result.alreadyExplored, false);
  assert.equal(result.encounter?.id, "enc-resource");
  assert.ok(result.state.exploredNodeIds.includes("planet-a"));
});

test("すでに探索済みのノードは再探索しても何も起きない", () => {
  const base = initializeExploration(testMap, "base");
  const atPlanet = travelTo(base, testMap, "planet-a");
  assert.equal(atPlanet.ok, true);
  if (!atPlanet.ok) return;

  const firstExplore = exploreCurrentNode(atPlanet.state, testMap, 0.1);
  const secondExplore = exploreCurrentNode(firstExplore.state, testMap, 0.9);

  assert.equal(secondExplore.alreadyExplored, true);
  assert.equal(secondExplore.encounter, undefined);
});

test("エンカウントを持たないノードを探索しても正常に完了する", () => {
  const base = initializeExploration(testMap, "base");
  const result = exploreCurrentNode(base, testMap, 0.5); // base自身にはencountersがない

  assert.equal(result.alreadyExplored, false);
  assert.equal(result.encounter, undefined);
  assert.ok(result.state.exploredNodeIds.includes("base"));
});
