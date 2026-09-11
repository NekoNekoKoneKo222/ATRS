import type { BaseState, FacilityDefinition } from "@astral-archive/core";

import facilitiesJson from "../../../../packages/data/facilities/base_facilities.json";
import initialBaseStateJson from "../../../../packages/data/base/initial_base_state.json";

export const facilityDefinitions = facilitiesJson as unknown as FacilityDefinition[];

export function createInitialBaseState(): BaseState {
  // JSONを直接返すと複数回のプレイでインスタンスが共有されてしまうため、
  // 呼び出しごとにディープコピーして独立した状態を作る。
  return structuredClone(initialBaseStateJson) as BaseState;
}

export const facilityDefsById = new Map(facilityDefinitions.map((f) => [f.id, f]));
