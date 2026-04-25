#!/usr/bin/env node

/**
 * Batch render Shorts from JSON content files.
 * Usage:
 *   node scripts/batch-render.mjs [content/*.json]
 *   node scripts/batch-render.mjs --composition=ReelDynamic content/reel-x.json
 *
 * If no args, renders all JSON files in content/.
 * If --composition=<id> is passed, that composition is rendered. Otherwise the
 * composition is inferred: files named reel-*.json use ReelDynamic (adaptive-
 * reel-*.json uses AdaptiveReelDynamic); everything else falls back to ShortVideo.
 */

import { execSync } from "child_process";
import { readdirSync, readFileSync, mkdirSync } from "fs";
import { join, basename } from "path";

const contentDir = join(process.cwd(), "content");
const outDir = join(process.cwd(), "out");

mkdirSync(outDir, { recursive: true });

// Parse args: optional --composition=<id> flag, rest are content files.
const rawArgs = process.argv.slice(2);
let compositionOverride = null;
const positionalArgs = [];
for (const a of rawArgs) {
  if (a.startsWith("--composition=")) {
    compositionOverride = a.slice("--composition=".length);
  } else {
    positionalArgs.push(a);
  }
}

const files =
  positionalArgs.length > 0
    ? positionalArgs
    : readdirSync(contentDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(contentDir, f));

function pickComposition(filePath) {
  if (compositionOverride) return compositionOverride;
  const base = basename(filePath);
  if (base.startsWith("adaptive-reel-")) return "AdaptiveReelDynamic";
  if (base.startsWith("reel-")) return "ReelDynamic";
  return "ShortVideo";
}

console.log(`\nBatch rendering ${files.length} video(s)...\n`);

let failures = 0;
for (const file of files) {
  const name = basename(file, ".json");
  const outputPath = join(outDir, `${name}.mp4`);
  const composition = pickComposition(file);

  console.log(`Rendering: ${name}`);
  console.log(`  Composition: ${composition}`);
  console.log(`  Input:  ${file}`);
  console.log(`  Output: ${outputPath}`);

  try {
    // Pass props as a FILE PATH, not inline JSON. Windows cmd strips inner quotes from
    // inline JSON, breaking large payloads; --props=<path> sidesteps the whole issue.
    execSync(
      `npx remotion render ${composition} "${outputPath}" --props="${file}"`,
      { stdio: "inherit", cwd: process.cwd() }
    );
    console.log(`  Done!\n`);
  } catch (err) {
    failures += 1;
    console.error(`  FAILED: ${err.message}\n`);
  }
}
if (failures > 0) {
  process.exit(1);
}

console.log("Batch render complete.");
