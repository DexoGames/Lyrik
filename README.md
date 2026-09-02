# Lyrik

**Guess the song from three words.** You get a run of three consecutive words
from somewhere in a song — punctuation stripped, line breaks erased, no telling
whether the window opened mid-line or straddled two. Name the song. Stuck? Pull
one more word from *before* or *after* the run you can see, up to six. The fewer
words you need, the more it scores.

Lives at **lyrik.dexo.games**. Built to match the
[dexo.games](https://www.dexo.games) look but kept completely separate (its own
repo, build and deploy) so it can change or disappear without touching the main
site.

React + TypeScript + Vite, fully static, no backend. Scores and streaks live in
`localStorage`.

## Structure: catalogues, then modes

The game is two levels deep.

```
/                       the shelf — pick a catalogue
/the-beatles            that catalogue's modes and records
/the-beatles/daily      play
/the-beatles/run
/the-beatles/practice
```

A **catalogue** is one artist's body of released work. It owns its songs, its
colour scheme, its wording and its records — a Beatles streak says nothing about
anyone else's. Inside a catalogue sit the three modes:

| Mode | Shape |
| --- | --- |
| **Daily** | Five songs, the same five for everyone, one attempt. Shareable result grid. |
| **Endless** | Keep naming songs on three shared lives. A wrong guess or a skip costs one. |
| **Practice** | Song after song, nothing recorded. |

### Scoring

Base points by how many words were showing when you got it — 3→100, 4→75,
5→55, 6→40 — multiplied by 1 / 0.7 / 0.45 for your first, second and third
guess. Three wrong guesses lose the song. A perfect daily is 500.

Tuning is a one-file job: `src/game/scoring.ts` holds the word limits, the
points ladder, the guess multipliers, the daily length and the run lives.

## Adding an artist

Three steps, no engine changes.

**1. The track list.** Add `data/catalogue/<artist>.json`:

```json
{
  "artist": "Artist Name",
  "slug": "artist-name",
  "skip": ["An Instrumental"],
  "releases": [
    { "album": "First LP", "year": 1970, "tracks": ["Song One", "Song Two"] }
  ]
}
```

Then `npm run songs` to fetch and build. The `slug` becomes the catalogue id and
the URL segment.

**2. The personality.** Add `src/catalogues/<artist>.tsx` exporting a
`CatalogueDef` — theme class, wording and a motif. Everything is optional except
the identity: spread `DEFAULT_COPY` and override only the lines worth giving a
voice to.

```tsx
export const ARTIST: CatalogueDef = {
  id: "artist-name",              // must match the slug above
  name: "Artist Name",
  shortName: "Artist",
  theme: { className: "theme-artist", themeColor: "#0d0d0d" },
  Motif,                          // a small inline SVG
  copy: {
    ...DEFAULT_COPY,
    tagline: "…",
    life: { one: "life", many: "lives" },   // Beatles use "takes"
    skip: "Give up",
    grades: [ /* best first; the last must have min: 0 */ ],
  },
};
```

Add a matching `.theme-artist` block in `src/styles/globals.css` — four custom
properties (`--accent`, `--accent-deep`, `--accent-ink`, `--accent-soft`) plus
`--glow`. Every component reads those, so the nav rule, buttons, highlighter
swipe and background wash all follow.

**3. Register it** in `src/catalogues/index.ts`.

`src/catalogues/catalogues.test.ts` checks the invariants that would otherwise
only show up at runtime: unique url-safe ids, a theme class, a grade ladder that
descends and reaches zero, and no empty copy.

A registered catalogue whose songs have not been built yet still appears on the
shelf, marked as not ready, rather than breaking the page.

## Develop

```bash
npm install      # first time only
npm run songs    # fetch + build the song data (required — see below)
npm run dev      # dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm test         # engine, catalogue and cleaner tests
```

## Song data

**The repo ships the pipeline, not the words.** Lyrics are third-party content,
so `data/raw/` and `public/data/songs.json` are both git-ignored and rebuilt on
demand — locally by you, and in CI before each deploy. Only a few words are ever
on screen at once.

```bash
node scripts/fetch-lyrics.mjs    # catalogue -> data/raw/<artist>/<song>.txt
node scripts/build-songs.mjs     # data/raw   -> public/data/songs.json
# or both:  npm run songs
```

`fetch-lyrics.mjs` walks every title in `data/catalogue/*.json` and pulls the
text from [LRCLIB](https://lrclib.net), falling back to
[lyrics.ovh](https://lyrics.ovh). It caches, so re-running only fills gaps.
Useful flags: `--force`, `--only=<substring>`, `--limit=N`.

### The cleaner works for any song

`scripts/lib/clean.mjs` is deliberately generic — nothing in it knows about any
particular artist. Hand it a blob of text from anywhere (an API, a copy-paste,
an `.lrc` file, something you typed) and it returns the flat word stream the
game plays with:

- section labels (`[Verse 1]`, `Chorus:`, `Instrumental`) and scrape furniture
  (`12 Contributors`, `You might also like`, `4Embed`) dropped
- `.lrc` timestamps stripped
- stage directions in brackets (`(x2)`, `(repeat)`) dropped, while sung words
  that merely sat in brackets are kept
- accents folded, apostrophes swallowed into the word (`don't` → `dont`)
- hyphens split, all other punctuation deleted, everything lowercased
- **line breaks erased entirely** — the point of the game
- anything under 40 words rejected as unplayable

You can also skip the fetch entirely: write lyrics to
`data/raw/<artist-slug>/<song-slug>.txt` and run `npm run songs:build`. Add a
sibling `<song-slug>.json` (`{title, artist, album, year}`) for the metadata,
or let it be inferred from the filename.

## Artwork

Icons and the OG card are drawn from scratch by `npm run assets` — no design
tool, no image library. `scripts/lib/raster.mjs` is a small RGBA canvas with a
scanline polygon fill, a 5×7 bitmap face and a PNG encoder built on `zlib`.
Re-run it after changing the palette.

## Project structure

```
data/
  catalogue/        titles/albums/years (committed)
  raw/              fetched lyric text  (git-ignored)
scripts/
  lib/clean.mjs     the general-purpose lyric cleaner
  lib/raster.mjs    zero-dependency PNG drawing
  fetch-lyrics.mjs  catalogue -> data/raw
  build-songs.mjs   data/raw   -> public/data/songs.json
  make-assets.mjs   icons + OG card
src/
  catalogues/       ONE FILE PER ARTIST — theme, wording, motif
  game/
    engine.ts       pure reducer: reveals, guesses, lives, round flow
    scoring.ts      THE RULES — word/guess values live here
    snippet.ts      window selection and growth
    songs.ts        loads songs.json, slices it per catalogue, title search
    stats.ts        per-catalogue streaks, histogram, endless records
  components/       Snippet, GuessInput, Hud, RoundReveal, GameOver, modals
  screens/
    CatalogueHub/   the shelf
    ModeHub/        one catalogue's modes and records
    Play/           drives all three modes
```

## Licence

Code is MIT (see `LICENSE`). Lyrics are not included in this repository and are
not covered by it; they are fetched at build time from the sources above and
only ever surfaced a few words at a time.
