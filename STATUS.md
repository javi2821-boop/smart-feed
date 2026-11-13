# Smart Feed status

Last updated: 2026-11-12 (evening). Written by Claude.

**The feed is live at https://javi2821-boop.github.io/smart-feed/** with 20 clips. The repo and the feed are public, by Javi's choice on 2026-11-12 ("go with a"). The code is on the branch `build/smart-feed`, behind draft pull request #1. **Not merged**: `main` holds only a note and four placeholder workflow files.

## Where each phase stands

| Phase | State | Check result |
|---|---|---|
| 1. Repo and engine | Built | **PASS.** The repo was private through the build and was made public on 2026-11-12 at Javi's direction. The copied engine rendered its own sample clip on a GitHub runner (4 s, 1080x1920, job took 46 s). Source commit recorded in `ENGINE.md`; `render-machine` was not changed. |
| 2. Voice | Built | **PASS.** Kokoro runs in GitHub Actions on CPU with its model files cached. Three samples, all 35 to 45 s, loudest sample -3.4 dBFS (no clipping). One 100-word read takes about 26 s. **Javi chose the warm male voice (`am_michael`) on 2026-11-10.** |
| 3. Cast and style guide | Built with placeholder art | **PASS.** `tools/validate-cast.js`: 15 characters x 4 parts and 5 backgrounds, right sizes, transparency, same loader for placeholders and real art. `docs/STYLE-GUIDE.md` and `docs/CAST-PROMPTS.md` (65 prompts) are ready. **Real art is not made yet.** |
| 4. Clip template | Built | **PASS.** One clip of each type made on GitHub. Mouth timing measured with `tools/mouth-check.js`: open on 100% of loud frames, closed on 100% of silent frames, 0 frames of lag. Text sits inside a 150 px side margin, so a tall phone cuts nothing off. |
| 5. Factory | Built, running from the branch | **PASS.** 2 good scripts + 1 broken: 2 clips made, the broken one moved to `scripts/failed` with a plain reason, the run ended red. |
| 6. Feed | **Live, public** | **PASS for a public feed.** Javi dropped the privacy requirement on 2026-11-12, so there is no lock and no "signed out shows the login" check: the feed is on GitHub Pages with no Cloudflare, token or password. Checked on the real address in Chrome at phone size (412x915): 20 clips listed, the first plays muted by itself, the first tap turns sound on, a swipe plays the next clip with sound, video seeking works, and the home-screen manifest loads. Every publish also checks the live address lists the expected number of clips. **Not checked on the actual Samsung phone.** |
| 7. Test batch | **On the feed** | **PASS.** 20 scripts (5 of each type) went through the factory. All 20 clips are on the live feed, each between 37.7 and 41.3 seconds, 1.4 to 1.8 MB, and each passes the mouth-timing check. |

## Actions minutes

- Measured on GitHub's free runner: about 45 s of setup per run, then about 2 min 45 s per clip (voice 26 s, render 2 min 15 s).
- The repo is public now, and standard runners are free for public repos, so the factory no longer draws on the 2,000-minute allowance shared by the private repos. (While private, 3 clips a day would have been about 300 minutes a month.)
- The build used about 67 minutes of that allowance while the repo was private.

## Needs Javi

1. **Open the feed on the Samsung phone** and add it to the home screen (`docs/FEED-SETUP.md`). Say if anything looks or sounds wrong on the real phone.
2. **Art.** The puppets and backdrops in the clips are simple placeholders drawn in code. `docs/CAST-PROMPTS.md` has one exact prompt per picture for ElevenLabs or Muse. Drop the results into `assets/cast/<name>/` and `assets/backgrounds/`, delete the `PLACEHOLDER` markers, and run `node tools/requeue.js --all` to remake the clips with the real art (about 55 Actions minutes for 20 clips).
3. **Your OK to merge** pull request #1 into `main`. After the merge the factory runs from `main`, which is where Muse should put scripts.
4. **Listen to a few clips** and say if the pace or the mouth movement should change. Links are in the pull request's comments.

## Things to know

- **Storage.** GitHub Pages allows a site of about 1 GB, roughly 600 clips, about six to seven months at 3 a day. The build step warns when the feed passes 900 MB. Then decide whether to prune old clips or move storage. Nothing switches by itself.
- **Public means the whole repo.** Anyone can read the scripts and the code, including the render engine copied from the private `render-machine` repo (`render-machine` itself stays private). The feed page asks search engines not to index it, but it is not locked. Going back to private would turn the feed off; the earlier password-locked Cloudflare design is in the history at commit `5333550`.
- **The feed's address:** https://javi2821-boop.github.io/smart-feed/
- **GitHub cannot attach files to a pull request comment through its API**, so the MP3s, MP4s and stills are committed on the branch and linked from the comments instead.
- **Fact-checking.** All 20 scripts follow the quote rule: exact words only for the three KJV verses (Matthew 6:34, Proverbs 27:17, Micah 6:8), the first line of Psalm 46:10 (KJV) and Peter Thiel's interview question from Zero to One; everything else is paraphrased and marked so. Claude wrote them from memory without looking each source up, so a read-through by Javi is worthwhile before they are treated as checked.

## What's next

1. Javi tries the feed on the phone.
2. Javi has the art made, when he wants real puppets.
3. Javi merges the pull request. Muse takes over with `README.md`.
