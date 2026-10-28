/**
 * Bundles visual aids for the exercise library.
 *
 * The spec asks for an open, reusable image set held locally rather than a live
 * third-party API, so this pulls from free-exercise-db (public domain, the
 * Unlicense), matches its entries against this app's library by name, copies the
 * images into public/exercises/ and writes a manifest the app imports.
 *
 *   node scripts/fetch-exercise-media.mjs            # everything it can match
 *   node scripts/fetch-exercise-media.mjs --limit 3  # a few, to try it out
 *   node scripts/fetch-exercise-media.mjs --list     # what it would match, no downloads
 *
 * Nothing is downloaded until you run it — the app falls back to the written
 * cues, which is the part that matters between sets.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const MEDIA_DIR = resolve(ROOT, 'public', 'exercises');
const MANIFEST = resolve(ROOT, 'src', 'data', 'media.generated.ts');

const INDEX_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const ATTRIBUTION = 'free-exercise-db (public domain, the Unlicense)';

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex === -1 ? Infinity : Number(args[limitIndex + 1]);

/** Same normalisation the in-app matcher uses, so results are consistent. */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/s\b/g, '');
}

/** Read the app's seeded library straight out of the TypeScript source. */
async function readLibrary() {
  const source = await import('node:fs').then((fs) =>
    fs.readFileSync(resolve(ROOT, 'src', 'data', 'exercises.ts'), 'utf8'),
  );
  const entries = [];
  const blocks = source.split(/\n  \{\n/).slice(1);
  for (const block of blocks) {
    const id = block.match(/id: '([^']+)'/)?.[1];
    const name = block.match(/name: '([^']+)'/)?.[1];
    if (!id || !name) continue;
    const aliasLine = block.match(/aliases: \[([^\]]*)\]/)?.[1] ?? '';
    const aliases = [...aliasLine.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    entries.push({ id, name, aliases });
  }
  return entries;
}

/**
 * Hand-checked pairings, app id -> dataset name, for movements the dataset
 * names differently. Each one was read against the dataset's own instructions
 * and is the same movement; a few differ only in the hand-held implement
 * (kettlebell for dumbbell) or show it unloaded. These win over the name
 * match — "Windmill" otherwise lands on a lying stretch of the same name.
 */
const OVERRIDES = {
  'bulgarian-split-squat': 'Split Squat with Dumbbells',
  'romanian-deadlift': 'Stiff-Legged Dumbbell Deadlift',
  'alternating-backstep-lunge': 'Dumbbell Rear Lunge',
  'dumbbell-single-leg-deadlift': 'Kettlebell One-Legged Deadlift',
  'suspension-trainer-push-up': 'Suspended Push-Up',
  'dumbbell-overhead-tricep-extension': 'Standing Dumbbell Triceps Extension',
  'suspension-trainer-body-row': 'Suspended Row',
  'active-plank': 'Plank',
  'turkish-get-up': 'Kettlebell Turkish Get-Up (Lunge style)',
  windmill: 'Kettlebell Windmill',
  'walking-lunge': 'Bodyweight Walking Lunge',
  'barbell-romanian-deadlift': 'Romanian Deadlift',
  'snatch-grip-deadlift': 'Snatch Deadlift',
  'stability-ball-leg-curl': 'Ball Leg Curl',
  'leg-press-calf-raise': 'Calf Press On The Leg Press Machine',
  'incline-barbell-press': 'Barbell Incline Bench Press - Medium Grip',
  'guillotine-press': 'Barbell Guillotine Bench Press',
  'close-grip-bench-press': 'Close-Grip Barbell Bench Press',
  'close-grip-push-up': 'Push-Ups - Close Triceps Position',
  'incline-fly': 'Incline Dumbbell Flyes',
  'behind-the-neck-press': 'Standing Barbell Press Behind Neck',
  'rear-lateral-raise': 'Seated Bent-Over Rear Delt Raise',
  'rear-cable-fly': 'Cable Rear Delt Fly',
  'chest-down-fly': 'Reverse Flyes',
  'dumbbell-upright-row': 'Dumbbell One-Arm Upright Row',
  'supinated-barbell-row': 'Reverse Grip Bent-Over Rows',
  't-bar-row': 'T-Bar Row with Handle',
  'dumbbell-pullover': 'Straight-Arm Dumbbell Pullover',
  'supinating-dumbbell-curl': 'Dumbbell Alternate Bicep Curl',
  'reverse-curl': 'Reverse Barbell Curl',
  'cable-hammer-curl': 'Cable Hammer Curls - Rope Attachment',
  'skull-crusher': 'EZ-Bar Skullcrusher',
  'dumbbell-skull-crusher': 'Lying Dumbbell Tricep Extension',
  'incline-skull-crusher': 'Incline Barbell Triceps Extension',
  'lying-leg-raise': 'Flat Bench Lying Leg Raise',
  'ball-crunch': 'Exercise Ball Crunch',
  crunch: 'Crunches',
  'cable-chop': 'Standing Cable Wood Chop',
  'kneeling-stretch': 'Kneeling Hip Flexor',
  'pancake-stretch': 'The Straddle',
  'calf-stretch': 'Calf Stretch Hands Against Wall',
};

