import type { StoryDataBundle, StoryState } from "@astral-archive/core";
import { getSafeEventText, getSafeSpeakerName } from "@astral-archive/core";

interface Props {
  state: StoryState;
  storyData: StoryDataBundle;
}

/** これまでに既読になったイベントの本文をログとして一覧表示する */
export function EventLogPanel({ state, storyData }: Props) {
  const loggedEvents = state.completedEvents
    .map((id) => storyData.events.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e !== undefined && (e.text !== undefined || e.title !== undefined));

  if (loggedEvents.length === 0) {
    return (
      <div className="aa-panel aa-mono" style={{ fontSize: "0.78rem", color: "var(--aa-text-dim)" }}>
        まだログはありません。
      </div>
    );
  }

  return (
    <div
      className="aa-panel aa-mono"
      style={{ fontSize: "0.78rem", lineHeight: 1.7, maxHeight: "16rem", overflowY: "auto" }}
    >
      {loggedEvents.map((event, i) => {
        const speaker = getSafeSpeakerName(event);
        return (
          <div key={`${event.id}-${i}`} style={{ marginBottom: "0.6rem", color: "var(--aa-text-dim)" }}>
            {speaker && <span style={{ color: "var(--aa-signal-teal)" }}>{speaker}: </span>}
            <span style={{ whiteSpace: "pre-wrap" }}>{getSafeEventText(event)}</span>
          </div>
        );
      })}
    </div>
  );
}
