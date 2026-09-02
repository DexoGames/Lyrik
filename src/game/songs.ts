import type { Song } from "./types";

/** Shape of public/data/songs.json, as written by scripts/build-songs.mjs. */
interface RawSong {
  id: string;
  t: string;
  a: string;
  al: string | null;
  y: number | null;
  /** the whole song, space-joined */
  w: string;
  n: number;
  /** familiarity, 0-100 */
  f: number;
}

interface RawPayload {
  version: number;
  generatedAt: string;
  songs: RawSong[];
}

export interface SongOption {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  /** lowercase haystack for the guess box */
  search: string;
}

/** One catalogue's playable pool: the songs, and the titles you may guess. */
export interface SongSet {
  id: string;
  songs: Song[];
  byId: Map<string, Song>;
  options: SongOption[];
  /** True when this catalogue is a collection credited to more than one act. */
  multiArtist: boolean;
}

export interface Library {
  all: Song[];
  /** Keyed by catalogue id — the leading segment of every song id. */
  sets: Map<string, SongSet>;
}

/**
 * Strip accents/punctuation so "Ob-La-Di" is findable by typing "obladi".
 * Apostrophes and hyphens are dropped rather than turned into a space, so a
 * quickly-typed "Ive" still finds "I've" and "obladi" still finds "Ob-La-Di".
 */
export function searchKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['-]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Song ids are "<catalogue>/<title>", so the catalogue is the first segment. */
export function catalogueOf(songId: string): string {
  return songId.slice(0, songId.indexOf("/"));
}

function buildSet(id: string, songs: Song[]): SongSet {
  return {
    id,
    songs,
    byId: new Map(songs.map((s) => [s.id, s])),
    // A collection credited to more than one act — Musicals, Indie Revival —
    // shows the artist alongside the title instead of hiding it as it does
    // for a single-artist catalogue, where it's already the page's name.
    multiArtist: new Set(songs.map((s) => s.artist)).size > 1,
    options: songs
      .map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        year: s.year,
        // artist and album are searchable too: typing "fontaines" or "abbey"
        // narrows the list just as typing a title does
        search: `${searchKey(s.title)} ${searchKey(s.artist)} ${searchKey(s.album ?? "")}`,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  };
}

let cache: Promise<Library> | null = null;

export function loadLibrary(): Promise<Library> {
  cache ??= fetch("/data/songs.json", { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`songs.json: ${r.status}`);
      return r.json() as Promise<RawPayload>;
    })
    .then((payload) => {
      const all: Song[] = payload.songs.map((s) => ({
        id: s.id,
        catalogueId: catalogueOf(s.id),
        title: s.t,
        artist: s.a,
        album: s.al,
        year: s.y,
        familiarity: s.f,
        words: s.w.split(" "),
      }));

      const grouped = new Map<string, Song[]>();
      for (const song of all) {
        const list = grouped.get(song.catalogueId);
        if (list) list.push(song);
        else grouped.set(song.catalogueId, [song]);
      }

      const sets = new Map<string, SongSet>();
      for (const [id, songs] of grouped) sets.set(id, buildSet(id, songs));
      return { all, sets };
    })
    .catch((err) => {
      cache = null; // let a retry re-request
      throw err;
    });
  return cache;
}

const MAX_RESULTS = 8;

/** All-tokens-must-appear matching, ranked by where the match lands. */
export function searchSongs(options: SongOption[], query: string): SongOption[] {
  const tokens = searchKey(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return [];
  const scored: Array<{ o: SongOption; score: number }> = [];

  for (const o of options) {
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const at = o.search.indexOf(t);
      if (at < 0) {
        ok = false;
        break;
      }
      // title start > word start > anywhere
      if (at === 0) score += 3;
      else if (o.search[at - 1] === " ") score += 2;
      else score += 1;
    }
    if (ok) scored.push({ o, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.o.title.length - b.o.title.length)
    .slice(0, MAX_RESULTS)
    .map((s) => s.o);
}
