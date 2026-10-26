import type { StoryEventDefinition } from "@astral-archive/core";
import { getSafeEventText, getSafeSpeakerName } from "@astral-archive/core";

interface Props {
  event: StoryEventDefinition | undefined;
  onAdvance: () => void;
  onChoose: (choiceId: string) => void;
}

/**
 * イベント種別に応じて表示を切り替える。
 * Phase13ではdialogue/narration/notification/research_record/commandを主に扱い、
 * choiceも簡易対応する。未知の種別は本文があればそのまま表示するフォールバックとする。
 */
export function EventView({ event, onAdvance, onChoose }: Props) {
  if (!event) {
    return (
      <div className="aa-panel" style={{ color: "var(--aa-text-dim)" }}>
        （表示できるイベントがありません）
      </div>
    );
  }

  const speaker = getSafeSpeakerName(event);
  const text = getSafeEventText(event);

  if (event.type === "notification") {
    return (
      <div className="aa-panel" style={{ borderColor: "var(--aa-signal-amber)" }}>
        {event.title && (
          <div className="aa-mono" style={{ fontSize: "0.75rem", color: "var(--aa-signal-amber)", marginBottom: "0.5rem" }}>
            {event.title}
          </div>
        )}
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, margin: "0 0 1rem" }}>{text}</p>
        <button className="aa-button aa-button--primary" onClick={onAdvance}>
          次へ
        </button>
      </div>
    );
  }

  if (event.type === "choice" && event.choices && event.choices.length > 0) {
    return (
      <div className="aa-panel">
        {event.title && <h3 style={{ marginTop: 0, fontSize: "1rem" }}>{event.title}</h3>}
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, margin: "0 0 1rem" }}>{text}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {event.choices.map((choice) => (
            <button key={choice.id} className="aa-button" onClick={() => onChoose(choice.id)}>
              {choice.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // dialogue / narration / research_record / command / cinematic / 未知の種別 共通の表示
  return (
    <div className="aa-panel">
      {speaker && (
        <div className="aa-mono" style={{ fontSize: "0.8rem", color: "var(--aa-signal-teal)", marginBottom: "0.4rem" }}>
          {speaker}
        </div>
      )}
      {event.title && !speaker && (
        <div className="aa-mono" style={{ fontSize: "0.8rem", color: "var(--aa-text-dim)", marginBottom: "0.4rem" }}>
          {event.title}
        </div>
      )}
      <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, margin: "0 0 1rem" }}>{text}</p>
      {event.type === "research_record" && (
        <div style={{ fontSize: "0.75rem", color: "var(--aa-signal-amber)", marginBottom: "0.8rem" }}>
          RESEARCH RECORD を解禁しました
        </div>
      )}
      <button className="aa-button aa-button--primary" onClick={onAdvance}>
        次へ
      </button>
    </div>
  );
}
