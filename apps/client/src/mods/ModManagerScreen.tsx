import type { EntityRegistrySet } from "@astral-archive/core";
import { ModUploader } from "./components/ModUploader.js";
import { LoadedModCard } from "./components/LoadedModCard.js";
import type { LoadedMod } from "./useMods.js";
import type { ModEntityFile } from "@astral-archive/core";

interface Props {
  loadedMods: LoadedMod[];
  message: string | null;
  addMod: (manifestRaw: string, entityFiles: ModEntityFile[]) => void;
  removeMod: (modId: string) => void;
  toggleModEnabled: (modId: string) => void;
  loadExampleMod: () => void;
  registries: EntityRegistrySet;
}

export function ModManagerScreen({
  loadedMods,
  message,
  addMod,
  removeMod,
  toggleModEnabled,
  loadExampleMod,
  registries,
}: Props) {
  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1.2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "0.03em", margin: 0 }}>MODマネージャー</h1>
        <p style={{ color: "var(--aa-text-dim)", margin: "0.3rem 0 0" }}>
          Phase 10/11 — MODはデータ（JSON）としてのみ読み込まれ、任意コードは実行されない
        </p>
      </header>

      {message && (
        <div className="aa-panel" style={{ marginBottom: "1rem", color: "var(--aa-signal-amber)" }}>
          {message}
        </div>
      )}

      <section style={{ marginBottom: "1.2rem" }}>
        <ModUploader onAddMod={addMod} />
      </section>

      <section style={{ marginBottom: "1.2rem" }}>
        <button className="aa-button" onClick={loadExampleMod}>
          同梱のサンプルMOD（example-mod）を読み込む
        </button>
      </section>

      <section style={{ marginBottom: "1.2rem" }}>
        <h2 style={{ fontSize: "1rem", color: "var(--aa-text-dim)", marginBottom: "0.6rem" }}>
          読み込み済みMOD（{loadedMods.length}）
        </h2>
        {loadedMods.length === 0 ? (
          <div className="aa-panel" style={{ color: "var(--aa-text-dim)" }}>
            まだMODは読み込まれていません。ASTRAL WORKSHOPタブからインストールすることもできます。
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.9rem" }}>
            {loadedMods.map((mod) => (
              <LoadedModCard key={mod.manifest.id} mod={mod} onRemove={removeMod} onToggleEnabled={toggleModEnabled} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: "1rem", color: "var(--aa-text-dim)", marginBottom: "0.6rem" }}>統合後のデータ件数（有効なMODのみ反映）</h2>
        <div className="aa-panel aa-mono" style={{ fontSize: "0.8rem", lineHeight: 1.8 }}>
          <div>キャラクター: {registries.characters.all().length}</div>
          <div>星異体: {registries.anomalies.all().length}</div>
          <div>武器: {registries.weapons.all().length}</div>
          <div>スキル: {registries.skills.all().length}</div>
          <div>施設: {registries.facilities.all().length}</div>
          {registries.characters.conflicts.length > 0 && (
            <div style={{ color: "var(--aa-signal-amber)", marginTop: "0.4rem" }}>
              競合（キャラクター）: {registries.characters.conflicts.map((c) => `${c.id} (${c.winner}が優先)`).join(", ")}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
