export interface ResourceMeta {
  id: string;
  name: string;
  color: string;
}

const RESOURCE_META: Record<string, ResourceMeta> = {
  ENERGY: { id: "ENERGY", name: "エネルギー", color: "var(--aa-signal-amber)" },
  CREDITS: { id: "CREDITS", name: "クレジット", color: "var(--aa-signal-teal)" },
  RESEARCH_POINTS: { id: "RESEARCH_POINTS", name: "研究ポイント", color: "var(--aa-signal-violet)" },
  ALLOY: { id: "ALLOY", name: "合金資材", color: "#8f9bb3" },
};

export function getResourceMeta(id: string): ResourceMeta {
  return RESOURCE_META[id] ?? { id, name: id, color: "var(--aa-text-dim)" };
}

export const ALL_RESOURCE_IDS = Object.keys(RESOURCE_META);
