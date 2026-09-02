import { useEffect, useState } from "react";
import {
  readDailyStats,
  readRunStats,
  subscribeStats,
  type DailyStats,
  type RunStats,
} from "./stats";

export interface CatalogueStats {
  daily: DailyStats;
  run: RunStats;
}

function read(catalogueId: string): CatalogueStats {
  return { daily: readDailyStats(catalogueId), run: readRunStats(catalogueId) };
}

/** Live records for one catalogue — re-read whenever a game is recorded. */
export function useStats(catalogueId: string): CatalogueStats {
  const [snap, setSnap] = useState(() => read(catalogueId));
  useEffect(() => {
    setSnap(read(catalogueId));
    return subscribeStats(() => setSnap(read(catalogueId)));
  }, [catalogueId]);
  return snap;
}
