import { useState, lazy, Suspense } from "react";
import { useBase } from "./base/useBase.js";
import { useContainment } from "./containment/useContainment.js";
import { useExploration } from "./exploration/useExploration.js";
import { useSupabaseAuth } from "./supabase/useSupabaseAuth.js";
import { useFirebaseAuth } from "./firebase/useFirebaseAuth.js";
import { firebaseConfigured } from "./firebase/firebaseClient.js";
import { useMods } from "./mods/useMods.js";
import { useStory } from "./story/useStory.js";

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
const FirebaseAccountScreen = lazy(() => import("./firebase/FirebaseAccountScreen.js").then((m) => ({ default: m.FirebaseAccountScreen })));
const SaveScreen = lazy(() => import("./save/SaveScreen.js").then((m) => ({ default: m.SaveScreen })));
const ModManagerScreen = lazy(() =>
  import("./mods/ModManagerScreen.js").then((m) => ({ default: m.ModManagerScreen }))
);
const WorkshopScreen = lazy(() =>
  import("./workshop/WorkshopScreen.js").then((m) => ({ default: m.WorkshopScreen }))
);
const StoryScreen = lazy(() => import("./story/StoryScreen.js").then((m) => ({ default: m.StoryScreen })));

type ScreenId =
  | "base"
  | "exploration"
  | "containment"
  | "combat"
  | "account"
  | "save"
  | "mods"
  | "workshop"
  | "story";

const TABS: { id: ScreenId; label: string }[] = [
  { id: "story", label: "ストーリー" },
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
  const [screen, setScreen] = useState<ScreenId>("story");
  const { baseState, upgrade, resetBase, loadBaseState, lastMessage: baseMessage, gainResources, trySpendResources } =
    useBase();
  const containment = useContainment({ onSpendResources: trySpendResources });
  const exploration = useExploration({
    onGainResources: gainResources,
    onAnomalyDiscovered: containment.discover,
  });
  const auth = useSupabaseAuth();
  const firebaseAccount = useFirebaseAuth();
  const mods = useMods();
  const story = useStory({
    registries: mods.registries,
    onDiscoverAnomaly: containment.discover,
    onGainResources: gainResources,
  });

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
        {screen === "story" && (
          <StoryScreen
            state={story.state}
            storyData={story.storyData}
            currentEvent={story.currentEvent}
            message={story.message}
            begin={story.begin}
            advance={story.advance}
            loadStoryState={story.loadStoryState}
            resetStory={story.resetStory}
            isChapterLocked={story.isChapterLocked}
            onRequestScreen={(target) => setScreen(target)}
          />
        )}
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
        {screen === "account" && (firebaseConfigured ? (
          <FirebaseAccountScreen
            status={firebaseAccount.status}
            user={firebaseAccount.user}
            errorMessage={firebaseAccount.errorMessage}
            signUp={firebaseAccount.signUp}
            signIn={firebaseAccount.signIn}
            signOut={firebaseAccount.signOut}
          />
        ) : (
          <AuthScreen
            status={auth.status}
            session={auth.session}
            errorMessage={auth.errorMessage}
            signUp={auth.signUp}
            signIn={auth.signIn}
            signOut={auth.signOut}
          />
        ))}
        {screen === "save" && (
          <SaveScreen
            baseState={baseState}
            explorationState={exploration.explorationState}
            containmentCollection={containment.collection}
            storyState={story.state}
            loadBaseState={loadBaseState}
            loadExplorationState={exploration.loadExplorationState}
            loadContainmentCollection={containment.loadContainmentCollection}
            loadStoryState={story.loadStoryState}
            session={auth.session}
            firebaseUser={firebaseAccount.user}
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
