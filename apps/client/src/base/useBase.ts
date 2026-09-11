import { useCallback, useState } from "react";
import {
  upgradeFacility,
  addResources,
  canAffordCost,
  deductCost,
  type BaseState,
  type ResourcePool,
} from "@astral-archive/core";
import { createInitialBaseState, facilityDefinitions } from "./baseData.js";

export function useBase() {
  const [baseState, setBaseState] = useState<BaseState>(() => createInitialBaseState());
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const upgrade = useCallback((facilityId: string) => {
    setBaseState((prev) => {
      const result = upgradeFacility(prev, facilityId, facilityDefinitions);
      if (!result.ok) {
        const reasonLabel =
          result.reason === "insufficient_resources"
            ? "資源が不足しています。"
            : result.reason === "already_max_level"
              ? "すでに最大レベルです。"
              : "施設が見つかりません。";
        setLastMessage(reasonLabel);
        return prev;
      }
      setLastMessage(null);
      return result.state;
    });
  }, []);

  /** 探索での発見報酬などを基地の資源プールへ加算する */
  const gainResources = useCallback((reward: Partial<ResourcePool>) => {
    setBaseState((prev) => ({ ...prev, resources: addResources(prev.resources, reward) }));
  }, []);

  /**
   * 他システム（収容・研究など）からのコスト消費を試みる。
   * 現在の資源で賄えない場合は何も変更せずfalseを返す。
   * 判定は呼び出し時点のbaseStateを基準に行うため、同一レンダー内で連続して
   * 複数回呼び出すケースがある場合は呼び出し側で結果を確認してから次を呼ぶこと。
   */
  const trySpendResources = useCallback(
    (cost: Partial<ResourcePool>): boolean => {
      if (!canAffordCost(baseState.resources, cost)) {
        return false;
      }
      setBaseState((prev) => ({ ...prev, resources: deductCost(prev.resources, cost) }));
      return true;
    },
    [baseState.resources]
  );

  const resetBase = useCallback(() => {
    setBaseState(createInitialBaseState());
    setLastMessage(null);
  }, []);

  /** セーブデータからの読み込みなど、外部から状態全体を置き換える */
  const loadBaseState = useCallback((next: BaseState) => {
    setBaseState(next);
    setLastMessage(null);
  }, []);

  return { baseState, upgrade, resetBase, loadBaseState, lastMessage, gainResources, trySpendResources };
}
