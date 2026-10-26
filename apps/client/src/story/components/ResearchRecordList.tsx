import type { StoryDataBundle, StoryState } from "@astral-archive/core";

interface Props {
  state: StoryState;
  storyData: StoryDataBundle;
}

export function ResearchRecordList({ state, storyData }: Props) {
  const unlocked = state.unlockedRecords
    .map((id) => storyData.records.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  if (unlocked.length === 0) {
    return (
      <div className="aa-panel" style={{ color: "var(--aa-text-dim)", fontSize: "0.8rem" }}>
        まだResearch Recordは解禁されていません。
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {unlocked.map((record) => (
        <div key={record.id} className="aa-panel">
          <div className="aa-mono" style={{ fontSize: "0.68rem", color: "var(--aa-signal-amber)", marginBottom: "0.3rem" }}>
            RESEARCH RECORD — {record.id.toUpperCase()}
          </div>
          <strong style={{ fontSize: "0.95rem" }}>{record.title}</strong>
          <p style={{ fontSize: "0.8rem", color: "var(--aa-text-dim)", margin: "0.4rem 0 0", lineHeight: 1.7 }}>
            {record.content}
          </p>
        </div>
      ))}
    </div>
  );
}
