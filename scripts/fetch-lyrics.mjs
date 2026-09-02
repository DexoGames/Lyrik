#!/usr/bin/env node
/**
 * Pull raw lyric text for every track in data/catalogue/*.json into data/raw/.
 *
 * data/raw/ is git-ignored on purpose: lyrics are third-party content, so this
 * repo stores the *pipeline*, not the words. Run this once locally (or in CI
 * before a build) to populate it.
 *
 *   node scripts/fetch-lyrics.mjs                 # fill in whatever is missing
 *   node scripts/fetch-lyrics.mjs --force         # refetch everything
 *   node scripts/fetch-lyrics.mjs --only=abbey    # album/title substring filter
 *   node scripts/fetch-lyrics.mjs --limit=10      # stop after N fetches
 *
 * Sources, tried in order:
 *   1. LRCLIB   (https://lrclib.net)      — open lyric database, no key
 *   2. lyrics.ovh (https://lyrics.ovh)    — fallback, no key
 */
import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTitle, slugify } from "./lib/clean.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOGUE_DIR = join(ROOT, "data", "catalogue");
const RAW_DIR = join(ROOT, "data", "raw");
const UA = "lyrik/1.0 (+https://lyrik.dexo.games) song-guessing game, build-time fetch";

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === `--${name}`);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const FORCE = flag("force");
const ONLY = value("only")?.toLowerCase();
const LIMIT = Number(value("limit") ?? Infinity);
const DELAY_MS = Number(value("delay") ?? 220);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true, () => false);

async function getJSON(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** LRCLIB: pick the best plain-lyrics hit for artist + title. */
async function fromLrclib(artist, title) {
  const url =
    "https://lrclib.net/api/search?artist_name=" +
    encodeURIComponent(artist) +
    "&track_name=" +
    encodeURIComponent(title);
  const hits = await getJSON(url);
  if (!Array.isArray(hits) || hits.length === 0) return null;

  const wantTitle = normalizeTitle(title);
  const wantArtist = normalizeTitle(artist);
  const scored = hits
    .filter((h) => h && typeof h.plainLyrics === "string" && h.plainLyrics.trim() && !h.instrumental)
    .map((h) => {
      const t = normalizeTitle(h.trackName ?? "");
      const a = normalizeTitle(h.artistName ?? "");
      let score = 0;
      if (t === wantTitle) score += 6;
      else if (t.startsWith(wantTitle) || wantTitle.startsWith(t)) score += 3;
      else if (t.includes(wantTitle)) score += 1;
      if (a === wantArtist) score += 4;
      else if (a.includes(wantArtist)) score += 2;
      // Live/demo/remix takes are noisier than the studio cut.
      if (/\b(live|demo|take \d|rehearsal|remix|karaoke|instrumental)\b/i.test(h.trackName ?? "")) score -= 5;
      return { h, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.h?.plainLyrics ?? null;
}

/** lyrics.ovh fallback. */
async function fromLyricsOvh(artist, title) {
  const url =
    "https://api.lyrics.ovh/v1/" + encodeURIComponent(artist) + "/" + encodeURIComponent(title);
  const data = await getJSON(url);
  const text = data?.lyrics;
  return typeof text === "string" && text.trim() ? text : null;
}

async function loadCatalogues() {
  const files = (await readdir(CATALOGUE_DIR)).filter((f) => f.endsWith(".json"));
  return Promise.all(
    files.map(async (f) => JSON.parse(await readFile(join(CATALOGUE_DIR, f), "utf8"))),
  );
}

async function main() {
  const catalogues = await loadCatalogues();
  let fetched = 0;
  let cached = 0;
  let missing = [];
  let attempted = 0;

  for (const cat of catalogues) {
    const artist = cat.artist;
    const artistSlug = cat.slug ?? slugify(artist);
    const skip = new Set((cat.skip ?? []).map(normalizeTitle));
    const outDir = join(RAW_DIR, artistSlug);
    await mkdir(outDir, { recursive: true });

    for (const release of cat.releases) {
      for (const title of release.tracks) {
        if (skip.has(normalizeTitle(title))) continue;
        if (ONLY && !`${release.album} ${title}`.toLowerCase().includes(ONLY)) continue;

        const slug = slugify(title);
        const txtPath = join(outDir, `${slug}.txt`);
        const metaPath = join(outDir, `${slug}.json`);

        if (!FORCE && (await exists(txtPath))) {
          cached++;
          continue;
        }
        if (attempted >= LIMIT) continue;
        attempted++;

        let text = await fromLrclib(artist, title);
        let source = "lrclib";
        if (!text) {
          await sleep(DELAY_MS);
          text = await fromLyricsOvh(artist, title);
          source = "lyrics.ovh";
        }

        if (text) {
          await writeFile(txtPath, text, "utf8");
          await writeFile(
            metaPath,
            JSON.stringify(
              { title, artist, album: release.album, year: release.year, source, fetchedAt: new Date().toISOString() },
              null,
              2,
            ),
            "utf8",
          );
          fetched++;
          process.stdout.write(`  + ${release.album} — ${title} (${source})\n`);
        } else {
          missing.push(`${release.album} — ${title}`);
          process.stdout.write(`  ! ${release.album} — ${title} (not found)\n`);
        }
        await sleep(DELAY_MS);
      }
    }
  }

  console.log(`\nfetched ${fetched}, already cached ${cached}, not found ${missing.length}`);
  if (missing.length) {
    console.log("\nNot found — drop a .txt into data/raw/<artist>/<slug>.txt to fill these in:");
    for (const m of missing) console.log(`  - ${m}`);
  }
  console.log("\nNext: node scripts/build-songs.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
