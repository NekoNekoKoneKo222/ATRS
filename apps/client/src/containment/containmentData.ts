import type { AnomalyDefinition, ContainmentCollection, ContainmentTickConfig } from "@astral-archive/core";

import baseAnomaliesJson from "../../../../packages/data/anomalies/base_anomalies.json";
import containmentConfigJson from "../../../../packages/data/config/containmentConfig.json";

export const anomalyDefinitions = baseAnomaliesJson as unknown as AnomalyDefinition[];
export const anomalyDefsById = new Map(anomalyDefinitions.map((a) => [a.id, a]));
export const containmentConfig = containmentConfigJson as unknown as ContainmentTickConfig;

export function createInitialContainmentCollection(): ContainmentCollection {
  return { records: [] };
}
