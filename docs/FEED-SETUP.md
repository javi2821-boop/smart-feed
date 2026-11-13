# The feed: where it lives and how it is published

**Address: https://javi2821-boop.github.io/smart-feed/**

The feed is hosted by GitHub Pages, straight from this repo. There is no Cloudflare, no token, no password and no secret of any kind. Javi chose this on 2026-11-12: the feed does not need to be private, so the repo is public and GitHub hosts the page for free.

## What "public" means here

- Anyone who has the address can watch the clips. The address is not listed anywhere, and the page asks search engines not to index it, but it is not locked.
- Everything in this repo is visible to anyone: the scripts, the clips, the feed page and the code, including the render engine copied from the private `render-machine` repo. `render-machine` itself stays private.
- So: **never commit anything private to this repo.** No tokens, emails, account IDs or personal notes.

## How publishing works

- The **factory** workflow publishes the feed by itself after it makes clips.
- The **deploy-feed** workflow publishes by hand: Actions tab > **deploy-feed** > **Run workflow**. Use it after changing the feed page (`feed/`) or after removing a clip.
- Both build the site with `node factory/build-site.js` (the feed page plus every clip listed in `feed/feed.json`), hand it to GitHub Pages, and then check the live address lists the expected number of clips. If that check fails the run ends red.
- Publishing only happens while the repo variable `FEED_DEPLOY_ENABLED` is `true` (Settings > Secrets and variables > Actions > Variables). Set it to anything else to pause publishing.
- Only the branches `main` and `build/smart-feed` are allowed to publish (Settings > Environments > github-pages).

A new clip shows up on the phone a minute or two after the run finishes. Pull down or reopen the feed to see it.

## Putting it on the phone

1. On the Samsung phone, open Chrome and go to the address above.
2. Tap once for sound.
3. Chrome's menu (three dots) > **Add to Home screen** > **Install**. It now opens full screen from its own icon.

## Limits to know about

- **Site size.** GitHub Pages allows a site of about 1 GB. Clips are about 1.5 MB each, so that is roughly 600 clips, about six to seven months at 3 a day. The build step prints a warning in the run when the feed passes 900 MB. Then it is time to remove old clips (`node tools/requeue.js --remove <name>`) or ask Javi about other storage. Nothing switches by itself.
- **Traffic.** GitHub Pages has a soft limit of 100 GB of traffic a month. One person watching uses a tiny fraction of it.
- **Actions minutes.** Standard GitHub runners are free for public repos, so the factory no longer uses the 2,000-minute allowance shared by Javi's private repos.

## Making it private again later

Switching the repo back to private turns the feed off (GitHub Pages on a private repo needs a paid plan). The earlier private design, Cloudflare Pages behind a password, is in this repo's history at commit `5333550` and can be restored if it is ever wanted.
