import { useCallback, useState } from "react";
import {
  discoverAnomaly,
  investResearch,
  applyContainmentTick,
  stabilizeContainment,
  type ContainmentCollection,
  type ResourcePool,
} from "@astral-archive/core";
import { anomalyDefsById, containmentConfig, createInitialContainmentCollection } from "./containmentData.js";

interface UseContainmentOptions {
  /** 研究投入・安定化のコストとして基地資源を消費するためのコールバック */
  onSpendResources?: (cost: Partial<ResourcePool>) => boolean;
}

export function useContainment(options: UseContainmentOptions = {}) {
  const [collection, setCollection] = useState<ContainmentCollection>(() => createInitialContainmentCollection());
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  /** 星異体を発見・収容する（戦闘での撃破、探索での発見から呼ばれる想定） */
  const discover = useCallback((anomalyId: string) => {
    setCollection((prev) => discoverAnomaly(prev, anomalyId));
  }, []);

  /** 研究ポイントを投入する。コストが払えない場合は何もしない。 */
  const invest = useCallback(
    (anomalyId: string, amount: number, cost: Partial<ResourcePool>) => {
      if (options.onSpendResources && !options.onSpendResources(cost)) {
        setLastMessage("資源が不足しています。");
        return;
      }

      const definition = anomalyDefsById.get(anomalyId);
      if (!definition) {
        setLastMessage("星異体データが見つかりません。");
        return;
      }

      setCollection((prev) => {
        const result = investResearch(prev, anomalyId, definition, amount);
        if (result.newlyUnlockedStages.length > 0) {
          setLastMessage(
            `研究が進展した：${result.newlyUnlockedStages.map((s) => s.unlockDescription).join(" / ")}`
          );
        } else {
          setLastMessage(null);
        }
        return result.collection;
      });
    },
    [options]
  );

  /** 収容の安定度を直接回復させる。コストが払えない場合は何もしない。 */
  const stabilize = useCallback(
    (anomalyId: string, amount: number, cost: Partial<ResourcePool>) => {
      if (options.onSpendResources && !options.onSpendResources(cost)) {
        setLastMessage("資源が不足しています。");
        return;
      }

      setCollection((prev) => ({
        records: prev.records.map((r) =>
          r.anomalyId === anomalyId ? stabilizeContainment(r, amount, containmentConfig.unstableThreshold) : r
        ),
      }));
      setLastMessage(null);
    },
    [options]
  );

  /** 全レコードに対して管理条件チェック（1サイクル分）を適用する */
  const tick = useCallback((resources: ResourcePool) => {
    setCollection((prev) => {
      const newlyBreachedIds: string[] = [];
      const records = prev.records.map((record) => {
        const definition = anomalyDefsById.get(record.anomalyId);
        if (!definition) return record;

        const result = applyContainmentTick(record, definition, resources, containmentConfig);
        if (result.newlyBreached) newlyBreachedIds.push(record.anomalyId);
        return result.record;
      });

      if (newlyBreachedIds.length > 0) {
        setLastMessage(`収容が失敗し、BREACHが発生した：${newlyBreachedIds.join(", ")}`);
      }

      return { records };
    });
  }, []);

  const resetContainment = useCallback(() => {
    setCollection(createInitialContainmentCollection());
    setLastMessage(null);
  }, []);

  /** セーブデータからの読み込みなど、外部から状態全体を置き換える */
  const loadContainmentCollection = useCallback((next: ContainmentCollection) => {
    setCollection(next);
    setLastMessage(null);
  }, []);

  return { collection, discover, invest, stabilize, tick, resetContainment, loadContainmentCollection, lastMessage };
}
