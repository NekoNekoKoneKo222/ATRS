import type {
  EncounterDefinition,
  ExplorationState,
  GalaxyMapDefinition,
  GalaxyNodeDefinition,
} from "../types/exploration.js";

/** マップ定義からノードをIDで検索する */
export function findNode(mapDef: GalaxyMapDefinition, nodeId: string): GalaxyNodeDefinition | undefined {
  return mapDef.nodes.find((n) => n.id === nodeId);
}

/**
 * 探索状態を初期化する。開始ノード自身と、その直接の接続先ノードを
 * 「発見済み（マップ上に表示される）」状態にする。
 */
export function initializeExploration(mapDef: GalaxyMapDefinition, startNodeId: string): ExplorationState {
  const startNode = findNode(mapDef, startNodeId);
  const discovered = new Set<string>([startNodeId]);
  if (startNode) {
    for (const connectedId of startNode.connections) {
      discovered.add(connectedId);
    }
  }

  return {
    currentNodeId: startNodeId,
    discoveredNodeIds: Array.from(discovered),
    exploredNodeIds: [],
    log: [{ nodeId: startNodeId, message: `${startNode?.name ?? startNodeId} からの探索を開始した。` }],
  };
}

/** 現在ノードから直接移動可能な、マップ定義上のノード一覧を返す */
export function getAvailableDestinations(
  state: ExplorationState,
  mapDef: GalaxyMapDefinition
): GalaxyNodeDefinition[] {
  const currentNode = findNode(mapDef, state.currentNodeId);
  if (!currentNode) return [];
  return currentNode.connections
    .map((id) => findNode(mapDef, id))
    .filter((n): n is GalaxyNodeDefinition => n !== undefined);
}

export type TravelResult =
  | { ok: true; state: ExplorationState }
  | { ok: false; reason: "current_node_not_found" | "target_node_not_found" | "not_connected" };

/**
 * 現在ノードと接続されている別のノードへ移動する。
 * 移動先ノードとその接続先も新たに「発見済み」となる。
 */
export function travelTo(
  state: ExplorationState,
  mapDef: GalaxyMapDefinition,
  targetNodeId: string
): TravelResult {
  const currentNode = findNode(mapDef, state.currentNodeId);
  if (!currentNode) return { ok: false, reason: "current_node_not_found" };

  const targetNode = findNode(mapDef, targetNodeId);
  if (!targetNode) return { ok: false, reason: "target_node_not_found" };

  if (!currentNode.connections.includes(targetNodeId)) {
    return { ok: false, reason: "not_connected" };
  }

  const discovered = new Set(state.discoveredNodeIds);
  discovered.add(targetNodeId);
  for (const connectedId of targetNode.connections) {
    discovered.add(connectedId);
  }

  return {
    ok: true,
    state: {
      ...state,
      currentNodeId: targetNodeId,
      discoveredNodeIds: Array.from(discovered),
      log: [...state.log, { nodeId: targetNodeId, message: `${targetNode.name} へ移動した。` }],
    },
  };
}

/**
 * 重み付き抽選で発見内容(EncounterDefinition)を1つ選ぶ。
 * roll は 0.0-1.0 の外部注入可能な乱数値（テストで固定値を使えるようにするため）。
 * encounters が空、または全ての重みが0以下の場合は undefined を返す。
 */
export function chooseWeightedEncounter(
  encounters: EncounterDefinition[],
  roll: number
): EncounterDefinition | undefined {
  const totalWeight = encounters.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
  if (totalWeight <= 0) return undefined;

  const clampedRoll = Math.min(0.999999, Math.max(0, roll));
  let threshold = clampedRoll * totalWeight;

  for (const encounter of encounters) {
    const weight = Math.max(0, encounter.weight);
    if (threshold < weight) return encounter;
    threshold -= weight;
  }

  // 浮動小数点誤差で万一超過した場合は最後の要素にフォールバックする
  return encounters[encounters.length - 1];
}

export interface ExploreNodeResult {
  state: ExplorationState;
  /** すでに探索済みだった場合はundefined（何も新しく発見しない） */
  encounter?: EncounterDefinition;
  alreadyExplored: boolean;
}

/**
 * 現在ノードを探索し、発見内容を1つ確定させる。
 * 一度探索したノードは再探索しても何も起きない（alreadyExplored=true を返す）。
 */
export function exploreCurrentNode(
  state: ExplorationState,
  mapDef: GalaxyMapDefinition,
  roll: number
): ExploreNodeResult {
  if (state.exploredNodeIds.includes(state.currentNodeId)) {
    return { state, alreadyExplored: true };
  }

  const node = findNode(mapDef, state.currentNodeId);
  const exploredNodeIds = [...state.exploredNodeIds, state.currentNodeId];

  if (!node || node.encounters.length === 0) {
    return {
      state: {
        ...state,
        exploredNodeIds,
        log: [...state.log, { nodeId: state.currentNodeId, message: "特に何も発見できなかった。" }],
      },
      alreadyExplored: false,
    };
  }

  const encounter = chooseWeightedEncounter(node.encounters, roll);
  const message = encounter ? encounter.description : "特に何も発見できなかった。";

  return {
    state: {
      ...state,
      exploredNodeIds,
      log: [
        ...state.log,
        { nodeId: state.currentNodeId, ...(encounter ? { encounterId: encounter.id } : {}), message },
      ],
    },
    ...(encounter ? { encounter } : {}),
    alreadyExplored: false,
  };
}
