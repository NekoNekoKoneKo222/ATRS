import type { ContainmentCollection, ResourcePool } from "@astral-archive/core";
import { anomalyDefsById } from "./containmentData.js";
import { AnomalyCard } from "./components/AnomalyCard.js";

const RESEARCH_INVEST_AMOUNT = 20;
const RESEARCH_INVEST_COST: Partial<ResourcePool> = { RESEARCH_POINTS: 20 };
const STABILIZE_AMOUNT = 15;
const STABILIZE_COST: Partial<ResourcePool> = { ENERGY: 15 };

interface Props {
  collection: ContainmentCollection;
  resources: ResourcePool;
  invest: (anomalyId: string, amount: number, cost: Partial<ResourcePool>) => void;
  stabilize: (anomalyId: string, amount: number, cost: Partial<ResourcePool>) => void;
  tick: (resources: ResourcePool) => void;
  resetContainment: () => void;
  lastMessage: string | null;
}

export function ContainmentScreen({
  collection,
  resources,
  invest,
  stabilize,
  tick,
  resetContainment,
  lastMessage,
}: Props) {
  const handleTick = () => tick(resources);

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>星異体アーカイブ</h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 7 — 収容中の星異体を安定させ、研究を進める（発見数 {collection.records.length}）
        </p>
      </header>

      {lastMessage && (
        <div className="aa-panel" style={{ marginBottom: "1rem", borderColor: "var(--aa-signal-amber)", color: "var(--aa-signal-amber)" }}>
          {lastMessage}
        </div>
      )}

      {collection.records.length === 0 ? (
        <div className="aa-panel" style={{ color: "var(--aa-text-dim)" }}>
          まだ星異体を発見していません。戦闘での撃破、または探索での発見によって収容対象が登録されます。
        </div>
      ) : (
        <section style={{ marginBottom: "1.2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.9rem" }}>
            {collection.records.map((record) => {
              const definition = anomalyDefsById.get(record.anomalyId);
              if (!definition) return null;
              return (
                <AnomalyCard
                  key={record.anomalyId}
                  record={record}
                  definition={definition}
                  researchCost={RESEARCH_INVEST_COST.RESEARCH_POINTS ?? 0}
                  stabilizeCost={STABILIZE_COST.ENERGY ?? 0}
                  onInvestResearch={(anomalyId) => invest(anomalyId, RESEARCH_INVEST_AMOUNT, RESEARCH_INVEST_COST)}
                  onStabilize={(anomalyId) => stabilize(anomalyId, STABILIZE_AMOUNT, STABILIZE_COST)}
                />
              );
            })}
          </div>
        </section>
      )}

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button className="aa-button" onClick={handleTick} disabled={collection.records.length === 0}>
          管理サイクルを進める
        </button>
        <button className="aa-button" onClick={resetContainment}>
          収容状態をリセット
        </button>
      </div>
    </div>
  );
}
