import { useCallback, useMemo, useState } from "react";
import {
  loadJsonWithSchema,
  loadModEntities,
  buildEntityRegistrySet,
  resolveModLoadOrder,
  ModManifestSchema,
  type ModManifest,
  type LoadedModEntities,
  type ModEntityFile,
} from "@astral-archive/core";
import { baseEntities } from "./modsData.js";

import exampleModManifestRaw from "../../../../mods/example-mod/manifest.json?raw";
import exampleModCharacterRaw from "../../../../mods/example-mod/entities/characters/char_kestrel_iyo.json?raw";

export interface LoadedMod {
  manifest: ModManifest;
  entities: LoadedModEntities;
  /** 無効化されたMODはレジストリ統合から除外される（削除はしない） */
  enabled: boolean;
}

export function useMods() {
  const [loadedMods, setLoadedMods] = useState<LoadedMod[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * ファイル群（manifest.json + entities/配下のJSON）からMODを1件読み込む。
   * すでに読み込み済みのMODと合わせて依存関係・競合・循環依存を検証し、
   * 問題がなければ追加する。任意コードは一切実行せず、JSON.parseのみを行う。
   */
  const addMod = useCallback(
    (manifestRaw: string, entityFiles: ModEntityFile[]) => {
      const manifestResult = loadJsonWithSchema(manifestRaw, ModManifestSchema, "uploading-mod");
      if (!manifestResult.ok || !manifestResult.value) {
        setMessage(`manifest.jsonの検証に失敗しました：${(manifestResult.errors ?? []).join(" / ")}`);
        return;
      }
      const manifest = manifestResult.value;

      setLoadedMods((prev) => {
        if (prev.some((m) => m.manifest.id === manifest.id)) {
          setMessage(`MOD「${manifest.id}」は既に読み込まれています。`);
          return prev;
        }

        const candidateManifests = [...prev.map((m) => m.manifest), manifest];
        const resolution = resolveModLoadOrder(candidateManifests);
        if (!resolution.ok) {
          setMessage(`MODの読み込みに失敗しました：${resolution.errors.join(" / ")}`);
          return prev;
        }

        const entities = loadModEntities(entityFiles, manifest.id);
        if (entities.errors.length > 0) {
          setMessage(
            `MOD「${manifest.id}」を読み込みましたが、一部のファイルでエラーがありました：${entities.errors.join(" / ")}`
          );
        } else {
          setMessage(`MOD「${manifest.name}」(${manifest.version}) を読み込みました。`);
        }

        return [...prev, { manifest, entities, enabled: true }];
      });
    },
    []
  );

  const removeMod = useCallback((modId: string) => {
    setLoadedMods((prev) => prev.filter((m) => m.manifest.id !== modId));
    setMessage(null);
  }, []);

  /** MODの有効/無効を切り替える（アンインストールはせず、レジストリ統合対象から外すだけ） */
  const toggleModEnabled = useCallback((modId: string) => {
    setLoadedMods((prev) => prev.map((m) => (m.manifest.id === modId ? { ...m, enabled: !m.enabled } : m)));
  }, []);

  /** 同梱のサンプルMOD（mods/example-mod）を読み込む。動作確認用。 */
  const loadExampleMod = useCallback(() => {
    addMod(exampleModManifestRaw, [
      { path: "entities/characters/char_kestrel_iyo.json", content: exampleModCharacterRaw },
    ]);
  }, [addMod]);

  const registries = useMemo(() => {
    const mods = loadedMods
      .filter((m) => m.enabled)
      .map((m) => ({
        sourceId: m.manifest.id,
        priority: m.manifest.priority,
        entities: m.entities,
      }));
    return buildEntityRegistrySet(baseEntities, mods);
  }, [loadedMods]);

  return { loadedMods, message, addMod, removeMod, toggleModEnabled, loadExampleMod, registries };
}
