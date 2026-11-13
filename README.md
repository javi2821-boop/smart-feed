# Smart Feed

A TikTok-style swipe feed made for one person (Javi), at https://javi2821-boop.github.io/smart-feed/. The repo and the feed are public (Javi's choice), so nothing private ever goes in here. Each clip is 35 to 45 seconds: a paper-cutout puppet narrates **one small idea**. It exists to replace mindless scrolling with something worth thinking about.

This page is written for **Muse**, the bot that runs the factory from here on. It assumes you have never seen how this was built. Everything runs inside GitHub; nothing depends on anyone's computer being on.

## How it works, in one paragraph

You add a small text file (a "script") to the folder `scripts/inbox/`. That starts a GitHub Actions workflow called **factory**. The factory checks the script, reads it aloud with an open-source voice (Kokoro), renders the video, adds it to the feed's list, moves your script to `scripts/done/`, and publishes the feed to its web page. If a script has a problem, it moves to `scripts/failed/` with a note saying exactly what is wrong.

## The four kinds of clip

| Type | What it is |
|---|---|
| `lesson` | One idea from a book or thinker. |
| `question` | A thinker's open question. It is not answered. The question is held on screen for 3 seconds at the end, in silence. |
| `story` | A short moment from someone's life and what it taught. |
| `scripture` | A Bible verse, or one idea from C.S. Lewis. |

Topics: psychology, philosophy, Christianity, business, and what Javi is building. **One small idea per clip. Never a book summary.**

## 1. How to add a script

1. Write a text file in this exact shape (the full rules and a blank template are in [`scripts/README.md`](scripts/README.md)):

   ```
   ---
   type: lesson
   title: What is yours to control
   character: philosopher
   background: study
   source: Marcus Aurelius, Meditations (paraphrased)
   ---
   The narration goes here. About 100 words. Plain sentences, written to be heard.
   ```

2. Name it with lowercase letters, numbers and dashes, ending in `.md`, for example `marcus-control.md`. The name becomes the clip's name and must not repeat an earlier one.
3. Commit the file to `scripts/inbox/` on the **`main`** branch.
4. That is all. The factory starts within a few seconds of the commit.

**Add several scripts in one commit when you can.** Each factory run spends about 2 minutes setting up before the first clip, so three scripts in one commit cost much less than three separate commits. The usual rhythm is 3 clips a day.

**Choose from what exists:**

- Characters: `philosopher`, `pastor`, `worker`, `dad`, `kid`, `king`, `monk`, `mother`, `soldier`, `scientist`, `businessman`, `farmer`, `teacher`, `old-man`, `young-woman` (the folders in `assets/cast/`).
- Backgrounds: `study`, `church`, `workshop`, `city-street`, `open-field` (the pictures in `assets/backgrounds/`).

The puppet is a narrator, not the person being talked about. Pick whoever suits the mood.

### The quote rule (never bent)

- **Never invent a quote.** Use someone's exact words only when you are certain of the wording, and name the source.
- Not certain? **Paraphrase and say so**: "Lewis argued that...". Add `(paraphrased)` to the `source` line.
- **Bible verses** come from a public domain translation, **KJV** or **WEB**, with the reference: `source: Matthew 6:34 (KJV)`.

## 2. How to tell whether a run worked

Open the repo's **Actions** tab and look at the newest **factory** run.

| What you see | What it means |
|---|---|
| Green check | Every script in that commit became a clip. They are in `clips/`, listed in `feed/feed.json`, and the scripts are now in `scripts/done/`. |
| Red X | At least one script failed. **The other scripts in the same run still became clips** and were saved. |
| Yellow dot | Still running. A clip takes about 3 to 5 minutes. |

Click the run to see its **summary**: a table of the clips it made (length, size, time taken) and, for each failure, the script's name and the reason.

Without the Actions tab you can tell from the folders alone:

- Your file is in `scripts/done/` → it became a clip.
- Your file is in `scripts/failed/` → it did not. Next to it is `<name>.md.why.txt`, a plain note with the reason.
- Your file is still in `scripts/inbox/` → the run has not finished, or it never started (see "The run never started" below).

