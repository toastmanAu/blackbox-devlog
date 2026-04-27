# BlackBox Devlog — Design Spec

**Date:** 2026-04-27
**Status:** Approved (Phill)
**Repo target:** `github.com/toastmanau/blackbox-devlog`
**Site target:** `blackbox.wyltekindustries.com`
**Twitter target:** Friend's @blackbox account (existing)

## 1. Purpose & Scope

A dev log for the BlackBox CKB point-of-sale device, opening at wave 2 / iteration 2 of the prototype. Wave 1 (six testing units, versions v0.1.9 → v0.2.0) is closed and documented elsewhere; this devlog is forward-looking from now.

Single source of truth (markdown in a GitHub repo) fans out to three surfaces:

1. **GitHub repo** — canonical entries, lockfile, history.
2. **Twitter** — auto-posts new entries (single tweet, optional thread) on push.
3. **Standalone website** — Astro static site at `blackbox.wyltekindustries.com`, with JSON Feed + RSS as byproducts. Embedded into wyltekindustries.com initially via iframe; standalone domain may move later.

Out of scope for the initial build: backfilling wave-1 release notes; Discord/Mastodon cross-post; comment system; analytics.

## 2. Architecture

```
            entries/2026-04-27-foo.md  ←  hand-written or /devlog scaffolded
                          │
                          │  git push
                          ▼
                ┌─────────────────────┐
                │   GitHub Actions    │
                └─────────────────────┘
                  │         │       │
        diff lockfile    Astro    Twitter
        → unposted       build    upload media
        entries only       │      → post tweet
                  │        │      → thread (if any)
                  │        │      → write tweet_url
                  │        ▼            │
                  │   gh-pages branch   │
                  │   (site + feeds)    │
                  ▼                     ▼
            .published.json updated atomically in same commit
                  │
                  ▼
        site at blackbox.wyltekindustries.com
        feeds: /feed.json, /rss.xml
        wyltekindustries.com embeds via /embed iframe
```

The GitHub Action has three jobs:

- **`detect`** — diffs `entries/` against `.published.json`, validates frontmatter, outputs a JSON list of unposted slugs.
- **`tweet`** — runs only if `detect` found unposted slugs. Posts each entry to Twitter (with media + optional thread). Appends each successfully-posted slug to `.published.json` and commits back to `main` with `[skip ci]`.
- **`build-and-deploy`** — runs Astro build, pushes `site/dist/` to `gh-pages`. Runs even if `tweet` fails (site stays in sync with content).

Concurrency is set to `group: publish, cancel-in-progress: false` — back-to-back pushes queue rather than clobber the lockfile.

## 3. Repo Layout

```
blackbox-devlog/
├── README.md
├── CLAUDE.md                    # project guidance for Claude Code
├── .gitignore
├── .published.json              # { "slugs": [...], "tweets": { slug: tweet_url } }
│
├── entries/
│   ├── _template.md             # frontmatter template the /devlog skill copies from
│   ├── 2026-04-27-wave-2-kickoff.md
│   └── 2026-04-27-wave-2-kickoff/
│       └── hero.png             # per-entry media folder, named identically to the .md
│
├── site/                        # Astro project
│   ├── astro.config.mjs         # site: https://blackbox.wyltekindustries.com
│   ├── package.json
│   ├── public/
│   │   └── CNAME                # contains "blackbox.wyltekindustries.com"
│   └── src/
│       ├── content/config.ts    # Zod schema mirroring frontmatter
│       ├── layouts/
│       │   ├── Base.astro
│       │   └── Entry.astro
│       └── pages/
│           ├── index.astro      # entry list, paginated after 20
│           ├── [slug].astro     # individual entry
│           ├── feed.json.ts     # JSON Feed 1.1
│           ├── rss.xml.ts       # RSS 2.0
│           └── embed.astro      # iframe-friendly compact list
│
├── scripts/                     # CI tooling (Node ESM, minimal deps)
│   ├── detect-unposted.mjs
│   ├── post-to-twitter.mjs      # uses twitter-api-v2
│   └── update-lockfile.mjs
│
├── .github/workflows/
│   └── publish.yml
│
└── docs/superpowers/specs/
    └── 2026-04-27-blackbox-devlog-design.md   # this file
```

`site/` has its own `package.json` so `scripts/` (zero/minimal deps) doesn't drag in the Astro toolchain for tweet jobs.

## 4. Entry Format (Frontmatter Schema)

Every entry is markdown with YAML frontmatter:

