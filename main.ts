// Turkey Run — packaging entry point.
//
// What this program does, in order:
//   1. picks a destination directory (MAKEFUN_OUTPUT_DIR, or /output when the grader runs it),
//   2. copies this directory's game/ and screenshots/ folders into that destination,
//   3. asks the vendored make.fun library to scan the destination and write dossier.json.
//
// The game itself is plain static files (game/index.html plus ES modules and assets); nothing here
// builds, bundles or transpiles it. Node 22 standard library only — no dependencies, no network.
//
// Local preview: `node serve.ts` then http://localhost:8080.
// Dry run outside the grader container:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** Directory holding main.ts, and therefore the game/ and screenshots/ sources. */
const PROJECT_DIR = dirname(fileURLToPath(import.meta.url));

/** Where the hand-in is assembled: the grader's /output, or a stand-in for local runs. */
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

/** Folders handed to the judge, copied wholesale and kept in their existing layout. */
const PAYLOAD_DIRS = ['game', 'screenshots'];

/**
 * The grader's own limits, restated so a payload it would reject fails here instead of there.
 * text_max_bytes trims the dossier's text; the rest are hard refusals:
 *   screenshots  — at most 4 images, none larger than 256 KiB;
 *   game         — at most 993 files and 48 MiB in total (game/ shares /output's 1000-entry
 *                  budget with screenshots/ and dossier.json), and no path under game/ longer
 *                  than 1000 bytes.
 */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Create the output directory and drop a clean copy of every payload folder into it. */
function stagePayload(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const dir of PAYLOAD_DIRS) {
    const from = join(PROJECT_DIR, dir);
    const to = join(OUTPUT_DIR, dir);
    if (existsSync(from)) {
      cpSync(from, to, { recursive: true });
    } else {
      // An empty folder still has to exist: buildDossier reads both trees.
      mkdirSync(to, { recursive: true });
    }
  }
}

/** Scan the staged payload and write the summary the judge reads. */
function writeDossier(): void {
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), buildDossier(OUTPUT_DIR, CAPS));
}

stagePayload();
writeDossier();
