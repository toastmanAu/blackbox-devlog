# CLAUDE.md — blackbox-devlog

Project guidance for Claude Code working in this repo.

## What this repo is

A markdown-driven devlog for the BlackBox CKB point-of-sale device (`~/blackbox-pos`). Entries in `entries/*.md` are the single source of truth; CI fans out to Twitter and a static Astro site on every push to `main`.

The full design is in `docs/superpowers/specs/2026-04-27-blackbox-devlog-design.md`. Read that first for any architectural change.

## Conventions

- **Entries** are markdown with YAML frontmatter validated by the Zod schema in `shared/schema.mjs`. Both `scripts/detect-unposted.mjs` and `site/src/content/config.ts` import it.
- **Lockfile** (`.published.json`) is owned by CI. Never hand-edit unless explicitly fixing a bad state.
- **Per-entry media** lives in a sibling folder named identically to the `.md` file (without the extension).
- **Frequent commits.** TDD where there is logic to test (the `scripts/` package). Site code is largely declarative — no tests needed.
- **No backwards-compat hacks.** This is a new repo; if a shape needs changing, change it cleanly.

## Commands

```bash
# Local site preview
cd site && npm install && npm run dev    # → http://localhost:4321

# Run script tests
cd scripts && npm install && npm test

# Detect what would post (without posting)
# Run from the repo root — the script resolves entries/ relative to CWD.
# Needs scripts/ deps installed first: (cd scripts && npm install)
node scripts/detect-unposted.mjs
```

## Hard rules

- The `tweet:` field is plain text (no markdown). Never let markdown leak into a tweet.
- Schema changes must update both `shared/schema.mjs` AND any fixtures in `scripts/tests/`. Astro's content collection imports the shared schema, so site validation tracks automatically.
- Never bypass `.published.json`. It exists to prevent accidental re-tweets.
