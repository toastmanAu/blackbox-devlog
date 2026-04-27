# blackbox-devlog

Public dev log for the [BlackBox](https://github.com/toastmanau/blackbox-pos) CKB point-of-sale device.

This repo is the single source of truth. Pushes to `main` trigger:

1. **Twitter** — new entries auto-post (single tweet + optional thread) via the @blackbox account
2. **Website** — Astro static site at https://blackbox.wyltekindustries.com (also exposes `/feed.json` and `/rss.xml`)

## Add an entry

Drop a markdown file in `entries/`:

```bash
cp entries/_template.md entries/$(date +%Y-%m-%d)-my-entry.md
$EDITOR entries/$(date +%Y-%m-%d)-my-entry.md
git add entries/
git commit -m "devlog: my entry"
git push
```

Or use the `/devlog` skill in Claude Code, which scaffolds the entry from session context.

## Idempotency

`.published.json` records which entries have been tweeted. The Action only posts entries not in the lockfile, so editing an already-published entry updates the website but never re-tweets.

## Layout

- `entries/` — canonical markdown entries (one source of truth)
- `shared/` — Zod schema shared between CI scripts and the Astro site
- `scripts/` — Node ESM tooling for the publish pipeline
- `site/` — Astro static site
- `.github/workflows/publish.yml` — the one Action that ties it all together
- `docs/superpowers/specs/` — design docs

## Design

See `docs/superpowers/specs/2026-04-27-blackbox-devlog-design.md`.
