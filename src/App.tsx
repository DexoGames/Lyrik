import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { CATALOGUES, findCatalogue } from "./catalogues";
import type { CatalogueDef } from "./catalogues/types";
import { useLibrary } from "./game/useLibrary";
import type { Library, SongSet } from "./game/songs";
import type { Mode } from "./game/types";
import { readLastCatalogue, recordLastCatalogue } from "./game/stats";
import { Header } from "./components/Header/Header";
import { StatsModal } from "./components/StatsModal/StatsModal";
import { HowToPlay } from "./components/HowToPlay/HowToPlay";
import { CatalogueHub } from "./screens/CatalogueHub/CatalogueHub";
import { ModeHub } from "./screens/ModeHub/ModeHub";
import { Play } from "./screens/Play/Play";
import { load, save } from "./lib/storage";
import styles from "./App.module.css";

export function App() {
  const { status, lib, error } = useLibrary();
  const [stats, setStats] = useState(false);
  // First-timers get the rules unprompted; after that it is on demand only.
  const [help, setHelp] = useState(() => !load("seen-help", false));
  // Set by whichever catalogue route is mounted, so the chrome can follow it.
  const [catalogue, setCatalogue] = useState<CatalogueDef | null>(null);

  const closeHelp = useCallback(() => {
    setHelp(false);
    save("seen-help", true);
  }, []);

  // The whole page wears the catalogue's skin, so <html> carries the class and
  // the mobile address bar takes its colour.
  useEffect(() => {
    const root = document.documentElement;
    root.className = catalogue?.theme.className ?? "";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", catalogue?.theme.themeColor ?? "#0d0d0d");
  }, [catalogue]);

  return (
    <div className={styles.page}>
      <Header catalogue={catalogue} onStats={() => setStats(true)} onHelp={() => setHelp(true)} />

      {status === "loading" && <Loading text={catalogue?.copy.loading} />}
      {status === "error" && <Failed message={error.message} />}

      {status === "ready" && (
        <Routes>
          <Route
            path="/"
            element={<HubRoute lib={lib} onResolve={setCatalogue} onHelp={() => setHelp(true)} />}
          />
          <Route path="/:catalogueId" element={<CatalogueScreen lib={lib} onResolve={setCatalogue} />} />
          <Route
            path="/:catalogueId/:mode"
            element={
              <CatalogueScreen lib={lib} onResolve={setCatalogue} onStats={() => setStats(true)} />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}

      {catalogue && (
        <StatsModal open={stats} onClose={() => setStats(false)} catalogue={catalogue} />
      )}
      <HowToPlay open={help} onClose={closeHelp} catalogue={catalogue} />
    </div>
  );
}

/** Keeps the chrome's catalogue in sync with whatever route is mounted. */
function CatalogueRoute({
  catalogue,
  onResolve,
  children,
}: {
  catalogue: CatalogueDef | null;
  onResolve: (c: CatalogueDef | null) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    onResolve(catalogue);
  }, [catalogue, onResolve]);
  return <>{children}</>;
}

/**
 * The shelf itself is only worth showing when there is a real choice to make.
 * With one catalogue, or a catalogue already visited before, skip straight to
 * it — "All catalogues" in the chrome (state.showHub) is the way back.
 */
function HubRoute({
  lib,
  onResolve,
  onHelp,
}: {
  lib: Library;
  onResolve: (c: CatalogueDef | null) => void;
  onHelp: () => void;
}) {
  const location = useLocation();
  const forceHub = Boolean((location.state as { showHub?: boolean } | null)?.showHub);

  const ready = useMemo(() => CATALOGUES.filter((c) => (lib.sets.get(c.id)?.songs.length ?? 0) > 0), [lib]);
  const last = readLastCatalogue();
  const lastReady = last && ready.some((c) => c.id === last) ? last : null;

  if (!forceHub) {
    if (ready.length === 1) return <Navigate to={`/${ready[0].id}`} replace />;
    if (lastReady) return <Navigate to={`/${lastReady}`} replace />;
  }

  return (
    <CatalogueRoute onResolve={onResolve} catalogue={null}>
      <CatalogueHub library={lib} onHelp={onHelp} />
    </CatalogueRoute>
  );
}

const MODES: Record<string, Mode> = { daily: "daily", run: "run", practice: "practice" };

/** Resolves /:catalogueId[/:mode] to a catalogue, its song set and a screen. */
function CatalogueScreen({
  lib,
  onResolve,
  onStats,
}: {
  lib: Library;
  onResolve: (c: CatalogueDef | null) => void;
  onStats?: () => void;
}) {
  const { catalogueId, mode } = useParams();
  const catalogue = useMemo(() => findCatalogue(catalogueId), [catalogueId]);
  const set: SongSet | undefined = catalogue ? lib.sets.get(catalogue.id) : undefined;

  useEffect(() => {
    if (catalogue) recordLastCatalogue(catalogue.id);
  }, [catalogue]);

  // An unknown artist, or one whose songs were never built, goes back to the shelf.
  if (!catalogue || !set) return <Navigate to="/" replace />;
  if (mode !== undefined && !(mode in MODES)) return <Navigate to={`/${catalogue.id}`} replace />;

  return (
    <CatalogueRoute catalogue={catalogue} onResolve={onResolve}>
      {mode === undefined ? (
        <ModeHub catalogue={catalogue} set={set} />
      ) : (
        <Play
          key={`${catalogue.id}-${mode}`}
          mode={MODES[mode]}
          catalogue={catalogue}
          set={set}
          onStats={onStats ?? (() => {})}
        />
      )}
    </CatalogueRoute>
  );
}

function Loading({ text }: { text?: string }) {
  return (
    <div className={styles.centre} role="status">
      <div className={styles.bars} aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <p className={styles.centreText}>{text ?? "Cueing up the tape…"}</p>
    </div>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <div className={styles.centre} role="alert">
      <h2 className={styles.failTitle}>No songs loaded</h2>
      <p className={styles.centreText}>
        The song data could not be fetched. If you are running this locally, build it first:
      </p>
      <code className={styles.code}>npm run songs</code>
      <p className={styles.detail}>{message}</p>
    </div>
  );
}
