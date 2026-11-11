# Feed setup: Cloudflare Pages, locked with Cloudflare Access

This is done once, by Javi, in the GitHub and Cloudflare websites. Nothing secret goes in the repo: the token and account ID live only in GitHub Actions secrets.

The order matters. **The lock goes on before any clip is uploaded.** The deploy step enforces that by itself: it asks the feed's addresses for the page while signed out, and unless both the main address and a preview address answer with the Cloudflare Access login, it uploads only a blank page with no clips.

> **Stop if Cloudflare asks for a card.** Cloudflare's own setup guide says that creating a Zero Trust organization (which Access needs) asks for payment details even on the Free plan, with nothing charged. If your account already has Zero Trust set up, you won't be asked. If it does ask, stop there and tell Claude: that is a decision for you, not a step to click through.

Menu names in the Cloudflare dashboard change now and then. If a name below isn't there, look for the closest match; the thing being set up is the same.

## Step 1. Two GitHub secrets

**The token**

1. In Cloudflare, open **My Profile** (top right) > **API Tokens** > **Create Token**.
2. Choose **Create Custom Token**.
3. Name it `smart-feed deploy`.
4. Under **Permissions** add one row: **Account** / **Cloudflare Pages** / **Edit**. Nothing else.
5. Under **Account Resources** choose **Include** / your own account.
6. **Continue to summary** > **Create Token**. Copy the token. Cloudflare shows it once.

This token can create and update Pages projects in your account and nothing more. It cannot read or change Access settings, DNS, billing or your other products.

**The account ID**

1. In Cloudflare, open **Workers & Pages**.
2. The **Account ID** is in the right-hand column (a long string of letters and numbers). Copy it.

**Add both to GitHub**

1. Open the repo's **Settings** > **Secrets and variables** > **Actions** > **Secrets** tab > **New repository secret**.
2. Name `CLOUDFLARE_API_TOKEN`, value: the token. Save.
3. Again: name `CLOUDFLARE_ACCOUNT_ID`, value: the account ID. Save.

## Step 2. Switch publishing on, and make the empty project

1. Same page, **Variables** tab > **New repository variable**: name `FEED_DEPLOY_ENABLED`, value `true`.
2. Open the repo's **Actions** tab > **deploy-feed** > **Run workflow** > choose the branch (`build/smart-feed` during the build, `main` after the merge) > **Run workflow**.
3. When it finishes, open the run. Its summary says it created the project, that the address is **not locked**, and that **no clips were published**. It also shows the feed's address, which looks like `smart-feed-xyz.pages.dev`. That address is needed in step 3.

At this point the address shows a blank page that says "Nothing here yet." No clip and no list of clips has left GitHub.

(If the name `smart-feed` is taken, Cloudflare adds a suffix to the address. To use a different project name, add a repository variable `PAGES_PROJECT` with the name you want before running the workflow.)

## Step 3. Lock it with Cloudflare Access

The goal: only your email can open the feed, on the main address **and** on every preview address. Preview addresses (`<random>.smart-feed-xyz.pages.dev`) are public by default and every upload creates one, so both must be covered.

1. In Cloudflare, open **Workers & Pages** and select the `smart-feed` project.
2. Go to **Settings** > **General** and select **Enable access policy**.
   This protects the preview addresses only. If you have never used Zero Trust, Cloudflare starts its setup here: it asks for a team name and a plan. **If it asks for payment details, stop and tell Claude.**
3. Select **Manage** next to the access policy that was just created. It opens the Access application for the project.
4. Select **Configure**. Under **Public hostname**, in the **Subdomain** field, delete the wildcard (`*`) so the hostname is just `smart-feed-xyz.pages.dev`, and **Save**. (You may have to change the application name slightly for it to save.) The main address is now protected.
5. Go back to the Pages project > **Settings** > **General** and select **Enable access policy** again. This puts the preview protection back.
6. Check that there are now **two** Access applications: one for `smart-feed-xyz.pages.dev` and one for `*.smart-feed-xyz.pages.dev`. (They are listed under **Zero Trust** > **Access controls** > **Applications**.)
7. Open each of the two applications and look at its policy. It must be: action **Allow**, include **Emails**, and exactly one email, yours. Remove anything broader (for example "everyone in my Cloudflare account" is fine since that is only you, but an email domain like `@gmail.com` is not). Save.
8. Under **Zero Trust** > **Settings** > **Authentication** (it may be called **Integrations** > **Identity providers**), make sure **One-time PIN** is listed as a login method. With it, Cloudflare emails you a 6-digit code when you sign in. Add it if it's missing.

These steps follow Cloudflare's own page "Enable Access on your `*.pages.dev` domain" (Pages > Platform > Known issues).

## Step 4. Check the lock and publish

1. In a private browser window (so you are signed out), open `https://smart-feed-xyz.pages.dev/`. You must see the **Cloudflare Access sign-in page**, not the feed and not the blank page.
2. Run the **deploy-feed** workflow again (Actions > deploy-feed > Run workflow).
3. Open the run's summary. It must say both addresses are locked and that the clips were published. If it says "NOT locked" for either address, the clips were held back: fix that address in step 3 and run it again.

## Step 5. Put it on the phone

1. On the Samsung phone, open Chrome and go to `https://smart-feed-xyz.pages.dev/`.
2. Enter your email on the Access page, then the 6-digit code Cloudflare emails you.
3. The feed opens. Tap once for sound.
4. Chrome's menu (three dots) > **Add to Home screen** > **Install**. It now opens full screen from its own icon.

Access keeps you signed in for a while (24 hours by default). To be asked less often, open each of the two Access applications > **Configure** and set **Session Duration** to **1 month**.

## What the lock check does on every publish

Before uploading, `factory/deploy.js` requests `feed.json` from the main address and from the newest deployment's own address, signed out, and looks for a redirect to `*.cloudflareaccess.com`. Both must redirect. After uploading it checks the new deployment's address too. If you ever remove an Access application by accident, the next publish replaces the feed with the blank page instead of leaving clips in the open.

## Limits to know about

- One file on Pages can be 25 MB at most. Clips are capped at 10 MB by the factory and are typically 1.5 to 2 MB.
- A Pages project can hold 20,000 files on the free plan. Each clip is two files (the video and a small poster image), so that is room for about 10,000 clips.
- The clips are also kept in the GitHub repo (`clips/`), because every publish uploads from there. At 3 clips a day that is about 1.7 GB a year. GitHub recommends keeping a repo under 1 GB and starts to object around 5 GB, so after roughly six months it is time to decide: prune the oldest clips, or move storage somewhere else. That is Javi's decision when it gets close; nothing switches storage by itself.