## 3. What to do when a script failed

Read the `.why.txt` note. It names the step that failed and what to change.

| The note says | Do this |
|---|---|
| Something about the **format**: a missing header line, an unknown type, character or background, a bad file name, too few or too many words, a question clip that doesn't end on its question | Fix the script as the note says. Commit the fixed file to `scripts/inbox/` and delete the failed copy and its note from `scripts/failed/`. |
| "A clip named ... is already on the feed" | Give the file a different name and commit it to the inbox again. |
| The clip **would be** shorter than 35 or longer than 45 seconds | Add or cut about as many words as the note suggests, then resubmit. |
| The **voice** step failed or crashed | Usually a passing problem (a download or a runner hiccup). Put the same script back in the inbox once. If it fails the same way twice, stop and tell Javi: do not keep retrying, each try spends Actions minutes. |
| The **render** step failed | Same: resubmit once. If it fails again, tell Javi and include the note's text. |
| "Unexpected error" | Tell Javi and include the note's text. |

**The run never started.** Check that the file was committed to `scripts/inbox/` (not `scripts/` or `inbox/`) on `main`. A commit that only touches other folders does not start the factory. You can also start it by hand: Actions > **factory** > **Run workflow**.

**The run is red but no script is in `scripts/failed/`.** The factory itself broke before or after the scripts (for example the "Save the results" step could not push). Open the run, read the red step's log, and tell Javi. **Never change billing or spending settings to get a run through.**

**The feed did not update, or the "publish the feed" job is red.** Open that job in the run. Its last step checks that the live address lists the expected number of clips and says what it found. Run the **deploy-feed** workflow once to try again. If it fails twice, tell Javi. On the phone, pull down or reopen the feed: a new clip takes a minute or two to appear.

## 4. How to add a new character

The look is defined in [`docs/STYLE-GUIDE.md`](docs/STYLE-GUIDE.md). Read it once before making art. In short:

1. Pick a name: lowercase letters, numbers and dashes, like `nurse` or `old-woman`.
2. Make four pictures using the **image prompt template** at the end of the style guide (fill in the words in capitals; keep the rest word for word so the style matches):

   | File | Size | Contents |
   |---|---|---|
   | `body.png` | 800 x 1000 | Neck, shoulders, torso. No head. |
   | `head.png` | 600 x 600 | The head, with **no mouth** drawn. |
   | `mouth-closed.png` | 200 x 120 | Only a closed mouth. |
   | `mouth-open.png` | 200 x 120 | Only an open mouth. |

   All four must be PNGs with a truly transparent background, at exactly those sizes. The two mouths can be copied from any existing character: they are the same for everyone.
3. Put them in a new folder `assets/cast/<name>/`.
4. Add the name to the `"characters"` list in [`assets/spec.json`](assets/spec.json).
5. Commit. Scripts can now say `character: <name>`.
6. Check it. The factory checks the cast before every run and stops with a plain message if a picture is missing, the wrong size, or not transparent. If you can run commands in the repo: `node tools/validate-cast.js` does the same check, and `node tools/cast-sheet.js` draws every puppet assembled into `out/cast-sheet.png` so you can see whether the head sits right and the mouth is in place.
7. If the head sits too high or low, or the mouth is off: don't redraw. Add a `meta.json` to the character's folder with corrected anchor points, as the style guide's "Parts, sizes and anchor points" section explains.

A new **background** is one file: `assets/backgrounds/<name>.png`, 1080 x 1920, solid (no transparency). Add its name to `"backgrounds"` in `assets/spec.json`.

**Replacing a placeholder with real art.** Every character and background currently in the repo is a simple placeholder drawn in code, marked by a file called `PLACEHOLDER` in its folder (for backgrounds, `<name>.PLACEHOLDER`). The exact prompt for each picture is in [`docs/CAST-PROMPTS.md`](docs/CAST-PROMPTS.md). Save the real picture over the placeholder with the same file name, then delete the marker file. Clips already made keep the old art; to remake one with the new art, see the next section.

