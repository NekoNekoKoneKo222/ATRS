export interface NodeTypeMeta {
  label: string;
  color: string;
}

const NODE_TYPE_META: Record<string, NodeTypeMeta> = {
  base: { label: "基地", color: "var(--aa-signal-teal)" },
  planet: { label: "惑星", color: "var(--aa-signal-amber)" },
  asteroidBelt: { label: "小惑星帯", color: "#8f9bb3" },
  spaceStation: { label: "宇宙ステーション", color: "var(--aa-signal-violet)" },
  unknownRegion: { label: "未知領域", color: "var(--aa-signal-rose)" },
  giantCelestial: { label: "巨大天体", color: "var(--aa-signal-amber)" },
  finalRegion: { label: "最終領域", color: "var(--aa-signal-rose)" },
};

export function getNodeTypeMeta(nodeType: string): NodeTypeMeta {
  return NODE_TYPE_META[nodeType] ?? { label: nodeType, color: "var(--aa-text-dim)" };
}

const ENCOUNTER_TYPE_LABEL: Record<string, string> = {
  resource: "資源",
  anomaly: "星異体",
  enemy: "敵",
  npc: "NPC",
  ruins: "遺跡",
  event: "イベント",
  newPlanet: "新惑星",
};

export function getEncounterTypeLabel(type: string): string {
  return ENCOUNTER_TYPE_LABEL[type] ?? type;
}
