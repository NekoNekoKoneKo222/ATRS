import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { deserializeSaveData, serializeSaveData, type SaveData } from "@astral-archive/core";
import { firebaseDb } from "./firebaseClient.js";

const MAX_SAVE_BYTES = 256_000;

export async function saveToFirestore(uid: string, save: SaveData): Promise<void> {
  if (!firebaseDb) throw new Error("Firebaseが設定されていません。");
  const saveJson = serializeSaveData(save);
  if (new TextEncoder().encode(saveJson).length > MAX_SAVE_BYTES) {
    throw new Error("セーブデータが256KBを超えています。ローカル保存を使ってください。");
  }
  // IDはユーザーの認証UIDからのみ作る。セキュリティルールでもUIDを再確認する。
  await setDoc(doc(firebaseDb, "users", uid, "saves", save.meta.slotName), {
    slotName: save.meta.slotName,
    gameVersion: save.meta.gameVersion,
    saveSchemaVersion: save.meta.saveSchemaVersion,
    saveJson,
    updatedAt: serverTimestamp(),
  });
}

export async function loadFromFirestore(uid: string, slotName: string): Promise<SaveData | null> {
  if (!firebaseDb) throw new Error("Firebaseが設定されていません。");
  const snapshot = await getDoc(doc(firebaseDb, "users", uid, "saves", slotName));
  if (!snapshot.exists()) return null;
  const raw: unknown = snapshot.data().saveJson;
  if (typeof raw !== "string") throw new Error("クラウドセーブの形式が不正です。");
  const parsed = deserializeSaveData(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.data;
}
