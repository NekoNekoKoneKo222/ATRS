import type { AstralSupabaseClient } from "./client.js";
import type { SaveRow, SaveModRow } from "./types/database.js";
import type { DataResult } from "./profiles.js";

/**
 * クラウドセーブを作成/更新する（upsert）。
 * (owner_id, slot_name) が一意キーのため、同じスロットへの再保存は上書きになる。
 */
export async function upsertCloudSave(
  client: AstralSupabaseClient,
  save: {
    ownerId: string;
    slotName: string;
    gameVersion: string;
    saveSchemaVersion: string;
    saveData: Record<string, unknown>;
  }
): Promise<DataResult<SaveRow>> {
  const { data, error } = await client
    .from("saves")
    .upsert(
      {
        owner_id: save.ownerId,
        slot_name: save.slotName,
        game_version: save.gameVersion,
        save_schema_version: save.saveSchemaVersion,
        save_data: save.saveData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,slot_name" }
    )
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

/** 指定スロットのクラウドセーブを取得する */
export async function fetchCloudSave(
  client: AstralSupabaseClient,
  ownerId: string,
  slotName: string
): Promise<DataResult<SaveRow>> {
  const { data, error } = await client
    .from("saves")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("slot_name", slotName)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "save_not_found" };
  return { ok: true, data };
}

/** 自分のクラウドセーブ一覧を取得する */
export async function listCloudSaves(
  client: AstralSupabaseClient,
  ownerId: string
): Promise<DataResult<SaveRow[]>> {
  const { data, error } = await client
    .from("saves")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

/** クラウドセーブを削除する */
export async function deleteCloudSave(
  client: AstralSupabaseClient,
  ownerId: string,
  slotName: string
): Promise<DataResult<null>> {
  const { error } = await client.from("saves").delete().eq("owner_id", ownerId).eq("slot_name", slotName);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

/**
 * セーブが使用しているMOD一覧をsave_modsへ置き換える。
 * modIdはmods.idのUUIDを指す点に注意（MOD配布システム実装後、実際のUUIDを渡す想定）。
 */
export async function replaceSaveMods(
  client: AstralSupabaseClient,
  saveId: string,
  mods: { modId: string; modVersion: string }[]
): Promise<DataResult<null>> {
  const { error: deleteError } = await client.from("save_mods").delete().eq("save_id", saveId);
  if (deleteError) return { ok: false, error: deleteError.message };

  if (mods.length === 0) return { ok: true, data: null };

  const rows: SaveModRow[] = mods.map((m) => ({ save_id: saveId, mod_id: m.modId, mod_version: m.modVersion }));
  const { error: insertError } = await client.from("save_mods").insert(rows);
  if (insertError) return { ok: false, error: insertError.message };

  return { ok: true, data: null };
}

/** セーブが使用しているMOD一覧を取得する */
export async function fetchSaveMods(
  client: AstralSupabaseClient,
  saveId: string
): Promise<DataResult<SaveModRow[]>> {
  const { data, error } = await client.from("save_mods").select("*").eq("save_id", saveId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}
