import { useCallback, useState } from "react";
import { travelTo, exploreCurrentNode, type ExplorationState, type ResourcePool } from "@astral-archive/core";
import { galaxyMap, createInitialExplorationState } from "./explorationData.js";

interface UseExplorationOptions {
  /** 探索で資源報酬を得たときに呼ばれるコールバック（基地の資源プールへ加算する想定） */
  onGainResources?: (reward: Partial<ResourcePool>) => void;
  /** 探索で星異体を発見したときに呼ばれるコールバック（収容システムへの連携に使う） */
  onAnomalyDiscovered?: (anomalyId: string) => void;
}

export function useExploration(options: UseExplorationOptions = {}) {
  const [explorationState, setExplorationState] = useState<ExplorationState>(() =>
    createInitialExplorationState()
  );
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const travel = useCallback((targetNodeId: string) => {
    setExplorationState((prev) => {
      const result = travelTo(prev, galaxyMap, targetNodeId);
      if (!result.ok) {
        setLastMessage(result.reason === "not_connected" ? "そのノードへは直接移動できません。" : "移動先が見つかりません。");
        return prev;
      }
      setLastMessage(null);
      return result.state;
    });
  }, []);

  const explore = useCallback(() => {
    setExplorationState((prev) => {
      const roll = Math.random();
      const result = exploreCurrentNode(prev, galaxyMap, roll);

      if (result.alreadyExplored) {
        setLastMessage("このノードはすでに探索済みです。");
        return prev;
      }

      if (result.encounter?.resourceReward) {
        options.onGainResources?.(result.encounter.resourceReward);
      }

      if (result.encounter?.type === "anomaly" && result.encounter.anomalyId) {
        options.onAnomalyDiscovered?.(result.encounter.anomalyId);
      }

      setLastMessage(null);
      return result.state;
    });
  }, [options]);

  const resetExploration = useCallback(() => {
    setExplorationState(createInitialExplorationState());
    setLastMessage(null);
  }, []);

  /** セーブデータからの読み込みなど、外部から状態全体を置き換える */
  const loadExplorationState = useCallback((next: ExplorationState) => {
    setExplorationState(next);
    setLastMessage(null);
  }, []);

  return { explorationState, travel, explore, resetExploration, loadExplorationState, lastMessage };
}
