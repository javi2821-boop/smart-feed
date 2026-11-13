# Smart Feed status

Last updated: 2026-11-12. Written by Claude.

Everything is on the branch `build/smart-feed`, behind draft pull request #1. **Nothing is merged, public or shared.** `main` holds only a note and four placeholder workflow files.

## Where each phase stands

| Phase | State | Check result |
|---|---|---|
| 1. Repo and engine | Built | **PASS.** Repo is private. The copied engine rendered its own sample clip on a GitHub runner (4 s, 1080x1920, job took 46 s). Source commit recorded in `ENGINE.md`; `render-machine` was not changed. |
| 2. Voice | Built | **PASS.** Kokoro runs in GitHub Actions on CPU with its model files cached. Three samples, all 35 to 45 s, loudest sample -3.4 dBFS (no clipping). One 100-word read takes about 26 s. **Javi chose the warm male voice (`am_michael`) on 2026-11-10.** |
| 3. Cast and style guide | Built with placeholder art | **PASS.** `tools/validate-cast.js`: 15 characters x 4 parts and 5 backgrounds, right sizes, transparency, same loader for placeholders and real art. `docs/STYLE-GUIDE.md` and `docs/CAST-PROMPTS.md` (65 prompts) are ready. **Real art is not made yet.** |
| 4. Clip template | Built | **PASS.** One clip of each type made on GitHub. Mouth timing measured with `tools/mouth-check.js`: open on 100% of loud frames, closed on 100% of silent frames, 0 frames of lag. Text sits inside a 150 px side margin, so a tall phone cuts nothing off. |
| 5. Factory | Built, running from the branch | **PASS.** 2 good scripts + 1 broken: 2 clips made, the broken one moved to `scripts/failed` with a plain reason, the run ended red. |
| 6. Feed | Page, password lock and publish step built; **not published** | **Passes locally; the live check waits on three secrets.** Javi chose the no-card password lock on 2026-11-12 ("Not sure, build the no card. Password."). The page plays at phone size in Chrome (`tools/feed-check.js`, 16 of 16 checks at 412x915). The lock (`feed/_worker.js`) was run in Cloudflare's local runtime (`wrangler pages dev`): signed out, the page, the feed list, a clip and the lock file itself all answer 401 with the password page; a wrong password is refused; the right one opens the feed and the first clip plays in Chrome; 6 unit tests cover forged, expired and old-password cookies and the fail-closed case. **Not verified on the real Cloudflare address**, because nothing has been uploaded: the publish step runs the same signed-out proof there, on the main address and the upload's own preview address, and refuses to leave clips up if it fails. |
| 7. Test batch | 20 clips made; **not yet on the published feed** | **Half done.** 20 scripts (5 of each type) went through the factory and all 20 clips are in `clips/` and listed in `feed/feed.json`: every one is between 37.7 and 41.3 seconds, 1.4 to 1.8 MB, and passes the mouth-timing check. The 14-clip batch took 40 minutes in one run with no failures. They reach the live feed when Phase 6 is finished. |

## Actions minutes

- Measured on GitHub's free runner: about 45 s of setup per run, then about 2 min 45 s per clip (voice 26 s, render 2 min 15 s).
- **At 3 clips a day in one commit: about 10 minutes a day, roughly 300 minutes a month, 15% of the 2,000 free minutes.** As three separate commits: about 360.
- This build used about 67 minutes in total.
- The 2,000 minutes are shared by all of Javi's private repos. `render-machine` used the whole allowance in October (its runs take about 45 minutes each). If that happens again, the factory simply cannot start until the month resets. No billing setting was touched, and none should be.

## Needs Javi

1. **Three GitHub secrets and one variable, then one button** (`docs/FEED-SETUP.md`, about 5 minutes, no card): `CLOUDFLARE_API_TOKEN` (Pages: Edit only), `CLOUDFLARE_ACCOUNT_ID`, `FEED_PASSWORD` (at least 12 characters), and the variable `FEED_DEPLOY_ENABLED` = `true`. Then run the **deploy-feed** workflow from `build/smart-feed` and read its summary.
2. **Art.** The puppets and backdrops in the clips are simple placeholders drawn in code. `docs/CAST-PROMPTS.md` has one exact prompt per picture for ElevenLabs or Muse. Drop the results into `assets/cast/<name>/` and `assets/backgrounds/`, delete the `PLACEHOLDER` markers, and run `node tools/requeue.js --all` to remake the clips with the real art (about 55 Actions minutes for 20 clips).
3. **Your OK to merge** pull request #1 into `main`. After the merge the factory runs from `main`, which is where Muse should put scripts.
4. **Listen to a few clips** and say if the pace or the mouth movement should change. Links are in the pull request's comments.

## Things to know

- **Storage.** Clips are kept in the repo (every publish uploads from there). They are about 1.5 MB each, so 3 a day is about 1.7 GB a year. GitHub recommends keeping a repo under 1 GB. In about six months, decide whether to prune old clips or move storage. Nothing switches by itself.
- **The lock is one shared password, not your email.** Anyone with both the address and the password can watch. Changing the `FEED_PASSWORD` secret and running deploy-feed signs every device out.
- **The feed's address** will look like `smart-feed-xyz.pages.dev`. It does not exist yet. Record it here when it does.
- **GitHub cannot attach files to a pull request comment through its API**, so the MP3s, MP4s and stills are committed on the branch and linked from the comments instead.
- **Fact-checking.** All 20 scripts follow the quote rule: exact words only for the three KJV verses (Matthew 6:34, Proverbs 27:17, Micah 6:8), the first line of Psalm 46:10 (KJV) and Peter Thiel's interview question from Zero to One; everything else is paraphrased and marked so. Claude wrote them from memory without looking each source up, so a read-through by Javi is worthwhile before they are treated as checked.

## What's next

1. Javi adds the secrets and runs **deploy-feed** (item 1 above).
2. Claude reads the run's summary with Javi and confirms the last Phase 6 check on the real address: signed out, only the password box. Record the address here.
3. Javi merges the pull request. Muse takes over with `README.md`.
