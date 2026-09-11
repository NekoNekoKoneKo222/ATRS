import type { AnomalyDefinition, ContainmentRecord } from "@astral-archive/core";
import { getContainmentStatusMeta } from "../containmentMeta.js";

interface Props {
  record: ContainmentRecord;
  definition: AnomalyDefinition;
  researchCost: number;
  stabilizeCost: number;
  onInvestResearch: (anomalyId: string) => void;
  onStabilize: (anomalyId: string) => void;
}

export function AnomalyCard({ record, definition, researchCost, stabilizeCost, onInvestResearch, onStabilize }: Props) {
  const statusMeta = getContainmentStatusMeta(record.status);
  const sortedTrack = [...definition.researchTrack].sort((a, b) => a.stage - b.stage);
  const nextStage = sortedTrack.find((s) => s.stage > record.researchStage);
  const maxStage = sortedTrack.length > 0 ? sortedTrack[sortedTrack.length - 1]!.stage : 0;
  const unlockedDescriptions = sortedTrack.filter((s) => s.stage <= record.researchStage);

  return (
    <div className="aa-panel" style={{ borderColor: record.status === "breached" ? "var(--aa-signal-rose)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: "1rem" }}>{definition.name}</strong>
        <span
          className="aa-mono"
          style={{
            fontSize: "0.68rem",
            color: statusMeta.color,
            border: `1px solid ${statusMeta.color}`,
            borderRadius: "2px",
            padding: "0.02rem 0.4rem",
          }}
        >
          {statusMeta.label}
        </span>
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--aa-text-dim)", margin: "0.4rem 0 0.6rem" }}>
        {definition.description}
      </p>

      <div className="aa-mono" style={{ fontSize: "0.7rem", color: "var(--aa-text-dim)", marginBottom: "0.2rem" }}>
        収容安定度 {record.integrity}%
      </div>
      <div className="aa-bar-track" style={{ marginBottom: "0.6rem" }}>
        <div
          className="aa-bar-fill"
          style={{ width: `${record.integrity}%`, background: statusMeta.color }}
        />
      </div>

      <div className="aa-mono" style={{ fontSize: "0.7rem", color: "var(--aa-text-dim)", marginBottom: "0.2rem" }}>
        研究段階 {record.researchStage} / {maxStage}（{record.researchPoints}pt）
      </div>

      {unlockedDescriptions.length > 0 && (
        <ul style={{ fontSize: "0.72rem", color: "var(--aa-signal-teal)", margin: "0.3rem 0 0.6rem", paddingLeft: "1.1rem" }}>
          {unlockedDescriptions.map((s) => (
            <li key={s.stage}>{s.unlockDescription}</li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {nextStage ? (
          <button className="aa-button aa-button--primary" onClick={() => onInvestResearch(record.anomalyId)}>
            研究データを投入（研究ポイント -{researchCost}）
          </button>
        ) : (
          <span style={{ fontSize: "0.75rem", color: "var(--aa-signal-amber)", alignSelf: "center" }}>研究完了</span>
        )}

        {record.status !== "breached" ? (
          <button className="aa-button" onClick={() => onStabilize(record.anomalyId)}>
            収容を安定化（エネルギー -{stabilizeCost}）
          </button>
        ) : (
          <span style={{ fontSize: "0.75rem", color: "var(--aa-signal-rose)", alignSelf: "center" }}>
            基地復旧が必要（未実装）
          </span>
        )}
      </div>
    </div>
  );
}
