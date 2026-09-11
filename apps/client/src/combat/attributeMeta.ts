import attributeDefinitionsJson from "../../../../packages/data/attributes/definitions.json";

export interface AttributeMeta {
  id: string;
  name: string;
  color: string;
}

const definitions = attributeDefinitionsJson as AttributeMeta[];

export const attributesById = new Map(definitions.map((a) => [a.id, a]));

export function getAttributeMeta(id: string): AttributeMeta {
  return attributesById.get(id) ?? { id, name: id, color: "#8f9bb3" };
}

export const ALL_ATTRIBUTE_IDS = definitions.map((a) => a.id);
