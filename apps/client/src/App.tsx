import { useState, lazy, Suspense } from "react";
import { useBase } from "./base/useBase.js";
import { useContainment } from "./containment/useContainment.js";
import { useExploration } from "./exploration/useExploration.js";
import { useSupabaseAuth } from "./supabase/useSupabaseAuth.js";
import { useMods } from "./mods/useMods.js";

// 各画面は選択されたタブのときだけ必要になるため、React.lazyで遅延読み込みし
// 初回表示に不要なコードの評価・パースコストを後回しにする（Phase12最適化）。
const BaseScreen = lazy(() => import("./base/BaseScreen.js").then((m) => ({ default: m.BaseScreen })));
const ExplorationScreen = lazy(() =>
  import("./exploration/ExplorationScreen.js").then((m) => ({ default: m.ExplorationScreen }))
);
const ContainmentScreen = lazy(() =>
  import("./containment/ContainmentScreen.js").then((m) => ({ default: m.ContainmentScreen }))
);
const CombatScreen = lazy(() => import("./combat/CombatScreen.js").then((m) => ({ default: m.CombatScreen })));
const AuthScreen = lazy(() => import("./supabase/AuthScreen.js").then((m) => ({ default: m.AuthScreen })));
const SaveScreen = lazy(() => import("./save/SaveScreen.js").then((m) => ({ default: m.SaveScreen })));
const ModManagerScreen = lazy(() =>
  import("./mods/ModManagerScreen.js").then((m) => ({ default: m.ModManagerScreen }))
);
const WorkshopScreen = lazy(() =>
  import("./workshop/WorkshopScreen.js").then((m) => ({ default: m.WorkshopScreen }))
);

type ScreenId = "base" | "exploration" | "containment" | "combat" | "account" | "save" | "mods" | "workshop";

const TABS: { id: ScreenId; label: string }[] = [
  { id: "base", label: "基地" },
  { id: "exploration", label: "探索" },
  { id: "containment", label: "研究" },
  { id: "combat", label: "戦闘" },
  { id: "account", label: "アカウント" },
  { id: "save", label: "セーブ" },
  { id: "mods", label: "MOD" },
  { id: "workshop", label: "WORKSHOP" },
];

function ScreenLoadingFallback() {
  return <div style={{ padding: "2rem", color: "var(--aa-text-dim)" }}>読み込み中...</div>;
}

export function App() {
  const [screen, setScreen] = useState<ScreenId>("base");
  const { baseState, upgrade, resetBase, loadBaseState, lastMessage: baseMessage, gainResources, trySpendResources } =
    useBase();
  const containment = useContainment({ onSpendResources: trySpendResources });
  const exploration = useExploration({
    onGainResources: gainResources,
    onAnomalyDiscovered: containment.discover,
  });
  const auth = useSupabaseAuth();
  const mods = useMods();

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.8rem 2rem 0",
          maxWidth: "1200px",
          margin: "0 auto",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`aa-button${screen === tab.id ? " aa-button--primary" : ""}`}
            onClick={() => setScreen(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <Suspense fallback={<ScreenLoadingFallback />}>
        {screen === "base" && (
          <BaseScreen baseState={baseState} upgrade={upgrade} resetBase={resetBase} lastMessage={baseMessage} />
        )}
        {screen === "exploration" && (
          <ExplorationScreen
            explorationState={exploration.explorationState}
            travel={exploration.travel}
            explore={exploration.explore}
            resetExploration={exploration.resetExploration}
            lastMessage={exploration.lastMessage}
          />
        )}
        {screen === "containment" && (
          <ContainmentScreen
            collection={containment.collection}
            resources={baseState.resources}
            invest={containment.invest}
            stabilize={containment.stabilize}
            tick={containment.tick}
            resetContainment={containment.resetContainment}
            lastMessage={containment.lastMessage}
          />
        )}
        {screen === "combat" && <CombatScreen onEnemyDefeated={containment.discover} />}
        {screen === "account" && (
          <AuthScreen
            status={auth.status}
            session={auth.session}
            errorMessage={auth.errorMessage}
            signUp={auth.signUp}
            signIn={auth.signIn}
            signOut={auth.signOut}
          />
        )}
        {screen === "save" && (
          <SaveScreen
            baseState={baseState}
            explorationState={exploration.explorationState}
            containmentCollection={containment.collection}
            loadBaseState={loadBaseState}
            loadExplorationState={exploration.loadExplorationState}
            loadContainmentCollection={containment.loadContainmentCollection}
            session={auth.session}
          />
        )}
        {screen === "mods" && (
          <ModManagerScreen
            loadedMods={mods.loadedMods}
            message={mods.message}
            addMod={mods.addMod}
            removeMod={mods.removeMod}
            toggleModEnabled={mods.toggleModEnabled}
            loadExampleMod={mods.loadExampleMod}
            registries={mods.registries}
          />
        )}
        {screen === "workshop" && <WorkshopScreen onInstallMod={mods.addMod} session={auth.session} />}
      </Suspense>
    </div>
  );
}