```yaml
---
# Required
title: "Wave 2 kickoff: redesigned home screen"
date: 2026-04-27
tweet: "Wave 2 of the BlackBox prototype kicks off today. New home screen, new gallery flow, and a much simpler bring-up path. Full notes in the devlog."

# Optional — content
summary: "First entry of the second iteration. Wave 1's six test units shipped; this is what's next."
tags: ["wave-2", "release", "home-screen"]
version: "0.3.0-dev"

# Optional — media (array of {src, alt})
media:
  - src: hero.png        # relative to <slug>/ folder, OR an absolute URL
    alt: "BlackBox v0.3 home screen rendered on the LCD"
  - src: gallery-flow.png
    alt: "New gallery navigation flow"

# Optional — thread (each item is one reply tweet, in order)
thread:
  - "What changed from wave 1: simpler power path, swappable face plate, OTA path."
  - "What's next: ESP-IDF migration, on-device wallet view, custom case."

# Optional — escape hatch
do_not_post: false       # if true, entry shows on site/feed but never tweets
---

Body in markdown here. Astro renders this on the site.
The `tweet` and `thread` fields are not included in the rendered body.
```

**Rules:**

- `tweet` is required even when `thread` is present. The first tweet of a thread is the entry tweet.
- `tags` is a list, not a comma-string.
- The slug is derived from the filename (`2026-04-27-foo.md` → `2026-04-27-foo`); there is no separate `id:` field.
- Schema is enforced twice: by `detect-unposted.mjs` (fails the Action before any Twitter call) and by Astro's content collection (fails the build). Both use the same Zod definition, imported from a shared module.
- Tweet text must be ≤280 weighted characters as defined by Twitter's official counting algorithm (most Latin/digits = 1, CJK and many emoji = 2). The validator uses the `twitter-text` npm package; rejects longer strings before any API call.

## 5. Idempotency: The Lockfile

`.published.json`:

```json
{
  "version": 1,
  "slugs": [
    "2026-04-27-wave-2-kickoff"
  ],
  "tweets": {
    "2026-04-27-wave-2-kickoff": "https://twitter.com/blackbox/status/1785000000000000000"
  }
}
```

- The `slugs` array is the authoritative "have we tweeted this" list.
- `tweets` maps slug → URL of the first (head) tweet for display on the site.
- The lockfile is appended to (never rewritten) and is sorted lexically on write so PR diffs stay clean.
- Writing the lockfile and pushing it back to `main` is the *last* step of the `tweet` job — only successful posts are recorded.
- If the `tweet` job fails partway through a thread, the slug is *not* added. Operator deletes the orphaned tweets manually and re-pushes; the whole thread re-fires on retry.

## 6. The `/devlog` Skill

A scaffolding accelerator. Markdown stays canonical; this skill speeds up authoring.

- **Location:** `~/.claude/skills/devlog/SKILL.md`
- **Trigger:** `/devlog` (with optional inline notes: `/devlog redesigned home screen`)

**Flow:**

1. Verify CWD is `~/blackbox-devlog`. If not, `cd` there. If the repo doesn't exist locally, abort with a clear error.
2. Gather context, in priority order:
   - Inline argument from the slash command
   - Recent session context (e.g. work just done in `~/blackbox-pos`)
   - Ask Phill if neither yields enough
3. Draft the entry:
   - Slug: `YYYY-MM-DD-<kebab-title>`, confirmed by Phill before write
   - Title, body (2–4 short paragraphs), `tweet:` (~240 chars, drafted)
   - `thread:` only when there's clearly more than one tweet's worth
   - `media:` placeholder array with comments for any image paths Phill mentioned
4. Show the full proposed file. Phill says `yes` / `tweak the tweet` / etc.
5. On confirmation: write file, commit (`devlog: <title>`), push to `main`. The Action takes it from there.

**Hard guards:**

- Never push without a final confirmation, even if Phill said "yes" earlier in the same session.
- Never edits an already-published entry (lockfile would prevent re-tweet anyway, but the failure mode is confusing — better to refuse).
- Never modifies `.published.json` directly. The lockfile is owned by CI.

## 7. The Astro Site

A small, plain-HTML Astro project. No client-side framework; no JS shipped to the browser by default.

**Routes:**

- `/` — entry list, newest first. Card per entry: title, date, summary, hero image, tags. Pagination after 20.
- `/[slug]` — full entry. Hero image, body (rendered from markdown), "tweeted on X" link to the original tweet (read from `.published.json` at build time).
- `/feed.json` — JSON Feed 1.1.
- `/rss.xml` — RSS 2.0 (via `@astrojs/rss`).
- `/embed` — iframe-friendly compact list of latest 5 entries. Transparent background, no chrome, links open in `_top`.

**Style:**

- Mono-feeling typography (system mono stack) for the dev/hardware vibe; clean sans for body.
- 8pt grid. Two layouts (`Base.astro`, `Entry.astro`). No premature componentisation.
- Per `~/.claude/rules/coding-style.md` and the `ui-design` skill: small files, focused responsibilities.

**Wyltek embed snippet:**

```html
<iframe
  src="https://blackbox.wyltekindustries.com/embed"
  width="100%"
  height="420"
  loading="lazy"
  style="border:0;"
  title="BlackBox devlog"
></iframe>
```

