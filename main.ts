// Solmar Bay — the program that hands the game in (Node 22, standard library
// only). The game itself is plain static files under game/: an index.html and
// its ES modules, no library and no network request, playable offline in a
// desktop browser. This file copies game/ and screenshots/ from beside itself
// into the output directory and writes the dossier.json the judge reads,
// built with the vendored make.fun library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps (reference/gate.json): game/ is at most 993 files and
// directories and 48 MiB, index.html at most 1 MiB, screenshots at most 4
// files of 256 KiB, and the dossier text at most 160 KiB. Refuse early with a
// clear message instead of handing the scorer an entry it would refuse.
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 48 * 1024 * 1024;
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 256 * 1024;

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countTree(path);
      files += sub.files + 1;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

function checkShots(dir) {
  if (!existsSync(dir)) return;
  const shots = readdirSync(dir).filter((name) => !name.startsWith('.'));
  if (shots.length > SHOT_MAX) throw new Error(`screenshots/: ${shots.length} files, at most ${SHOT_MAX}`);
  for (const name of shots) {
    const size = statSync(join(dir, name)).size;
    if (size > SHOT_MAX_BYTES) throw new Error(`screenshots/${name}: ${size} bytes, at most ${SHOT_MAX_BYTES}`);
  }
}

const gameStats = countTree(join(repoRoot, 'game'));
if (gameStats.files > GAME_MAX_FILES) throw new Error(`game/: ${gameStats.files} files, at most ${GAME_MAX_FILES}`);
if (gameStats.bytes > GAME_MAX_BYTES) throw new Error(`game/: ${gameStats.bytes} bytes, at most ${GAME_MAX_BYTES}`);

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  checkShots(join(repoRoot, 'screenshots'));
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: SHOT_MAX, max_bytes: SHOT_MAX_BYTES },
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: 1000,
  }),
);
console.log(`Solmar Bay handed in: ${gameStats.files} game files, ${gameStats.bytes} bytes.`);
