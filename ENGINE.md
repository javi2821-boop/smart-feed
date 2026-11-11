# Where the render engine came from

The engine in this repo is a copy of part of Javi's `render-machine` repo. Nothing in `render-machine` was changed.

- **Source:** `javi2821-boop/render-machine`, branch `main`
- **Source commit:** `dae6661c60dbc40fe3c56ef28fa40f2527df1ca9` ("Architect 025b: the AI war redone in the blueprint look (#67)")
- **Copied on:** 2026-11-10
- **How it works:** headless Chromium draws each frame from a scene's `render(t)` function, and ffmpeg encodes the frames. It needs no GPU. The design is explained in `PLAN.md` in `render-machine`.

## What was copied, unchanged

| Here | From `render-machine` | What it does |
|---|---|---|
| `engine/runtime/` (all files) | `engine/runtime/` | The page that runs inside Chromium: scene loading, the animation helpers scenes import, transitions |
| `src/composition.js` | same path | Checks a composition and works out its frame-exact timeline |
| `src/renderer.js` | same path | Renders frames in fixed chunks and hands them to the encoder |
| `src/encoder.js` | same path | ffmpeg settings, audio mix, loudness, output check |
| `src/browser.js` | same path | Starts headless Chromium and serves files to it from disk (no network) |
| `src/themes.js` | same path | Loads a theme and its pinned fonts |
| `src/inspect.js` | same path | Contact sheets from a finished video |
| `src/aspect.js`, `src/cleanup.js`, `src/errors.js`, `src/ffmpeg.js`, `src/log.js`, `src/paths.js`, `src/util.js` | same paths | Small helpers the files above import |

To compare a file with its source: `git -C ../render-machine show dae6661:src/renderer.js | diff - src/renderer.js`.

## What was left behind

The command line (`src/cli.js`), templates, batch manifests, the game recorder, photo and footage handling, Google Drive delivery, Blender scenes, the review-sheet tool, and every `render-machine` scene, theme and brand. The smart feed has one clip template of its own and doesn't need them.

## What is new here (not from render-machine)

- `engine/shim/`: a three-line package named `render-machine`. The copied engine imports its helper library by that name. In `render-machine` that is the repo's own package name; here the shim points the name at `engine/runtime/lib/`.
- `factory/lib/render.js`: the one place the rest of this repo calls the engine.
- `scenes/custom/`, `themes/paper.json`: the smart feed's own scenes and look.

## Pinned versions

`playwright` 1.56.1 and the two font packages (`@fontsource/fraunces`, `@fontsource/dm-sans`, both 5.3.0) are the same versions `render-machine` uses at the source commit.

## Updating the engine later

Copy the same files again from a newer `render-machine` commit, run `npm test` and `node factory/render-sample.js`, and change the commit recorded above. Don't edit the copied files here: fix them in `render-machine` and copy again, so the two never drift apart silently.
