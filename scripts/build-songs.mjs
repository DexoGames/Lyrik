#!/usr/bin/env node
/**
 * Build public/data/songs.json — the only data file the game loads.
 *
 * Input is data/raw/<artist-slug>/<title-slug>.txt (plus an optional sidecar
 * <title-slug>.json carrying title/album/year). Those come from
 * scripts/fetch-lyrics.mjs, but nothing stops you dropping in your own .txt —
 * any song, any artist, any source. Everything gets the same treatment:
 *
 *   raw text -> cleanLyrics() -> one flat, punctuation-free stream of words
 *
 *   node scripts/build-songs.mjs
 *   node scripts/build-songs.mjs --min-words=60   # stricter length floor
 *   node scripts/build-songs.mjs --verbose
 */
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanLyrics, normalizeTitle, slugify } from "./lib/clean.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOGUE_DIR = join(ROOT, "data", "catalogue");
const RAW_DIR = join(ROOT, "data", "raw");
const OUT = join(ROOT, "public", "data", "songs.json");

const args = process.argv.slice(2);
const value = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const VERBOSE = args.includes("--verbose");
const MIN_WORDS = Number(value("min-words") ?? 40);

/**
 * Title/album/year for every catalogued track, keyed by "<artistSlug>/<titleSlug>",
 * plus each catalogue's familiarity map keyed by artistSlug — kept separate from
 * `index` because familiarity can cover a song that isn't (yet) in any release.
 */
async function catalogueIndex() {
  const index = new Map();
  const familiarityByArtist = new Map();
  let files = [];
  try {
    files = (await readdir(CATALOGUE_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return { index, familiarityByArtist };
  }
  for (const f of files) {
    const cat = JSON.parse(await readFile(join(CATALOGUE_DIR, f), "utf8"));
    const artistSlug = cat.slug ?? slugify(cat.artist);
    if (cat.familiarity) familiarityByArtist.set(artistSlug, cat.familiarity);
    for (const release of cat.releases ?? []) {
      for (const title of release.tracks) {
        index.set(`${artistSlug}/${slugify(title)}`, {
          title,
          // Per-release credit, for catalogues that are a collection rather
          // than one act; the catalogue's own name is the fallback.
          artist: release.artist ?? cat.artist,
          album: release.album,
          year: release.year,
          // How well-known the song is, 0-100 — see cat.familiarity. Falls
          // back to a neutral middle score for anything left unscored.
          familiarity: cat.familiarity?.[title] ?? 50,
        });
      }
    }
  }
  return { index, familiarityByArtist };
}

async function listArtistDirs() {
  try {
    const entries = await readdir(RAW_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/** Prettify a slug when we have no metadata at all: "hey-jude" -> "Hey Jude". */
function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  const { index, familiarityByArtist } = await catalogueIndex();
  const artistDirs = await listArtistDirs();

  if (artistDirs.length === 0) {
    console.error(
      "No lyrics in data/raw/.\n" +
        "Run `node scripts/fetch-lyrics.mjs` first, or drop your own\n" +
        "data/raw/<artist>/<song>.txt files in and re-run this.",
    );
    process.exit(1);
  }

  const songs = [];
  const rejected = [];
  const seen = new Set();
  /** Word stream -> the title that claimed it first. */
  const seenWords = new Map();

  for (const artistSlug of artistDirs) {
    const dir = join(RAW_DIR, artistSlug);
    const files = (await readdir(dir)).filter((f) => extname(f) === ".txt");

    for (const file of files) {
      const slug = basename(file, ".txt");
      const key = `${artistSlug}/${slug}`;

      let meta = index.get(key);
      if (!meta) {
        // Not in a catalogue release — read the sidecar, else infer from the
        // filename. It may still have a hidden familiarity score waiting for
        // it, keyed by title, if the catalogue scored it ahead of adding it
        // to a release.
        try {
          meta = JSON.parse(await readFile(join(dir, `${slug}.json`), "utf8"));
        } catch {
          meta = { title: titleFromSlug(slug), artist: titleFromSlug(artistSlug) };
        }
        meta.familiarity ??= familiarityByArtist.get(artistSlug)?.[meta.title];
      }

      const raw = await readFile(join(dir, file), "utf8");
      const { words, ok, reason, dropped } = cleanLyrics(raw, { minWords: MIN_WORDS });

      if (!ok) {
        rejected.push(`${meta.title} — ${reason}`);
        continue;
      }
      const dedupeKey = normalizeTitle(`${meta.artist} ${meta.title}`);
      if (seen.has(dedupeKey)) {
        rejected.push(`${meta.title} — duplicate`);
        continue;
      }
      seen.add(dedupeKey);

      // Two titles, one text: a search that landed on the same recording twice
      // (a reprise, a retitled cut, a medley). Playing both would let one
      // snippet have two right answers.
      const stream = words.join(" ");
      const claimedBy = seenWords.get(stream);
      if (claimedBy) {
        rejected.push(`${meta.title} — same words as "${claimedBy}"`);
        continue;
      }
      seenWords.set(stream, meta.title);

      songs.push({
        id: key,
        t: meta.title,
        a: meta.artist,
        al: meta.album ?? null,
        y: meta.year ?? null,
        f: Math.max(0, Math.min(100, Math.round(meta.familiarity ?? 50))),
        // One space-joined string: markedly smaller over the wire than a JSON
        // array, and the client splits it once at load.
        w: stream,
        n: words.length,
      });

      if (VERBOSE) {
        console.log(`  ${meta.title.padEnd(46)} ${String(words.length).padStart(4)} words  (${dropped} lines dropped)`);
      }
    }
  }

  songs.sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || a.t.localeCompare(b.t));

  const totalWords = songs.reduce((n, s) => n + s.n, 0);
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    songs,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload), "utf8");

  const { size } = await stat(OUT);
  console.log(
    `\nbuilt ${songs.length} songs, ${totalWords.toLocaleString()} words -> public/data/songs.json (${(size / 1024).toFixed(0)} KB)`,
  );
  if (rejected.length) {
    console.log(`\nskipped ${rejected.length}:`);
    for (const r of rejected) console.log(`  - ${r}`);
  }
  if (songs.length < 20) {
    console.warn("\nWarning: fewer than 20 songs — the game needs a deeper pool to be fun.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
