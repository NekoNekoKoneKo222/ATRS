/**
 * 属性システム（完全オリジナル）。
 * 初期属性は6種だが、MODによって自由に追加・変更できるように
 * 「文字列ID」で扱い、TypeScriptの union には固定しない。
 *
 * 重要：ASTRAL ARCHIVEの属性は「じゃんけん」方式にしない。
 * HEATがFROSTに強い、といった属性同士の固定的な相性表は持たせず、
 * 星異体・キャラクターなど「個体ごと」に6属性すべての耐性値を持たせる。
 * 同じHEAT属性の攻撃でも、対象によって効き方がまったく異なる設計とする。
 */
export type AttributeId = string;

/** ゲーム本体が最初に同梱する初期属性ID一覧（MODで拡張可能） */
export const BASE_ATTRIBUTE_IDS = [
  "HEAT",
  "FROST",
  "VOLT",
  "VOID",
  "GRAVITY",
  "LIGHT",
] as const;

export interface AttributeDefinition {
  id: AttributeId;
  name: string;
  description: string;
  /** UIでの表示色 (hex) */
  color: string;
  /** MOD由来かどうか */
  source: "base" | "mod";
}