function pickMatch(exercise, dataset) {
  const override = OVERRIDES[exercise.id];
  if (override) {
    const found = dataset.find((candidate) => candidate.name === override);
    if (!found) console.warn(`  override for ${exercise.name} not in the dataset: ${override}`);
    return found ?? null;
  }

  // Exact only, on the name or an alias, ignoring case, punctuation, plurals
  // and word order. A loose match puts the wrong picture beside a movement,
  // which is worse than no picture — "Bulgarian Split Squat" must never land on
  // "Barbell Side Split Squat", and "Push-Up" must never land on "Chest Push".
  // Anything left unmatched is listed so you can add an alias and re-run.
  const wanted = [exercise.name, ...exercise.aliases].map(
    (name) => new Set(normalize(name).split(' ').filter(Boolean)),
  );
  return (
    dataset.find((candidate) => {
      const theirs = new Set(normalize(candidate.name).split(' ').filter(Boolean));
      return wanted.some(
        (ours) => ours.size === theirs.size && [...ours].every((word) => theirs.has(word)),
      );
    }) ?? null
  );
}

async function main() {
  console.log('Fetching the exercise index…');
  const response = await fetch(INDEX_URL);
  if (!response.ok) {
    throw new Error(`Could not fetch the index: ${response.status} ${response.statusText}`);
  }
  const dataset = await response.json();
  const library = await readLibrary();
  console.log(`${library.length} movements in the app, ${dataset.length} in the dataset.`);

  const matched = [];
  const unmatched = [];
  for (const exercise of library) {
    const match = pickMatch(exercise, dataset);
    if (match && match.images?.length) matched.push({ exercise, match });
    else unmatched.push(exercise.name);
  }

  console.log(`Matched ${matched.length}, no match for ${unmatched.length}.`);
  if (unmatched.length) console.log(`  unmatched: ${unmatched.join(', ')}`);

  if (listOnly) {
    for (const { exercise, match } of matched) {
      console.log(`  ${exercise.name}  ->  ${match.name}`);
    }
    return;
  }

  mkdirSync(MEDIA_DIR, { recursive: true });
  const manifest = {};
  let downloaded = 0;

  for (const { exercise, match } of matched.slice(0, limit)) {
    const sources = [];
    // Two frames: the start and the finish of the movement.
    for (const [index, image] of match.images.slice(0, 2).entries()) {
      const url = IMAGE_BASE + image.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  skipped ${exercise.name} frame ${index}: ${res.status}`);
        continue;
      }
      const extension = image.split('.').pop() ?? 'jpg';
      const file = `${exercise.id}-${index}.${extension}`;
      writeFileSync(resolve(MEDIA_DIR, file), Buffer.from(await res.arrayBuffer()));
      sources.push(`exercises/${file}`);
      downloaded++;
    }
    if (sources.length) {
      manifest[exercise.id] = {
        kind: sources.length > 1 ? 'sequence' : 'image',
        src: sources,
        attribution: ATTRIBUTION,
      };
      console.log(`  ${exercise.name} <- ${match.name} (${sources.length} frames)`);
    }
  }

  writeFileSync(
    MANIFEST,
    `import type { ExerciseMedia } from '../types';\n\n` +
      `/**\n` +
      ` * Written by scripts/fetch-exercise-media.mjs. Do not edit by hand.\n` +
      ` * Source: ${ATTRIBUTION}\n` +
      ` */\nexport const EXERCISE_MEDIA: Record<string, ExerciseMedia> = ${JSON.stringify(
        manifest,
        null,
        2,
      )};\n`,
    'utf8',
  );

  console.log(
    `\nWrote ${downloaded} images and a manifest for ${Object.keys(manifest).length} movements.`,
  );
  console.log('Restart the dev server (or rebuild) to pick them up.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