That's the entire integration on the wyltek side. Swap-out cost when the standalone moves to a new domain: change one URL.

## 8. The GitHub Action

`.github/workflows/publish.yml`:

```yaml
name: publish
on:
  push:
    branches: [main]
    paths: ['entries/**', 'site/**', 'scripts/**', '.github/workflows/publish.yml']
  workflow_dispatch:
    inputs:
      dry_run:
        type: boolean
        default: false

concurrency:
  group: publish
  cancel-in-progress: false

jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      unposted: ${{ steps.run.outputs.unposted }}
      count: ${{ steps.run.outputs.count }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --prefix scripts
      - id: run
        run: node scripts/detect-unposted.mjs

  tweet:
    needs: detect
    if: needs.detect.outputs.count > 0
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --prefix scripts
      - run: node scripts/post-to-twitter.mjs
        env:
          UNPOSTED: ${{ needs.detect.outputs.unposted }}
          TWITTER_API_KEY: ${{ secrets.TWITTER_API_KEY }}
          TWITTER_API_SECRET: ${{ secrets.TWITTER_API_SECRET }}
          TWITTER_ACCESS_TOKEN: ${{ secrets.TWITTER_ACCESS_TOKEN }}
          TWITTER_ACCESS_SECRET: ${{ secrets.TWITTER_ACCESS_SECRET }}
          DRY_RUN: ${{ github.event_name == 'workflow_dispatch' && inputs.dry_run || 'false' }}
      - name: commit lockfile
        if: github.event_name != 'workflow_dispatch' || inputs.dry_run != true
        run: |
          git config user.name "blackbox-devlog-bot"
          git config user.email "noreply@wyltekindustries.com"
          git add .published.json
          git diff --staged --quiet || git commit -m "publish: update lockfile [skip ci]"
          git push

  build-and-deploy:
    needs: detect
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --prefix site
      - run: npm run build --prefix site
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site/dist
          cname: blackbox.wyltekindustries.com
```

**Failure semantics:**

- Schema validation in `detect` fails the run before any irreversible action.
- Tweet failure mid-thread leaves orphaned tweets; slug is *not* recorded; manual cleanup + re-push.
- `[skip ci]` on the lockfile commit prevents an infinite Action loop.
- `build-and-deploy` runs regardless of `tweet` outcome — site/feed reflect repo state even if Twitter is down.

## 9. Secrets & Bootstrap

**Repo secrets to configure in `Settings → Secrets and variables → Actions`:**

- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`

(`GITHUB_TOKEN` is auto-provided.)

**One-time setup:**

1. Friend creates / hands over a Twitter Developer App for the @blackbox account; collect the four credential values.
2. Configure GitHub repo secrets (above).
3. GitHub Pages: `Settings → Pages → source = gh-pages branch, custom domain = blackbox.wyltekindustries.com, enforce HTTPS`.
4. DNS: add a CNAME `blackbox` → `toastmanau.github.io` in the wyltekindustries.com registrar. GH Pages auto-provisions the cert once DNS resolves.

**Safe-bootstrap order (avoiding accidental first-tweet of a placeholder):**

1. Scaffold repo locally; `.published.json` lists the placeholder entry as already-posted.
2. Push to GitHub. `detect` finds nothing to post; `build-and-deploy` runs. Site appears at `https://toastmanau.github.io/blackbox-devlog/`.
3. Configure DNS; wait for propagation; verify `blackbox.wyltekindustries.com`.
4. `workflow_dispatch` with `dry_run: true` on a real entry — log shows would-be tweet, no actual post.
5. Drop a real entry, normal `git push`. First real tweet goes live.

## 10. Testing

Vitest in `scripts/`. Twitter API mocked at the `twitter-api-v2` boundary; the live round-trip is validated only via `dry_run` mode in production.

- **Schema tests** — fixtures of valid + invalid frontmatter; assert acceptance/rejection.
- **Lockfile tests** — given a lockfile and a directory, assert correct `unposted` output.
- **Tweet builder tests** — given a parsed entry, assert correct shape of tweet payloads (text + media_ids + reply chain).
- **Site smoke** — `npm run build` in CI on every PR.

Explicitly not tested: Astro internals, DNS layer, GH Pages mechanics.

## 11. Open Questions / Future Work

These are deliberately deferred — flagged here so they're not forgotten:

- **Standalone domain.** When the devlog graduates beyond the wyltekindustries.com embed, point a dedicated domain (e.g. `blackbox.dev`) at the same `gh-pages` branch — change CNAME in `site/public/CNAME` and DNS, no other changes.
- **Cross-post to additional networks** (Mastodon, Discord, Bluesky). Same shape as the Twitter step — add a script per network, run after the Twitter step, append to the lockfile under separate keys.
- **Per-entry analytics** (read counts, scroll depth). Out of scope for now; would need a non-static layer.
- **Comment system.** Likely Giscus (GitHub Discussions–backed) when there's an audience to warrant it.
