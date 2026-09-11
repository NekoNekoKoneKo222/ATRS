import type { ExplorationState } from "@astral-archive/core";
import { getAvailableDestinations } from "@astral-archive/core";
import { galaxyMap } from "./explorationData.js";
import { NodeCard } from "./components/NodeCard.js";
import { ExplorationLog } from "./components/ExplorationLog.js";

interface Props {
  explorationState: ExplorationState;
  travel: (targetNodeId: string) => void;
  explore: () => void;
  resetExploration: () => void;
  lastMessage: string | null;
}

export function ExplorationScreen({ explorationState, travel, explore, resetExploration, lastMessage }: Props) {
  const discoveredIds = new Set(explorationState.discoveredNodeIds);
  const reachableIds = new Set(getAvailableDestinations(explorationState, galaxyMap).map((n) => n.id));

  const discoveredNodes = galaxyMap.nodes.filter((n) => discoveredIds.has(n.id));
  const maxTier = Math.max(...galaxyMap.nodes.map((n) => n.tier));
  const tiers = Array.from({ length: maxTier + 1 }, (_, i) => i);

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>
          {galaxyMap.name}
        </h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 6 — ノードを辿って未知の宙域を探索する（発見済み {discoveredNodes.length} / {galaxyMap.nodes.length} ノード）
        </p>
      </header>

      {lastMessage && (
        <div className="aa-panel" style={{ marginBottom: "1rem", borderColor: "var(--aa-signal-rose)", color: "var(--aa-signal-rose)" }}>
          {lastMessage}
        </div>
      )}

      <section style={{ marginBottom: "1.2rem", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: "1.2rem", minWidth: "max-content", paddingBottom: "0.5rem" }}>
          {tiers.map((tier) => {
            const nodesInTier = discoveredNodes.filter((n) => n.tier === tier);
            if (nodesInTier.length === 0) return null;
            return (
              <div key={tier} style={{ display: "flex", flexDirection: "column", gap: "0.7rem", minWidth: "230px" }}>
                <span className="aa-mono" style={{ fontSize: "0.68rem", color: "var(--aa-text-dim)" }}>
                  階層 {tier}
                </span>
                {nodesInTier.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    isCurrent={node.id === explorationState.currentNodeId}
                    isExplored={explorationState.exploredNodeIds.includes(node.id)}
                    isDirectlyReachable={reachableIds.has(node.id)}
                    onTravel={travel}
                    onExplore={explore}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: "1.2rem" }}>
        <h2 style={{ fontSize: "1rem", color: "var(--aa-text-dim)", marginBottom: "0.5rem" }}>探索ログ</h2>
        <ExplorationLog log={explorationState.log} />
      </section>

      <button className="aa-button" onClick={resetExploration}>
        探索状態をリセット
      </button>
    </div>
  );
}
