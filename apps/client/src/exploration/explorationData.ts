import type { ExplorationState, GalaxyMapDefinition } from "@astral-archive/core";
import { initializeExploration } from "@astral-archive/core";

import galaxyMapJson from "../../../../packages/data/exploration/galaxy_map.json";

export const galaxyMap = galaxyMapJson as unknown as GalaxyMapDefinition;

export const START_NODE_ID = "node_base";

export function createInitialExplorationState(): ExplorationState {
  return initializeExploration(galaxyMap, START_NODE_ID);
}
