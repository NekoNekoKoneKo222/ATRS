import { useCallback, useMemo, useState } from "react";
import {
  StoryManager,
  createInitialStoryState,
  type StoryState,
  type StoryDataBundle,
  type StoryEventDefinition,
  type EntityRegistrySet,
  type ResourcePool,
} from "@astral-archive/core";

interface UseStoryOptions {
  registries: EntityRegistrySet;
  /** ストーリー内の "discover_anomaly" コマンドから、実際の収容システムへ橋渡しする */
  onDiscoverAnomaly?: (anomalyId: string) => void;
  /** ストーリー内の "give_resources" コマンドから、実際の基地資源へ橋渡しする */
  onGainResources?: (reward: Partial<ResourcePool>) => void;
}

/**
 * ストーリーで実行を許可する既知のコマンドID一覧。
 * MODや壊れたデータが未知のcommandIdを指定しても、ここに無ければ何も実行せず
 * 警告をログに出すだけに留める（任意コード実行は一切行わない）。
 */
function runKnownCommand(
  event: StoryEventDefinition,
  handlers: { onDiscoverAnomaly?: (anomalyId: string) => void; onGainResources?: (reward: Partial<ResourcePool>) => void }
): void {
  if (!event.commandId) return;

  switch (event.commandId) {
    case "discover_anomaly": {
      if (event.targetId) {
        handlers.onDiscoverAnomaly?.(event.targetId);
      } else {
        console.warn(`[story] イベント「${event.id}」の discover_anomaly に targetId がありません。`);
      }
      break;
    }
    case "give_resources": {
      const resource = event.payload?.["resource"];
      const amount = event.payload?.["amount"];
      if (typeof resource === "string" && typeof amount === "number") {
        handlers.onGainResources?.({ [resource]: amount });
      } else {
        console.warn(`[story] イベント「${event.id}」の give_resources のpayloadが不正です。`);
      }
      break;
    }
    default:
      console.warn(`[story] 未知のコマンドID「${event.commandId}」（イベント「${event.id}」）はスキップされました。`);
  }
}

export function useStory({ registries, onDiscoverAnomaly, onGainResources }: UseStoryOptions) {
  const [state, setState] = useState<StoryState>(() => createInitialStoryState());
  const [message, setMessage] = useState<string | null>(null);

  const storyData: StoryDataBundle = useMemo(
    () => ({
      chapters: registries.storyChapters,
      events: registries.storyEvents.all(),
      records: registries.researchRecords.all(),
    }),
    [registries]
  );

  const runCommand = useCallback(
    (event: StoryEventDefinition) => {
      runKnownCommand(event, {
        ...(onDiscoverAnomaly ? { onDiscoverAnomaly } : {}),
        ...(onGainResources ? { onGainResources } : {}),
      });
    },
    [onDiscoverAnomaly, onGainResources]
  );

  const begin = useCallback(
    (chapterId: number) => {
      const result = StoryManager.beginChapter(state, storyData, chapterId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(null);
      setState(result.state);
      if (result.event) runCommand(result.event);
    },
    [state, storyData, runCommand]
  );

  const advance = useCallback(
    (choiceId?: string) => {
      const currentEvent = state.currentEventId ? StoryManager.findEvent(storyData, state.currentEventId) : undefined;
      if (!currentEvent) {
        setMessage("現在のイベントデータが見つかりませんでした。");
        return;
      }

      const result = StoryManager.resolveNextEvent(state, storyData, currentEvent, choiceId);
      let nextState = result.state;

      if (!result.nextEvent) {
        // イベント連鎖の終端に達した = このチャプターは完了とみなす
        nextState = StoryManager.completeChapter(nextState, state.currentChapter);
      }

      setState(nextState);
      setMessage(null);
      if (result.nextEvent) runCommand(result.nextEvent);
    },
    [state, storyData, runCommand]
  );

  const currentEvent = state.currentEventId ? StoryManager.findEvent(storyData, state.currentEventId) : undefined;

  const loadStoryState = useCallback((next: StoryState) => {
    setState(next);
    setMessage(null);
  }, []);

  const resetStory = useCallback(() => {
    setState(createInitialStoryState());
    setMessage(null);
  }, []);

  const isChapterLocked = useCallback((chapterId: number) => StoryManager.isChapterLocked(state, chapterId), [state]);

  return {
    state,
    storyData,
    currentEvent,
    message,
    begin,
    advance,
    loadStoryState,
    resetStory,
    isChapterLocked,
  };
}
