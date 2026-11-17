// Solmar Bay — the program that hands the game in (Node 22, standard
// library only). The game itself is plain static files under game/: an
// index.html and its ES modules, no library and no network request,
// playable offline in a desktop browser. This file copies game/ and
// screenshots/ from beside itself into the output directory and writes the
// dossier.json the judge reads, built with the vendored make.fun library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps (reference/gate.json): game/ is at most 993 files and
// directories and 48 MiB, index.html at most 1 MiB, screenshots at most 4
// files of 256 KiB, and the dossier text at most 160 KiB. Refuse early with
// a clear message instead of handing the scorer an entry it would refuse.
const MAX_GAME_FILES = 993;
const MAX_GAME_BYTES = 48 * 1024 * 1024;
const MAX_SHOTS = 4;
const MAX_SHOT_BYTES = 256 * 1024;

function walkTree(dir) {
  let total = { files: 0, bytes: 0 };
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walkTree(path);
      total.files += sub.files + 1;
      total.bytes += sub.bytes;
    } else if (entry.isFile()) {
      total.files += 1;
      total.bytes += statSync(path).size;
    } else {
      throw new Error(`${path} is not a plain file or directory`);
    }
  }
  return total;
}

function checkScreenshots(dir) {
  if (!existsSync(dir)) return;
  const names = readdirSync(dir).filter((name) => !name.startsWith('.'));
  if (names.length > MAX_SHOTS) throw new Error(`screenshots/: ${names.length} files, at most ${MAX_SHOTS}`);
  for (const name of names) {
    const size = statSync(join(dir, name)).size;
    if (size > MAX_SHOT_BYTES) throw new Error(`screenshots/${name}: ${size} bytes, at most ${MAX_SHOT_BYTES}`);
  }
}

const game = walkTree(join(here, 'game'));
if (game.files > MAX_GAME_FILES) throw new Error(`game/: ${game.files} files, at most ${MAX_GAME_FILES}`);
if (game.bytes > MAX_GAME_BYTES) throw new Error(`game/: ${game.bytes} bytes, at most ${MAX_GAME_BYTES}`);

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  checkScreenshots(join(here, 'screenshots'));
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: MAX_SHOTS, max_bytes: MAX_SHOT_BYTES },
    game_max_files: MAX_GAME_FILES,
    game_max_bytes: MAX_GAME_BYTES,
    game_path_max_bytes: 1000,
  }),
);
console.log(`Solmar Bay handed in: ${game.files} game files, ${game.bytes} bytes.`);