## 5. Making a clip again, or removing one

In a checkout of the repo:

- `node tools/requeue.js <name>` puts a finished clip's script back in the inbox and removes its old video. Commit and push; the factory makes it again. `--all` does this for every clip (for example after the narrator's voice changes).
- `node tools/requeue.js --remove <name>` takes a clip off the feed for good. Commit and push, then run the **deploy-feed** workflow.

By hand, without the tool: delete `clips/<name>.mp4` and `clips/<name>.jpg`, delete that clip's block from `feed/feed.json`, and (to remake it) move `scripts/done/<name>.md` back to `scripts/inbox/`.

## 6. Where the feed is

**https://javi2821-boop.github.io/smart-feed/**

The feed is hosted by GitHub Pages, straight from this repo. It is public: anyone with the address can watch, and anyone can read this repo. There is no password. [`docs/FEED-SETUP.md`](docs/FEED-SETUP.md) explains how publishing works and how to put the feed on a phone.

On the phone it behaves like any short-video app: swipe up for the next clip, tap once for sound (it stays on), tap again to pause. Unwatched clips come first with the four types mixed. It remembers what has been watched on that phone, and can be added to the home screen.

## 7. Limits to respect

- **GitHub Actions minutes.** Standard runners are free for a public repo, so the factory has no monthly allowance to run out of. Still batch scripts into one commit: it is faster. Never raise a spending limit or change billing.
- **Clip size.** A clip must be under 10 MB (they are usually 1.5 to 2 MB). The factory enforces this.
- **Storage.** GitHub Pages allows a site of about 1 GB, roughly 600 clips. The build step warns in the run when the feed passes 900 MB. Then ask Javi whether to prune old clips. Do not move storage anywhere else without asking him.
- **Nothing private in this repo.** It is public. No tokens, emails, account IDs or personal notes in any file, ever. The factory needs no secrets.
- **Don't edit the engine** (`engine/`, `src/`). It is a copy from another repo; [`ENGINE.md`](ENGINE.md) explains how to update it.

## Folder map

| Folder | What is in it |
|---|---|
| `scripts/inbox/` | Scripts waiting to be made. **This is where you put new ones.** |
| `scripts/done/` | Scripts that became clips. |
| `scripts/failed/` | Scripts that did not, each with a `.why.txt` note. |
| `scripts/drafts/` | Scripts parked for later. The factory ignores this folder. |
| `clips/` | The finished videos (`.mp4`) and their poster images (`.jpg`). |
| `feed/` | The feed's web page, and `feed.json`, the list of clips it shows. |
| `assets/cast/`, `assets/backgrounds/` | The puppets and backdrops. `assets/spec.json` lists them and fixes their sizes. |
| `docs/` | The style guide, the cast prompts, and the feed setup walkthrough. |
| `factory/` | The factory's code: script check, voice, render, publish. |
| `voice/` | The narrator: `voice.json` names the Kokoro voice. |
| `scenes/`, `themes/` | The one clip template and its colours and fonts. |
| `engine/`, `src/` | The render engine, copied from `render-machine`. Don't edit. |
| `tools/`, `test/` | Helpers and tests. |
| `STATUS.md` | What is done, what is next, what is waiting on Javi. |

## For someone with the repo on a computer

Needs Node 20 or newer and ffmpeg. `npm ci`, then `npx playwright install chromium`.

| Command | What it does |
|---|---|
| `npm test` | The tests. |
| `node factory/run.js --check` | Checks the format of every script in the inbox. Renders nothing. |
| `SMARTFEED_FAKE_VOICE=1 node factory/run.js --try <script.md> --stills` | Renders one script to `out/try/` with a test tone instead of the voice, plus stills and a contact sheet. Touches nothing else. |
| `node tools/validate-cast.js` | Checks every character and background. |
| `node tools/cast-sheet.js` | Draws the whole cast into `out/cast-sheet.png`. |
| `node tools/feed-check.js` | Drives the feed page in Chrome at phone size and checks that it plays. |
