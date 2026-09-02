/** Namespaced, failure-tolerant localStorage helpers. */
const NS = "lyrik:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* private mode / quota — non-fatal */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    /* non-fatal */
  }
}

/** Drop every lyrik: key except the ones listed — used to prune stale dailies. */
export function pruneExcept(prefix: string, keep: string[]): void {
  try {
    const keepSet = new Set(keep.map((k) => NS + k));
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NS + prefix) && !keepSet.has(k)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* non-fatal */
  }
}
