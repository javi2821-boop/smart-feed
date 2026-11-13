# Feed setup: Cloudflare Pages behind a password

This is done once, by Javi. It needs a free Cloudflare account and **no card**. Nothing secret goes in the repo: the token, the account ID and the password live only in GitHub Actions secrets.

## How the lock works

The feed is locked by a small program, [`feed/_worker.js`](../feed/_worker.js), that Cloudflare Pages runs in front of every request to every address of the project: the main address and each upload's own "preview" address. There is no unlocked way in.

- Opening any address without signing in shows a password box. No clip and no list of clips is sent.
- The right password keeps that phone signed in for 90 days.
- If the password was never set up, everything answers "Locked". It fails closed.

Every publish proves the lock before it finishes. Signed out, it asks for the page, the feed list and a clip, on the main address and on the new upload's own address, and all must answer with the password page. It tries a wrong password (must be refused) and the right one (must get in). The first time, it puts the lock up with **no clips behind it** and proves it before any clip leaves GitHub. If a proof ever fails after publishing, it replaces the feed with a blank locked page and the run ends red.

Compared with Cloudflare Access (sign-in by emailed code), this is one shared password instead of your email. Anyone who has the address **and** the password can watch, so treat the password like a house key. It is the no-card choice Javi made on 2026-11-12.

## Step 1. A Cloudflare token and the account ID

**The token**

1. In Cloudflare, open **My Profile** (top right) > **API Tokens** > **Create Token**.
2. Choose **Create Custom Token**. Name it `smart-feed deploy`.
3. Under **Permissions** add one row: **Account** / **Cloudflare Pages** / **Edit**. Nothing else.
4. Under **Account Resources** choose **Include** / your own account.
5. **Continue to summary** > **Create Token**. Copy the token. Cloudflare shows it once.

This token can create and update Pages projects in your account and nothing more. It cannot touch DNS, billing or your other products. (Your other Pages sites, like the YFS site, are in the same account, so keep the token only in GitHub.)

**The account ID**

In Cloudflare, open **Workers & Pages**. The **Account ID** is in the right-hand column. Copy it.

Menu names in the Cloudflare dashboard change now and then. If a name isn't there, look for the closest match.

## Step 2. Three GitHub secrets and one variable

Pick the password first: **at least 12 characters**. Three or four random words is good ("lantern-orbit-maple-seven"). The publish step refuses anything shorter.

In the repo on GitHub: **Settings** > **Secrets and variables** > **Actions**.

On the **Secrets** tab, **New repository secret**, three times:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | the account ID from step 1 |
| `FEED_PASSWORD` | the password you picked |

On the **Variables** tab, **New repository variable**: name `FEED_DEPLOY_ENABLED`, value `true`.

Or, from a terminal with the GitHub CLI, each of these asks you to paste the value (it is not shown or saved anywhere else):

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo javi2821-boop/smart-feed
```
```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --repo javi2821-boop/smart-feed
```
```bash
gh secret set FEED_PASSWORD --repo javi2821-boop/smart-feed
```
```bash
gh variable set FEED_DEPLOY_ENABLED --body true --repo javi2821-boop/smart-feed
```

## Step 3. Publish

1. Open the repo's **Actions** tab > **deploy-feed** > **Run workflow** > choose the branch (`build/smart-feed` during the build, `main` after the merge) > **Run workflow**.
2. When it finishes (about a minute), open the run and read its **Feed publish** summary. A good run says, in order: the project was created, the lock went up first on an empty page and works, the clips were published, and the signed-out checks passed on both addresses. It also shows the feed's address, which looks like `smart-feed-xyz.pages.dev`.
3. If it says "Not published" or "ERROR", it also says why. Nothing with clips in it is left at an unlocked address in either case.

(If the name `smart-feed` is taken, Cloudflare adds a suffix to the address. To use another project name, add a repository variable `PAGES_PROJECT` before running the workflow.)

## Step 4. Put it on the phone

1. On the Samsung phone, open Chrome and go to the feed's address.
2. Type the password. Let Chrome save it if it offers.
3. The feed opens. Tap once for sound.
4. Chrome's menu (three dots) > **Add to Home screen** > **Install**. It now opens full screen from its own icon.

To check the lock yourself: open the address in a private window. You must see only the password box.

## Changing the password, or locking everyone out

Change the `FEED_PASSWORD` secret in GitHub, then run **deploy-feed**. Every phone is signed out and needs the new password. Do this if the password is ever shared by mistake.

Older uploads keep their own preview addresses (random names, never listed anywhere). They stay locked, but with the password that was current when they were uploaded. To remove them entirely, delete old deployments in the Cloudflare dashboard: **Workers & Pages** > the project > **Deployments**.

## Limits to know about

- **Requests.** The lock counts as a Cloudflare Worker, and the free plan allows 100,000 requests a day. One person watching uses a few hundred. If the limit were ever hit, the feed would show an error until the next day; clips would not become public.
- **File size.** One file on Pages can be 25 MB at most. Clips are capped at 10 MB by the factory and are typically 1.5 to 2 MB.
- **File count.** A Pages project can hold 20,000 files on the free plan. Each clip is two files, so that is room for about 10,000 clips.
- **Repo size.** The clips are also kept in the GitHub repo (`clips/`), because every publish uploads from there. At 3 clips a day that is about 1.7 GB a year. GitHub recommends keeping a repo under 1 GB, so after roughly six months it is time to decide: prune the oldest clips, or move storage somewhere else. That is Javi's decision when it gets close; nothing switches storage by itself.

## Switching to Cloudflare Access later

If you ever set up Zero Trust, Access can be added on top (Pages project > **Settings** > **Enable access policy**, then Cloudflare's "Enable Access on your `*.pages.dev` domain" steps). The publish check accepts either lock. Until then, the password is the lock.
