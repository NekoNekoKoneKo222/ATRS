import type { ModManifest } from "./schemas.js";

export interface ModResolutionResult {
  ok: boolean;
  loadOrder: string[];
  errors: string[];
}

/**
 * MODのロード順を決定する。
 * - dependencies を満たさないMODは除外しエラー
 * - conflicts に列挙されたMOD同士が両方有効ならエラー
 * - 循環依存を検出したらエラー
 * - 同順位は priority (降順) → id (昇順) で安定ソート
 */
export function resolveModLoadOrder(
  manifests: ModManifest[]
): ModResolutionResult {
  const errors: string[] = [];
  const byId = new Map(manifests.map((m) => [m.id, m]));

  // 競合検出
  for (const m of manifests) {
    for (const conflictId of m.conflicts) {
      if (byId.has(conflictId)) {
        errors.push(`MOD競合: "${m.id}" は "${conflictId}" と競合しています`);
      }
    }
  }

  // 依存関係の存在確認
  for (const m of manifests) {
    for (const dep of m.dependencies) {
      const found = byId.get(dep.id);
      if (!found) {
        errors.push(`MOD "${m.id}" が必要とする依存 "${dep.id}@${dep.version}" が見つかりません`);
      } else if (found.version !== dep.version) {
        errors.push(
          `MOD "${m.id}" は "${dep.id}@${dep.version}" を要求していますが、実際は ${found.version} です`
        );
      }
    }
  }

  // トポロジカルソート（依存先を先にロード）+ 循環依存検出
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];
  let hasCycle = false;

  function visit(id: string, path: string[]): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      hasCycle = true;
      errors.push(`循環依存を検出: ${[...path, id].join(" -> ")}`);
      return;
    }
    const manifest = byId.get(id);
    if (!manifest) return;

    visiting.add(id);
    for (const dep of manifest.dependencies) {
      if (byId.has(dep.id)) {
        visit(dep.id, [...path, id]);
      }
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }

  const sortedIds = [...manifests]
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .map((m) => m.id);

  for (const id of sortedIds) {
    visit(id, []);
  }

  return {
    ok: errors.length === 0 && !hasCycle,
    loadOrder: order,
    errors,
  };
}
