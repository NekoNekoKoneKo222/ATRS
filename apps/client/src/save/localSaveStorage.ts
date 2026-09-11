const LOCAL_SAVE_KEY_PREFIX = "astral-archive:save:";

function keyFor(slotName: string): string {
  return `${LOCAL_SAVE_KEY_PREFIX}${slotName}`;
}

/** ローカルセーブ(JSON文字列)を書き込む。失敗した場合はfalseを返す。 */
export function writeLocalSave(slotName: string, raw: string): boolean {
  try {
    window.localStorage.setItem(keyFor(slotName), raw);
    return true;
  } catch {
    return false;
  }
}

/** ローカルセーブ(JSON文字列)を読み込む。存在しない・失敗した場合はnull。 */
export function readLocalSave(slotName: string): string | null {
  try {
    return window.localStorage.getItem(keyFor(slotName));
  } catch {
    return null;
  }
}

export function deleteLocalSave(slotName: string): void {
  try {
    window.localStorage.removeItem(keyFor(slotName));
  } catch {
    // ignore
  }
}
