import type { BaseState } from "@astral-archive/core";
import { facilityDefinitions } from "./baseData.js";
import { ResourceBar } from "./components/ResourceBar.js";
import { FacilityCard } from "./components/FacilityCard.js";

interface Props {
  baseState: BaseState;
  upgrade: (facilityId: string) => void;
  resetBase: () => void;
  lastMessage: string | null;
}

export function BaseScreen({ baseState, upgrade, resetBase, lastMessage }: Props) {
  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>星間観測基地</h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 5 — 施設をアップグレードして基地の運用能力を高める
        </p>
      </header>

      <section style={{ marginBottom: "1.2rem" }}>
        <ResourceBar resources={baseState.resources} />
      </section>

      {lastMessage && (
        <div className="aa-panel" style={{ marginBottom: "1rem", borderColor: "var(--aa-signal-rose)", color: "var(--aa-signal-rose)" }}>
          {lastMessage}
        </div>
      )}

      <section style={{ marginBottom: "1.2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.9rem" }}>
          {facilityDefinitions.map((def) => (
            <FacilityCard key={def.id} definition={def} baseState={baseState} onUpgrade={upgrade} />
          ))}
        </div>
      </section>

      <button className="aa-button" onClick={resetBase}>
        基地状態をリセット
      </button>
    </div>
  );
}
