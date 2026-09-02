import { useEffect, useState } from "react";
import { loadLibrary, type Library } from "./songs";

type State =
  | { status: "loading"; lib: null; error: null }
  | { status: "ready"; lib: Library; error: null }
  | { status: "error"; lib: null; error: Error };

/** Loads public/data/songs.json once and shares it across every screen. */
export function useLibrary(): State {
  const [state, setState] = useState<State>({ status: "loading", lib: null, error: null });

  useEffect(() => {
    let alive = true;
    loadLibrary().then(
      (lib) => alive && setState({ status: "ready", lib, error: null }),
      (error: Error) => alive && setState({ status: "error", lib: null, error }),
    );
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
