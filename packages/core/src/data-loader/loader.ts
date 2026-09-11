import type { z } from "zod";

export interface LoadResult<T> {
  ok: boolean;
  value?: T;
  errors?: string[];
  /** どのソース（本体データ or MOD ID）から来たか、衝突検出用 */
  sourceId: string;
}

/**
 * JSON文字列をスキーマ検証してロードする。
 * これがMODデータの唯一の入り口になる：
 * - JSON.parse のみを使用し、eval/Function等の任意コード実行は一切行わない
 * - スキーマに合致しないデータは例外を投げず、LoadResult.errorsとして返す
 */
export function loadJsonWithSchema<T>(
  raw: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  sourceId: string
): LoadResult<T> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (e) {
    return { ok: false, errors: [`JSON構文エラー: ${(e as Error).message}`], sourceId };
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      sourceId,
    };
  }

  return { ok: true, value: result.data, sourceId };
}

export interface RegistryEntry<T> {
  value: T;
  sourceId: string;
  priority: number;
}

/**
 * ID -> 定義 のレジストリ。
 * 同じIDが複数ソース（本体 + 複数MOD）から来た場合、priorityが高い方を採用し、
 * 衝突をログに残す（サイレントに上書きしない）。
 */
export class DataRegistry<T extends { id: string }> {
  private entries = new Map<string, RegistryEntry<T>>();
  public conflicts: Array<{ id: string; losers: string[]; winner: string }> = [];

  register(value: T, sourceId: string, priority: number): void {
    const existing = this.entries.get(value.id);
    if (!existing) {
      this.entries.set(value.id, { value, sourceId, priority });
      return;
    }

    if (priority >= existing.priority) {
      this.conflicts.push({ id: value.id, losers: [existing.sourceId], winner: sourceId });
      this.entries.set(value.id, { value, sourceId, priority });
    } else {
      this.conflicts.push({ id: value.id, losers: [sourceId], winner: existing.sourceId });
    }
  }

  get(id: string): T | undefined {
    return this.entries.get(id)?.value;
  }

  all(): T[] {
    return Array.from(this.entries.values()).map((e) => e.value);
  }
}
