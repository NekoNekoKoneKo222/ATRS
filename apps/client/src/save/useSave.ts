import { useCallback, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createSaveData,
  serializeSaveData,
  deserializeSaveData,
  checkSaveModRequirements,
  compareSaveRecency,
  SaveDataSchema,
  type SaveData,
  type BaseState,
  type ExplorationState,
  type ContainmentCollection,
} from "@astral-archive/core";
import { upsertCloudSave, fetchCloudSave, replaceSaveMods } from "@astral-archive/supabase";
import { supabaseClient } from "../supabase/supabaseClient.js";
import { GAME_VERSION, DEFAULT_SLOT_NAME, INSTALLED_MODS } from "./saveMeta.js";
import { writeLocalSave, readLocalSave } from "./localSaveStorage.js";

interface UseSaveDeps {
  baseState: BaseState;
  explorationState: ExplorationState;
  containmentCollection: ContainmentCollection;
  loadBaseState: (state: BaseState) => void;
  loadExplorationState: (state: ExplorationState) => void;
  loadContainmentCollection: (collection: ContainmentCollection) => void;
  session: Session | null;
}

export interface ConflictInfo {
  localSave: SaveData;
  cloudSave: SaveData;
  comparison: "a_newer" | "b_newer" | "same"; // a=local, b=cloud
}

export function useSave(deps: UseSaveDeps) {
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const buildCurrentSave = useCallback((): SaveData => {
    return createSaveData({
      gameVersion: GAME_VERSION,
      slotName: DEFAULT_SLOT_NAME,
      base: deps.baseState,
      exploration: deps.explorationState,
      containment: deps.containmentCollection,
      mods: INSTALLED_MODS,
    });
  }, [deps.baseState, deps.explorationState, deps.containmentCollection]);

  /** MOD要件を確認し、満たしていればセーブ内容を実際のゲーム状態へ反映する */
  const applySave = useCallback(
    (save: SaveData): boolean => {
      const modCheck = checkSaveModRequirements(save.mods, INSTALLED_MODS);
      if (!modCheck.ok) {
        const missingLabels = modCheck.missing.map((m) => `${m.modId}@${m.modVersion}`);
        const mismatchLabels = modCheck.versionMismatched.map(
          (m) => `${m.required.modId}@${m.required.modVersion}（現在: ${m.installedVersion}）`
        );
        setMessage(
          `このセーブには次のMODが必要です：${[...missingLabels, ...mismatchLabels].join(", ")}`
        );
        return false;
      }

      deps.loadBaseState(save.base);
      deps.loadExplorationState(save.exploration);
      deps.loadContainmentCollection(save.containment);
      setMessage(`セーブ「${save.meta.slotName}」を読み込みました（保存日時: ${save.meta.savedAt}）。`);
      return true;
    },
    [deps]
  );

  const saveLocal = useCallback(() => {
    const save = buildCurrentSave();
    const ok = writeLocalSave(DEFAULT_SLOT_NAME, serializeSaveData(save));
    setMessage(ok ? "ローカルに保存しました。" : "ローカル保存に失敗しました。");
  }, [buildCurrentSave]);

  const loadLocal = useCallback(() => {
    const raw = readLocalSave(DEFAULT_SLOT_NAME);
    if (!raw) {
      setMessage("ローカルセーブが見つかりません。");
      return;
    }
    const result = deserializeSaveData(raw);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    applySave(result.data);
  }, [applySave]);

  const saveToCloud = useCallback(async () => {
    if (!supabaseClient || !deps.session) {
      setMessage("クラウド保存にはサインインが必要です。");
      return;
    }
    const save = buildCurrentSave();
    const result = await upsertCloudSave(supabaseClient, {
      ownerId: deps.session.user.id,
      slotName: save.meta.slotName,
      gameVersion: save.meta.gameVersion,
      saveSchemaVersion: save.meta.saveSchemaVersion,
      saveData: save as unknown as Record<string, unknown>,
    });

    if (!result.ok || !result.data) {
      setMessage(result.error ?? "クラウド保存に失敗しました。");
      return;
    }

    await replaceSaveMods(supabaseClient, result.data.id, save.mods);
    setMessage("クラウドに保存しました。");
  }, [buildCurrentSave, deps.session]);

  const loadCloud = useCallback(async () => {
    if (!supabaseClient || !deps.session) {
      setMessage("クラウド読み込みにはサインインが必要です。");
      return;
    }
    const result = await fetchCloudSave(supabaseClient, deps.session.user.id, DEFAULT_SLOT_NAME);
    if (!result.ok || !result.data) {
      setMessage("クラウドセーブが見つかりません。");
      return;
    }
    const parsed = SaveDataSchema.safeParse(result.data.save_data);
    if (!parsed.success) {
      setMessage("クラウドセーブのデータ形式が不正です。");
      return;
    }
    applySave(parsed.data as SaveData);
  }, [applySave, deps.session]);

  /** ローカルとクラウドの両方を確認し、両方に差異があれば選択待ちの競合情報を作る */
  const checkConflict = useCallback(async () => {
    const localRaw = readLocalSave(DEFAULT_SLOT_NAME);
    const localResult = localRaw ? deserializeSaveData(localRaw) : null;
    const localSave = localResult?.ok ? localResult.data : null;

    if (!supabaseClient || !deps.session) {
      setMessage(localSave ? "ローカルセーブのみ存在します（クラウド未接続）。" : "ローカル・クラウドともにセーブが見つかりません。");
      return;
    }

    const cloudResult = await fetchCloudSave(supabaseClient, deps.session.user.id, DEFAULT_SLOT_NAME);
    const cloudParsed = cloudResult.ok && cloudResult.data ? SaveDataSchema.safeParse(cloudResult.data.save_data) : null;
    const cloudSave = cloudParsed?.success ? (cloudParsed.data as SaveData) : null;

    if (localSave && cloudSave) {
      const comparison = compareSaveRecency(localSave.meta.savedAt, cloudSave.meta.savedAt);
      if (comparison === "same") {
        setMessage("ローカルとクラウドのセーブは同じ保存日時です。");
        return;
      }
      setConflict({ localSave, cloudSave, comparison });
      return;
    }

    if (localSave && !cloudSave) {
      setMessage("ローカルセーブのみ存在します。");
    } else if (!localSave && cloudSave) {
      setMessage("クラウドセーブのみ存在します。");
    } else {
      setMessage("ローカル・クラウドともにセーブが見つかりません。");
    }
  }, [deps.session]);

  const resolveConflict = useCallback(
    (choice: "local" | "cloud") => {
      if (!conflict) return;
      applySave(choice === "local" ? conflict.localSave : conflict.cloudSave);
      setConflict(null);
    },
    [conflict, applySave]
  );

  return {
    message,
    conflict,
    saveLocal,
    loadLocal,
    saveToCloud,
    loadCloud,
    checkConflict,
    resolveConflict,
  };
}
