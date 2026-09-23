# Overload

A personal weight-training tracker built around one job: log every set, and say
exactly when it is time to add weight, based on how the last few sessions
actually went.

Single user, local-first, installable as a PWA. No accounts, no server, no
network calls at runtime.

## Running it

```bash
npm install
npm run dev
```

Then open the printed URL. On a phone, use "Add to Home Screen" — it installs
and runs full-screen.

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | production build into `dist/` (static; host it anywhere) |
| `npm test` | the progression, scheduling and parser tests |
| `npm run icons` | regenerates the app icons |
| `npm run fetch:media` | bundles exercise images (see below) |

## How the coaching rule works

The spec's default rule, implemented in [`src/lib/progression.ts`](src/lib/progression.ts):

1. Every movement has a target rep scheme and a target set count.
2. A session **qualifies** when the required working sets reach the qualifying
   rep threshold **with good form** (a set you tick as ragged does not count).
3. After **2 qualifying sessions in a row at the same weight**, the movement is
   flagged ready to progress. The streak length and the required set count are
   adjustable per movement in the program builder, and globally in settings.
4. The suggested jump depends on the movement:
   - upper-body / smaller movements: **+2.5–5 lb (~5%)**
   - lower-body / compound movements: **+5–10 lb (~5–10%)**
   - dumbbells and kettlebells: **the next size on your rack** (set that list in
     settings — it is your gym's rack, not a generic one)
   - bodyweight movements: **a harder variation**, or more reps / a band / a vest
5. After a jump the reps drop back toward the bottom of the range. That is
   expected, not a regression — the app says so, and the streak restarts at the
   new weight.
6. You can accept, delay or ignore any recommendation. Nothing is forced.

**Double progression and the 2-for-2 rule are combined**, the way the spec asks:
with a rep *range*, hitting the top of the range is the signal; with a *fixed*
rep goal there is no top to reach, so the 2-for-2 rule supplies one — the goal
plus two reps. You can force either rule on its own in settings.

The streak is never stored. It is recomputed from the logged sets every time, so
it cannot drift out of sync with what actually happened. The only thing the app
remembers separately is your current working weight and your answer to a
recommendation.

**Rep schemes the app will not judge for you:** a bare AMRAP and a to-failure
set. There is no number to beat, so those are tracked and charted but never
flagged. An AMRAP with a floor ("8+") is judged against the floor plus two.

## What is in the box

Four programs, transcribed by hand from the PDFs on your Desktop. Structure
only — sets, reps, rest, movement names and the calendar pattern. The coaching
content stays with the source.

| Program | Shape | What it exercises in the model |
| --- | --- | --- |
| **MAPS 15 Minutes** | 3 × 3 weeks, 6 days + optional 7th | choice days (abs *or* glutes), circuits, supersets, timed planks |
| **MAPS 15 Minutes Advanced** | 3 × 3 weeks, same week | heavier pairs, 5×5 work, a five-minute AMRAP |
| **MAPS Anabolic** | Pre Phase + 3 × 3 weeks | Trigger Sessions — 10-minute open slots on every non-lifting day |
| **MAPS Anabolic Advanced** | 3 × (4 weeks + deload) | week types: normal / failure / deload, alternating inside a phase |
| **MAPS Aesthetic** | 3, 4 and 3 weeks | Focus Sessions — open slots for one lagging body part |

**122 movements** with form cues, common faults and easier-to-harder variations.

A few transcription decisions worth knowing:

- **"1 set to complete failure, 13-15 reps"** is stored as a rep *range* with a
  note, not as the `failure` target type — so the coaching still works. Hit the
  top of the range twice and it tells you to add weight, which is the right
  answer for a failure week.
- **"5 second holds / 5 reps each side"** (the Anabolic Advanced mobility work)
  is 5 reps per side with the hold in the note. The model has no "reps with a
  hold" target and inventing one for four drills was not worth it.
- **Exercises marked "(Optional)"** in the source are marked optional here and
  labelled as such while logging, rather than being dropped.
- **Anabolic Advanced Phase III** prints "1 x 16-20" against the Overhead Tricep
  Stretch, which looks like a typo — every other phase holds it for the phase's
  stretch time, so it is a 120-second hold here.
- **The deload week is scheduled, not gated.** The source has a symptom quiz for
  deciding whether to take it; the app puts the days on the calendar and you skip
  them if you feel fine.
- **The five-minute AMRAP** in 15 Minutes Advanced is stored as a bare AMRAP with
  the time cap in the note. It is charted but never flagged, because there is no
  rep number to beat — adding one would be the app inventing a rule the source
  does not have.

## Data model

The spec's entities, plus three the source programs forced:

- **Phase** sits between Program and Day — MAPS runs 3-week phases with their own
  set/rep scheme, and the week-type sequence (normal / failure / deload) needs
  somewhere to live.
- **Block** sits between Day and ProgramExercise, so a superset or a circuit
  ("repeat 4 times, no rest between exercises") is a real thing rather than a note.
  All three kinds flatten into one ordered queue of sets for logging.
- **RepTarget** replaces a plain rep number: ranges, fixed counts, AMRAP, timed
  holds, to-failure, and "each side".

Open-slot days (pick your own movements on the day) and choice days are both
supported; movements chosen while logging are stored on the session and judged by
the same progression rule as anything else. A workout that runs twice in one week
appears twice in the week's order and shares one prescription, so a movement
trained twice a week builds one streak rather than two.

## Your data

Everything lives in this browser's IndexedDB and nowhere else. **Clearing site
data, switching browsers or getting a new phone loses it.** Settings → Export a
backup writes a JSON file; importing merges by id, so the same backup twice
changes nothing and two devices' histories add together.

## Exercise visual aids

The library ships with written cues but **no images** — run:

```bash
npm run fetch:media
```

It pulls from [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(public domain, the Unlicense), downloads two frames per movement into
`public/exercises/`, and writes a manifest the app imports. Matching is **exact
only** — name or alias, ignoring case, punctuation, plurals and word order. A
loose match would put the wrong picture beside a movement, which is worse than no
picture, so anything it cannot match confidently is listed and left alone.

As of the last run: **53 of 122 matched.** The rest are mobility drills and
static stretches that no exercise database carries, suspension-trainer
variations, and MAPS-specific movement names. Add an alias in
`src/data/exercises.ts` and re-run to pull more in, or paste an image URL into
any movement in the exercise library.

`npm run fetch:media --list` shows what it would match without downloading
anything.

## Known gaps

- **Dumbbell weights are logged as you enter them** — the app does not ask
  whether a number is per hand or total. Be consistent and the coaching is
  consistent; the rack list in settings assumes per hand.
- **Rest timers do not fire when the app is closed.** The countdown is correct
  when you come back (it counts from a start time, not by ticking), but a
  background notification would need a service-worker push, which is out of scope
  for a no-server app.
- **No multi-device sync.** Export/import is the path, by design.
