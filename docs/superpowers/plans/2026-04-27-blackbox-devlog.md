# BlackBox Devlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a markdown-driven devlog pipeline that auto-posts to Twitter and serves a static Astro site at `blackbox.wyltekindustries.com`, plus a `/devlog` slash-command skill for fast capture.

**Architecture:** Single source of truth (markdown entries in this repo) fans out to Twitter (via GitHub Action) and an Astro static site (via GH Pages). Idempotency is enforced by a filename-based lockfile (`.published.json`). A shared Zod schema is the contract between Node scripts and the Astro content collection.

**Tech Stack:** Node ESM (>=20), Vitest, Zod, gray-matter, twitter-api-v2, twitter-text, Astro 4.x, GitHub Actions, GitHub Pages.

---

## Repo Layout (final state)

```
blackbox-devlog/
├── README.md                                   [Task 1]
├── CLAUDE.md                                   [Task 1]
├── .gitignore                                  (already exists)
├── .published.json                             [Task 2]
├── package.json                                [Task 1 — root, no deps, just metadata]
│
├── entries/
│   ├── _template.md                            [Task 2]
│   ├── 2026-04-27-hello-world.md               [Task 2 — pre-listed in lockfile]
│   └── 2026-04-27-hello-world/
│       └── hero.txt                            [Task 2 — placeholder, no real image yet]
│
├── shared/
│   └── schema.mjs                              [Task 3]
│
├── scripts/
│   ├── package.json                            [Task 4]
│   ├── lib/
│   │   ├── parse-entry.mjs                     [Task 5]
│   │   ├── lockfile.mjs                        [Task 6]
│   │   ├── build-tweet-payload.mjs             [Task 8]
│   │   └── twitter.mjs                         [Task 9]
│   ├── tests/
│   │   ├── parse-entry.test.mjs                [Task 5]
│   │   ├── lockfile.test.mjs                   [Task 6]
│   │   ├── detect-unposted.test.mjs            [Task 7]
│   │   ├── build-tweet-payload.test.mjs        [Task 8]
│   │   └── post-to-twitter.test.mjs            [Task 9]
│   ├── detect-unposted.mjs                     [Task 7]
│   └── post-to-twitter.mjs                     [Task 10]
│
├── site/
│   ├── package.json                            [Task 11]
│   ├── astro.config.mjs                        [Task 11]
│   ├── public/
│   │   ├── CNAME                               [Task 11]
│   │   └── .nojekyll                           [Task 11]
│   └── src/
│       ├── content/config.ts                   [Task 12]
│       ├── styles/global.css                   [Task 13]
│       ├── layouts/
│       │   ├── Base.astro                      [Task 13]
│       │   └── Entry.astro                     [Task 13]
│       └── pages/
│           ├── index.astro                     [Task 14]
│           ├── [slug].astro                    [Task 14]
│           ├── feed.json.ts                    [Task 14]
│           ├── rss.xml.ts                      [Task 14]
│           └── embed.astro                     [Task 14]
│
├── .github/workflows/publish.yml               [Task 15]
│
└── docs/superpowers/
    ├── specs/2026-04-27-blackbox-devlog-design.md   (already written)
    └── plans/2026-04-27-blackbox-devlog.md          (this file)

# Plus, outside this repo:
~/.claude/skills/devlog/SKILL.md                [Task 16]
```

Each file does one thing. `shared/schema.mjs` is the only cross-cutting module; both `scripts/` and `site/` import it.

---

## Task 1: Repo skeleton

**Files:**
- Create: `/home/phill/blackbox-devlog/README.md`
- Create: `/home/phill/blackbox-devlog/CLAUDE.md`
- Create: `/home/phill/blackbox-devlog/package.json`

- [ ] **Step 1.1: Write `README.md`**

```markdown
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
```

- [ ] **Step 1.2: Write `CLAUDE.md`**

```markdown
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
cd scripts && node detect-unposted.mjs
```

## Hard rules

- The `tweet:` field is plain text (no markdown). Never let markdown leak into a tweet.
- Schema changes must update both `shared/schema.mjs` AND any fixtures in `scripts/tests/`. Astro's content collection imports the shared schema, so site validation tracks automatically.
- Never bypass `.published.json`. It exists to prevent accidental re-tweets.
```

- [ ] **Step 1.3: Write root `package.json`**

```json
{
  "name": "blackbox-devlog",
  "version": "0.0.0",
  "private": true,
  "description": "Dev log for the BlackBox CKB point-of-sale device.",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "workspaces": [
    "scripts",
    "site"
  ]
}
```

- [ ] **Step 1.4: Commit**

```bash
cd /home/phill/blackbox-devlog
git add README.md CLAUDE.md package.json
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat: repo skeleton (README, CLAUDE.md, root manifest)"
```

---

## Task 2: Bootstrap content (template, placeholder entry, lockfile)

The lockfile MUST list the placeholder entry on the very first push, otherwise the first deploy will tweet the placeholder.

**Files:**
- Create: `/home/phill/blackbox-devlog/entries/_template.md`
- Create: `/home/phill/blackbox-devlog/entries/2026-04-27-hello-world.md`
- Create: `/home/phill/blackbox-devlog/entries/2026-04-27-hello-world/hero.txt`
- Create: `/home/phill/blackbox-devlog/.published.json`

- [ ] **Step 2.1: Write `entries/_template.md`**

```markdown
---
title: ""
date: 2026-04-27
tweet: ""

# Optional fields below — delete what you don't use.

# summary: "One-line summary that appears on the site card."
# tags: ["wave-2"]
# version: "0.3.0-dev"

# media:
#   - src: hero.png
#     alt: "Description of the image."

# thread:
#   - "Reply tweet 1."
#   - "Reply tweet 2."

# do_not_post: false
---

Body in markdown here.
```

- [ ] **Step 2.2: Write `entries/2026-04-27-hello-world.md`**

```markdown
---
title: "Hello, wave 2"
date: 2026-04-27
tweet: "Wave 2 of the BlackBox prototype begins. The devlog goes live; future updates will appear here and as threads on @blackbox."
summary: "Opening entry. Wave 1 (six testing units) shipped; wave 2 starts now."
tags: ["wave-2", "meta"]
version: "0.3.0-dev"
---

Wave 1 of the BlackBox prototype shipped six testing units across versions v0.1.9 through v0.2.0.
That chapter is closed and documented in the wave-1 manuals.

This devlog opens at wave 2: the next iteration of the prototype, where we revisit the home
screen, the gallery flow, and the bring-up path.

Future entries will land here as they happen, with a short tweet and (sometimes) a thread of
follow-up notes. The full text always lives in this repo.
```

- [ ] **Step 2.3: Write `entries/2026-04-27-hello-world/hero.txt`**

```
PLACEHOLDER — replace with hero.png before authoring real entries.
This file exists only so the per-entry-folder convention is visible from the start.
```

- [ ] **Step 2.4: Write `.published.json`**

The placeholder is pre-listed so the first push doesn't tweet it. The `tweets` map is empty (no real tweet exists yet).

```json
{
  "version": 1,
  "slugs": [
    "2026-04-27-hello-world"
  ],
  "tweets": {}
}
```

- [ ] **Step 2.5: Commit**

```bash
cd /home/phill/blackbox-devlog
git add entries/ .published.json
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat: bootstrap content (template + placeholder entry pre-listed in lockfile)"
```

---

## Task 3: Shared Zod schema (with tests via Vitest in scripts/)

The schema is JS so both Node and Astro can `import` it. The tests live in `scripts/tests/` once that package exists; for now we just place the schema and verify it parses by hand.

**Files:**
- Create: `/home/phill/blackbox-devlog/shared/schema.mjs`

- [ ] **Step 3.1: Write `shared/schema.mjs`**

```javascript
import { z } from 'zod';

export const mediaItemSchema = z.object({
  src: z.string().min(1, 'media.src must be non-empty'),
  alt: z.string().min(1, 'media.alt must be non-empty'),
});

export const entryFrontmatterSchema = z.object({
  // Required
  title: z.string().min(1, 'title is required'),
  date: z.coerce.date(),
  tweet: z.string().min(1, 'tweet is required'),

  // Optional content
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  version: z.string().optional(),

  // Optional media
  media: z.array(mediaItemSchema).default([]),

  // Optional thread
  thread: z.array(z.string().min(1, 'thread items must be non-empty')).default([]),

  // Optional escape hatch
  do_not_post: z.boolean().default(false),
});

export const lockfileSchema = z.object({
  version: z.literal(1),
  slugs: z.array(z.string().min(1)),
  tweets: z.record(z.string(), z.string().url()),
});
```

- [ ] **Step 3.2: Manual verification**

Run from the repo root (will fail until Task 4 installs zod, that's expected — the file is correct as-is). For now:

```bash
cd /home/phill/blackbox-devlog
ls shared/schema.mjs
```

Expected: file exists. Tests come in Task 5.

- [ ] **Step 3.3: Commit**

```bash
cd /home/phill/blackbox-devlog
git add shared/schema.mjs
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat: shared Zod schema for entry frontmatter and lockfile"
```

---

## Task 4: scripts/ package init

**Files:**
- Create: `/home/phill/blackbox-devlog/scripts/package.json`

- [ ] **Step 4.1: Write `scripts/package.json`**

Pinned versions chosen for ESM compatibility on Node 20+.

```json
{
  "name": "blackbox-devlog-scripts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "twitter-api-v2": "^1.18.2",
    "twitter-text": "^3.1.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 4.2: Install**

```bash
cd /home/phill/blackbox-devlog/scripts
npm install
```

Expected: success. `node_modules/` created. `package-lock.json` produced.

- [ ] **Step 4.3: Verify the shared schema imports cleanly**

```bash
cd /home/phill/blackbox-devlog/scripts
node -e "import('../shared/schema.mjs').then(m => console.log(Object.keys(m)))"
```

Expected output: `[ 'mediaItemSchema', 'entryFrontmatterSchema', 'lockfileSchema' ]`

- [ ] **Step 4.4: Commit**

```bash
cd /home/phill/blackbox-devlog
git add scripts/package.json scripts/package-lock.json
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(scripts): package skeleton with deps"
```

---

## Task 5: parse-entry helper (TDD)

Reads a markdown file, extracts frontmatter, validates against the shared schema, returns `{ slug, frontmatter, body }` or throws.

**Files:**
- Create: `/home/phill/blackbox-devlog/scripts/lib/parse-entry.mjs`
- Create: `/home/phill/blackbox-devlog/scripts/tests/parse-entry.test.mjs`
- Create: `/home/phill/blackbox-devlog/scripts/tests/fixtures/entry-valid.md`
- Create: `/home/phill/blackbox-devlog/scripts/tests/fixtures/entry-missing-title.md`
- Create: `/home/phill/blackbox-devlog/scripts/tests/fixtures/entry-bad-date.md`

- [ ] **Step 5.1: Write fixture `entry-valid.md`**

```markdown
---
title: "A valid entry"
date: 2026-04-27
tweet: "A valid tweet."
summary: "A summary."
tags: ["wave-2"]
media:
  - src: hero.png
    alt: "A hero image"
thread:
  - "Reply one."
---

Body here.
```

- [ ] **Step 5.2: Write fixture `entry-missing-title.md`**

```markdown
---
date: 2026-04-27
tweet: "A tweet."
---

Body.
```

- [ ] **Step 5.3: Write fixture `entry-bad-date.md`**

```markdown
---
title: "Bad date"
date: "not-a-date"
tweet: "A tweet."
---

Body.
```

- [ ] **Step 5.4: Write the failing test `tests/parse-entry.test.mjs`**

```javascript
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseEntryFile } from '../lib/parse-entry.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(here, 'fixtures', name);

describe('parseEntryFile', () => {
  it('returns slug, frontmatter, and body for a valid entry', async () => {
    const result = await parseEntryFile(fixture('entry-valid.md'));
    expect(result.slug).toBe('entry-valid');
    expect(result.frontmatter.title).toBe('A valid entry');
    expect(result.frontmatter.tweet).toBe('A valid tweet.');
    expect(result.frontmatter.tags).toEqual(['wave-2']);
    expect(result.frontmatter.media).toHaveLength(1);
    expect(result.frontmatter.media[0]).toEqual({ src: 'hero.png', alt: 'A hero image' });
    expect(result.frontmatter.thread).toEqual(['Reply one.']);
    expect(result.frontmatter.do_not_post).toBe(false);
    expect(result.body.trim()).toBe('Body here.');
  });

  it('throws a descriptive error when title is missing', async () => {
    await expect(parseEntryFile(fixture('entry-missing-title.md')))
      .rejects.toThrow(/title/);
  });

  it('throws when date is unparseable', async () => {
    await expect(parseEntryFile(fixture('entry-bad-date.md')))
      .rejects.toThrow(/date/i);
  });
});
```

- [ ] **Step 5.5: Run test — expect failure**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- parse-entry
```

Expected: FAIL — `parseEntryFile is not a function` or "Cannot find module".

- [ ] **Step 5.6: Implement `lib/parse-entry.mjs`**

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { entryFrontmatterSchema } from '../../shared/schema.mjs';

export async function parseEntryFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const { data, content } = matter(raw);

  const result = entryFrontmatterSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid frontmatter in ${filePath}: ${issues}`);
  }

  const slug = path.basename(filePath, '.md');
  return { slug, frontmatter: result.data, body: content };
}
```

- [ ] **Step 5.7: Run tests — expect pass**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- parse-entry
```

Expected: 3 passed.

- [ ] **Step 5.8: Commit**

```bash
cd /home/phill/blackbox-devlog
git add scripts/lib/parse-entry.mjs scripts/tests/parse-entry.test.mjs scripts/tests/fixtures/
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(scripts): parse-entry helper with frontmatter validation"
```

---

## Task 6: lockfile helper (TDD)

Read/write `.published.json`. Append-only API: `markPosted(lockfile, slug, tweetUrl)` returns a new lockfile.

**Files:**
- Create: `/home/phill/blackbox-devlog/scripts/lib/lockfile.mjs`
- Create: `/home/phill/blackbox-devlog/scripts/tests/lockfile.test.mjs`

- [ ] **Step 6.1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  readLockfile,
  writeLockfile,
  isPosted,
  markPosted,
  emptyLockfile,
} from '../lib/lockfile.mjs';

async function tmpFile(content) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lockfile-test-'));
  const file = path.join(dir, '.published.json');
  await fs.writeFile(file, content, 'utf8');
  return file;
}

describe('lockfile', () => {
  it('emptyLockfile returns a v1 shape with no slugs', () => {
    const lf = emptyLockfile();
    expect(lf).toEqual({ version: 1, slugs: [], tweets: {} });
  });

  it('readLockfile parses a valid file', async () => {
    const file = await tmpFile(JSON.stringify({
      version: 1,
      slugs: ['a', 'b'],
      tweets: { a: 'https://twitter.com/x/status/1' },
    }));
    const lf = await readLockfile(file);
    expect(lf.slugs).toEqual(['a', 'b']);
    expect(lf.tweets.a).toBe('https://twitter.com/x/status/1');
  });

  it('readLockfile throws on schema violation', async () => {
    const file = await tmpFile(JSON.stringify({ version: 2, slugs: [], tweets: {} }));
    await expect(readLockfile(file)).rejects.toThrow();
  });

  it('isPosted returns true for known slugs, false otherwise', () => {
    const lf = { version: 1, slugs: ['a'], tweets: {} };
    expect(isPosted(lf, 'a')).toBe(true);
    expect(isPosted(lf, 'b')).toBe(false);
  });

  it('markPosted appends slug + url and returns a new object (immutable)', () => {
    const lf = emptyLockfile();
    const next = markPosted(lf, 'foo', 'https://twitter.com/x/status/42');
    expect(lf.slugs).toEqual([]);                    // original unchanged
    expect(next.slugs).toEqual(['foo']);
    expect(next.tweets.foo).toBe('https://twitter.com/x/status/42');
  });

  it('markPosted is idempotent — calling twice does not duplicate', () => {
    let lf = emptyLockfile();
    lf = markPosted(lf, 'foo', 'https://twitter.com/x/status/1');
    lf = markPosted(lf, 'foo', 'https://twitter.com/x/status/2');
    expect(lf.slugs).toEqual(['foo']);
    expect(lf.tweets.foo).toBe('https://twitter.com/x/status/2');
  });

  it('writeLockfile writes JSON with sorted slugs and stable formatting', async () => {
    const file = await tmpFile('');
    const lf = { version: 1, slugs: ['c', 'a', 'b'], tweets: { c: 'https://x.test/c' } };
    await writeLockfile(file, lf);
    const written = await fs.readFile(file, 'utf8');
    expect(written.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(written);
    expect(parsed.slugs).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 6.2: Run test — expect failure**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- lockfile
```

Expected: FAIL — module missing.

- [ ] **Step 6.3: Implement `lib/lockfile.mjs`**

```javascript
import fs from 'node:fs/promises';
import { lockfileSchema } from '../../shared/schema.mjs';

export function emptyLockfile() {
  return { version: 1, slugs: [], tweets: {} };
}

export async function readLockfile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  const result = lockfileSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid lockfile at ${filePath}: ${issues}`);
  }
  return result.data;
}

export async function writeLockfile(filePath, lockfile) {
  const sorted = {
    ...lockfile,
    slugs: [...lockfile.slugs].sort(),
  };
  const json = JSON.stringify(sorted, null, 2) + '\n';
  await fs.writeFile(filePath, json, 'utf8');
}

export function isPosted(lockfile, slug) {
  return lockfile.slugs.includes(slug);
}

export function markPosted(lockfile, slug, tweetUrl) {
  const slugs = lockfile.slugs.includes(slug)
    ? lockfile.slugs
    : [...lockfile.slugs, slug];
  return {
    ...lockfile,
    slugs,
    tweets: { ...lockfile.tweets, [slug]: tweetUrl },
  };
}
```

- [ ] **Step 6.4: Run tests — expect pass**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- lockfile
```

Expected: all tests pass.

- [ ] **Step 6.5: Commit**

```bash
cd /home/phill/blackbox-devlog
git add scripts/lib/lockfile.mjs scripts/tests/lockfile.test.mjs
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(scripts): lockfile read/write/markPosted helpers"
```

---

## Task 7: detect-unposted script (TDD)

Walks `entries/*.md`, filters out lockfile slugs and `do_not_post: true`, validates frontmatter, outputs to `$GITHUB_OUTPUT` (or stdout when run locally).

**Files:**
- Create: `/home/phill/blackbox-devlog/scripts/detect-unposted.mjs`
- Create: `/home/phill/blackbox-devlog/scripts/tests/detect-unposted.test.mjs`

- [ ] **Step 7.1: Write the failing test**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { detectUnposted } from '../detect-unposted.mjs';

let workDir;

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'detect-test-'));
  await fs.mkdir(path.join(workDir, 'entries'));
});

afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

async function writeEntry(slug, frontmatter, body = 'Body.') {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}: "${v}"`;
      if (Array.isArray(v)) return `${k}: ${JSON.stringify(v)}`;
      return `${k}: ${v}`;
    })
    .join('\n');
  const content = `---\n${fm}\n---\n\n${body}\n`;
  await fs.writeFile(path.join(workDir, 'entries', `${slug}.md`), content);
}

async function writeLockfile(lf) {
  await fs.writeFile(
    path.join(workDir, '.published.json'),
    JSON.stringify(lf, null, 2),
  );
}

describe('detectUnposted', () => {
  it('returns slugs not yet in the lockfile', async () => {
    await writeEntry('a', { title: 'A', date: '2026-04-27', tweet: 'tweet a' });
    await writeEntry('b', { title: 'B', date: '2026-04-27', tweet: 'tweet b' });
    await writeLockfile({ version: 1, slugs: ['a'], tweets: {} });

    const result = await detectUnposted({ repoRoot: workDir });
    expect(result.unposted).toEqual(['b']);
    expect(result.count).toBe(1);
  });

  it('skips entries with do_not_post: true even if not in lockfile', async () => {
    await writeEntry('a', { title: 'A', date: '2026-04-27', tweet: 'tweet a', do_not_post: true });
    await writeLockfile({ version: 1, slugs: [], tweets: {} });

    const result = await detectUnposted({ repoRoot: workDir });
    expect(result.unposted).toEqual([]);
  });

  it('throws on entries with invalid frontmatter (missing tweet)', async () => {
    await writeEntry('bad', { title: 'Bad', date: '2026-04-27' });
    await writeLockfile({ version: 1, slugs: [], tweets: {} });

    await expect(detectUnposted({ repoRoot: workDir })).rejects.toThrow(/tweet/);
  });

  it('returns empty when nothing new', async () => {
    await writeEntry('a', { title: 'A', date: '2026-04-27', tweet: 'tweet a' });
    await writeLockfile({ version: 1, slugs: ['a'], tweets: {} });

    const result = await detectUnposted({ repoRoot: workDir });
    expect(result.unposted).toEqual([]);
    expect(result.count).toBe(0);
  });
});
```

- [ ] **Step 7.2: Run test — expect failure**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- detect-unposted
```

Expected: FAIL — module missing.

- [ ] **Step 7.3: Implement `detect-unposted.mjs`**

```javascript
#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEntryFile } from './lib/parse-entry.mjs';
import { readLockfile, isPosted, emptyLockfile } from './lib/lockfile.mjs';

export async function detectUnposted({ repoRoot }) {
  const entriesDir = path.join(repoRoot, 'entries');
  const lockfilePath = path.join(repoRoot, '.published.json');

  let lockfile;
  try {
    lockfile = await readLockfile(lockfilePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      lockfile = emptyLockfile();
    } else {
      throw err;
    }
  }

  const dirEntries = await fs.readdir(entriesDir);
  const mdFiles = dirEntries
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort();

  const unposted = [];
  for (const file of mdFiles) {
    const filePath = path.join(entriesDir, file);
    const { slug, frontmatter } = await parseEntryFile(filePath);
    if (frontmatter.do_not_post) continue;
    if (isPosted(lockfile, slug)) continue;
    unposted.push(slug);
  }

  return { unposted, count: unposted.length };
}

// CLI entry point — runs when invoked directly (not when imported by tests)
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const repoRoot = process.cwd();
  const result = await detectUnposted({ repoRoot });

  // GitHub Actions outputs
  const ghOutput = process.env.GITHUB_OUTPUT;
  const payload = `unposted=${JSON.stringify(result.unposted)}\ncount=${result.count}\n`;
  if (ghOutput) {
    await fs.appendFile(ghOutput, payload);
  } else {
    process.stdout.write(payload);
  }
  console.error(`detected ${result.count} unposted entries: ${JSON.stringify(result.unposted)}`);
}
```

- [ ] **Step 7.4: Run tests — expect pass**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- detect-unposted
```

Expected: all tests pass.

- [ ] **Step 7.5: Smoke-test on the real repo**

```bash
cd /home/phill/blackbox-devlog
node scripts/detect-unposted.mjs
```

Expected stdout: `unposted=[]\ncount=0\n` and stderr: `detected 0 unposted entries: []`. The placeholder is in the lockfile, so nothing should be unposted.

- [ ] **Step 7.6: Commit**

```bash
cd /home/phill/blackbox-devlog
git add scripts/detect-unposted.mjs scripts/tests/detect-unposted.test.mjs
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(scripts): detect-unposted with frontmatter validation"
```

---

## Task 8: Tweet payload builder (TDD)

Given a parsed entry, produce an array of tweet payloads (head + thread). Validates each tweet's character count using `twitter-text`. Resolves media `src` values to absolute file paths.

**Files:**
- Create: `/home/phill/blackbox-devlog/scripts/lib/build-tweet-payload.mjs`
- Create: `/home/phill/blackbox-devlog/scripts/tests/build-tweet-payload.test.mjs`

- [ ] **Step 8.1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { buildTweetPayloads } from '../lib/build-tweet-payload.mjs';

const repoRoot = '/repo';

describe('buildTweetPayloads', () => {
  it('returns a single payload for an entry without thread or media', () => {
    const entry = {
      slug: 'foo',
      frontmatter: {
        title: 'Foo',
        date: new Date('2026-04-27'),
        tweet: 'Hello world.',
        tags: [], media: [], thread: [], do_not_post: false,
      },
    };
    const payloads = buildTweetPayloads(entry, { repoRoot });
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual({ text: 'Hello world.', mediaPaths: [] });
  });

  it('resolves media src to absolute file paths under entries/<slug>/', () => {
    const entry = {
      slug: 'foo',
      frontmatter: {
        title: 'Foo',
        date: new Date('2026-04-27'),
        tweet: 'With image.',
        tags: [],
        media: [{ src: 'hero.png', alt: 'hero' }],
        thread: [],
        do_not_post: false,
      },
    };
    const payloads = buildTweetPayloads(entry, { repoRoot });
    expect(payloads[0].mediaPaths).toEqual([path.join(repoRoot, 'entries', 'foo', 'hero.png')]);
  });

  it('passes absolute http(s) media URLs through unchanged', () => {
    const entry = {
      slug: 'foo',
      frontmatter: {
        title: 'Foo',
        date: new Date('2026-04-27'),
        tweet: 'With remote image.',
        tags: [],
        media: [{ src: 'https://cdn.example.com/x.png', alt: 'x' }],
        thread: [],
        do_not_post: false,
      },
    };
    const payloads = buildTweetPayloads(entry, { repoRoot });
    expect(payloads[0].mediaPaths).toEqual(['https://cdn.example.com/x.png']);
  });

  it('returns head + thread payloads in order, with media only on the head', () => {
    const entry = {
      slug: 'foo',
      frontmatter: {
        title: 'Foo',
        date: new Date('2026-04-27'),
        tweet: 'Head.',
        tags: [],
        media: [{ src: 'a.png', alt: 'a' }],
        thread: ['Reply 1.', 'Reply 2.'],
        do_not_post: false,
      },
    };
    const payloads = buildTweetPayloads(entry, { repoRoot });
    expect(payloads).toHaveLength(3);
    expect(payloads[0].text).toBe('Head.');
    expect(payloads[0].mediaPaths).toHaveLength(1);
    expect(payloads[1]).toEqual({ text: 'Reply 1.', mediaPaths: [] });
    expect(payloads[2]).toEqual({ text: 'Reply 2.', mediaPaths: [] });
  });

  it('throws if the head tweet exceeds 280 weighted characters', () => {
    const entry = {
      slug: 'foo',
      frontmatter: {
        title: 'Foo',
        date: new Date('2026-04-27'),
        tweet: 'a'.repeat(281),
        tags: [], media: [], thread: [], do_not_post: false,
      },
    };
    expect(() => buildTweetPayloads(entry, { repoRoot })).toThrow(/length/i);
  });

  it('throws if any thread tweet exceeds 280 weighted characters', () => {
    const entry = {
      slug: 'foo',
      frontmatter: {
        title: 'Foo',
        date: new Date('2026-04-27'),
        tweet: 'ok',
        tags: [], media: [],
        thread: ['ok', 'b'.repeat(281)],
        do_not_post: false,
      },
    };
    expect(() => buildTweetPayloads(entry, { repoRoot })).toThrow(/thread\[1\]/);
  });

  it('throws if more than 4 media items on the head tweet (Twitter limit)', () => {
    const entry = {
      slug: 'foo',
      frontmatter: {
        title: 'Foo',
        date: new Date('2026-04-27'),
        tweet: 'too many',
        tags: [],
        media: [
          { src: '1.png', alt: '1' },
          { src: '2.png', alt: '2' },
          { src: '3.png', alt: '3' },
          { src: '4.png', alt: '4' },
          { src: '5.png', alt: '5' },
        ],
        thread: [], do_not_post: false,
      },
    };
    expect(() => buildTweetPayloads(entry, { repoRoot })).toThrow(/media/i);
  });
});
```

- [ ] **Step 8.2: Run test — expect failure**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- build-tweet-payload
```

Expected: FAIL — module missing.

- [ ] **Step 8.3: Implement `lib/build-tweet-payload.mjs`**

```javascript
import path from 'node:path';
import twitterText from 'twitter-text';

const MAX_LENGTH = 280;
const MAX_MEDIA = 4;

function validateLength(text, where) {
  const parsed = twitterText.parseTweet(text);
  if (!parsed.valid) {
    throw new Error(
      `${where}: tweet length ${parsed.weightedLength} exceeds ${MAX_LENGTH} weighted characters`,
    );
  }
}

function resolveMediaPath(repoRoot, slug, src) {
  if (/^https?:\/\//i.test(src)) return src;
  return path.join(repoRoot, 'entries', slug, src);
}

export function buildTweetPayloads(entry, { repoRoot }) {
  const { slug, frontmatter } = entry;
  const { tweet, thread, media } = frontmatter;

  if (media.length > MAX_MEDIA) {
    throw new Error(
      `${slug}: ${media.length} media items exceeds Twitter's limit of ${MAX_MEDIA} per tweet`,
    );
  }

  validateLength(tweet, `${slug}: head tweet`);
  thread.forEach((t, i) => validateLength(t, `${slug}: thread[${i}]`));

  const headPayload = {
    text: tweet,
    mediaPaths: media.map((m) => resolveMediaPath(repoRoot, slug, m.src)),
  };

  const threadPayloads = thread.map((text) => ({ text, mediaPaths: [] }));

  return [headPayload, ...threadPayloads];
}
```

- [ ] **Step 8.4: Run tests — expect pass**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- build-tweet-payload
```

Expected: all 7 tests pass.

- [ ] **Step 8.5: Commit**

```bash
cd /home/phill/blackbox-devlog
git add scripts/lib/build-tweet-payload.mjs scripts/tests/build-tweet-payload.test.mjs
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(scripts): tweet payload builder with twitter-text length validation"
```

---

## Task 9: Twitter wrapper (lib/twitter.mjs)

Thin wrapper around `twitter-api-v2` exposing `uploadMedia`, `postTweet`, `postThread`. Tests mock the underlying client at the wrapper boundary.

**Files:**
- Create: `/home/phill/blackbox-devlog/scripts/lib/twitter.mjs`
- Create: `/home/phill/blackbox-devlog/scripts/tests/twitter.test.mjs`

- [ ] **Step 9.1: Write the failing test**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postThread } from '../lib/twitter.mjs';

function fakeClient() {
  const tweets = [];
  let nextId = 1000;
  return {
    tweets,
    v1: {
      uploadMedia: vi.fn(async (input, opts) => `mid-${input.toString().slice(0, 8)}`),
    },
    v2: {
      tweet: vi.fn(async (payload) => {
        const id = String(++nextId);
        tweets.push({ id, payload });
        return { data: { id, text: payload.text } };
      }),
    },
  };
}

describe('postThread', () => {
  it('posts a single tweet with no media', async () => {
    const client = fakeClient();
    const result = await postThread(client, [{ text: 'hello', mediaPaths: [] }], {
      readMedia: vi.fn(),
    });
    expect(client.v2.tweet).toHaveBeenCalledTimes(1);
    expect(client.v2.tweet).toHaveBeenCalledWith({ text: 'hello' });
    expect(result.headTweetId).toBe('1001');
  });

  it('uploads media before posting and attaches media_ids', async () => {
    const client = fakeClient();
    const readMedia = vi.fn(async (p) => Buffer.from(`bytes-of-${p}`));
    await postThread(
      client,
      [{ text: 'with image', mediaPaths: ['/abs/hero.png'] }],
      { readMedia },
    );
    expect(client.v1.uploadMedia).toHaveBeenCalledTimes(1);
    expect(client.v1.uploadMedia).toHaveBeenCalledWith(
      Buffer.from('bytes-of-/abs/hero.png'),
      { mimeType: 'image/png' },
    );
    const call = client.v2.tweet.mock.calls[0][0];
    expect(call.media.media_ids).toHaveLength(1);
  });

  it('chains thread replies via reply.in_reply_to_tweet_id', async () => {
    const client = fakeClient();
    await postThread(
      client,
      [
        { text: 'head', mediaPaths: [] },
        { text: 'reply 1', mediaPaths: [] },
        { text: 'reply 2', mediaPaths: [] },
      ],
      { readMedia: vi.fn() },
    );
    expect(client.v2.tweet).toHaveBeenCalledTimes(3);
    const calls = client.v2.tweet.mock.calls.map((c) => c[0]);
    expect(calls[0].reply).toBeUndefined();
    expect(calls[1].reply).toEqual({ in_reply_to_tweet_id: '1001' });
    expect(calls[2].reply).toEqual({ in_reply_to_tweet_id: '1002' });
  });

  it('returns headTweetId and tweetUrl built from a handle', async () => {
    const client = fakeClient();
    const result = await postThread(
      client,
      [{ text: 'hi', mediaPaths: [] }],
      { readMedia: vi.fn(), handle: 'blackbox' },
    );
    expect(result.headTweetId).toBe('1001');
    expect(result.tweetUrl).toBe('https://twitter.com/blackbox/status/1001');
  });
});
```

- [ ] **Step 9.2: Run test — expect failure**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- twitter
```

Expected: FAIL — module missing.

- [ ] **Step 9.3: Implement `lib/twitter.mjs`**

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import { TwitterApi } from 'twitter-api-v2';

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
};

export function makeTwitterClient(creds) {
  return new TwitterApi({
    appKey: creds.apiKey,
    appSecret: creds.apiSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
}

export async function defaultReadMedia(filePath) {
  if (/^https?:\/\//i.test(filePath)) {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`fetch ${filePath} failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(filePath);
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) throw new Error(`Unsupported media extension: ${ext} (${filePath})`);
  return mime;
}

async function uploadAll(client, mediaPaths, readMedia) {
  const ids = [];
  for (const p of mediaPaths) {
    const buf = await readMedia(p);
    const mid = await client.v1.uploadMedia(buf, { mimeType: mimeFor(p) });
    ids.push(mid);
  }
  return ids;
}

export async function postThread(client, payloads, { readMedia = defaultReadMedia, handle } = {}) {
  let headTweetId = null;
  let prevId = null;

  for (const payload of payloads) {
    const tweetPayload = { text: payload.text };

    if (payload.mediaPaths.length > 0) {
      const ids = await uploadAll(client, payload.mediaPaths, readMedia);
      tweetPayload.media = { media_ids: ids };
    }

    if (prevId) {
      tweetPayload.reply = { in_reply_to_tweet_id: prevId };
    }

    const res = await client.v2.tweet(tweetPayload);
    const id = res.data.id;
    if (!headTweetId) headTweetId = id;
    prevId = id;
  }

  const tweetUrl = handle
    ? `https://twitter.com/${handle}/status/${headTweetId}`
    : `https://twitter.com/i/status/${headTweetId}`;

  return { headTweetId, tweetUrl };
}
```

- [ ] **Step 9.4: Run tests — expect pass**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- twitter
```

Expected: all 4 tests pass.

- [ ] **Step 9.5: Commit**

```bash
cd /home/phill/blackbox-devlog
git add scripts/lib/twitter.mjs scripts/tests/twitter.test.mjs
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(scripts): twitter wrapper (uploadMedia, postThread)"
```

---

## Task 10: post-to-twitter orchestrator (TDD)

Reads `UNPOSTED` env (a JSON array set by the `detect` job), parses each entry, builds payloads, posts via the wrapper, updates the lockfile. Honours `DRY_RUN=true` (logs but doesn't post).

**Files:**
- Create: `/home/phill/blackbox-devlog/scripts/post-to-twitter.mjs`
- Create: `/home/phill/blackbox-devlog/scripts/tests/post-to-twitter.test.mjs`

- [ ] **Step 10.1: Write the failing test**

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runPostToTwitter } from '../post-to-twitter.mjs';

let workDir;

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'post-test-'));
  await fs.mkdir(path.join(workDir, 'entries'));
  await fs.writeFile(
    path.join(workDir, '.published.json'),
    JSON.stringify({ version: 1, slugs: [], tweets: {} }, null, 2),
  );
});

afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

async function writeEntry(slug, fm) {
  const yaml = Object.entries(fm)
    .map(([k, v]) => (typeof v === 'string' ? `${k}: "${v}"` : `${k}: ${JSON.stringify(v)}`))
    .join('\n');
  await fs.writeFile(
    path.join(workDir, 'entries', `${slug}.md`),
    `---\n${yaml}\n---\n\nbody.\n`,
  );
}

describe('runPostToTwitter', () => {
  it('posts each unposted slug and writes them to the lockfile', async () => {
    await writeEntry('a', { title: 'A', date: '2026-04-27', tweet: 'tweet a' });
    await writeEntry('b', { title: 'B', date: '2026-04-27', tweet: 'tweet b' });

    const fakePostThread = vi.fn(async (_client, payloads) => ({
      headTweetId: payloads[0].text.includes('a') ? '111' : '222',
      tweetUrl: payloads[0].text.includes('a')
        ? 'https://twitter.com/blackbox/status/111'
        : 'https://twitter.com/blackbox/status/222',
    }));

    await runPostToTwitter({
      repoRoot: workDir,
      unposted: ['a', 'b'],
      dryRun: false,
      handle: 'blackbox',
      twitterClient: {},
      postThread: fakePostThread,
    });

    expect(fakePostThread).toHaveBeenCalledTimes(2);
    const lf = JSON.parse(await fs.readFile(path.join(workDir, '.published.json'), 'utf8'));
    expect(lf.slugs).toEqual(['a', 'b']);
    expect(lf.tweets.a).toBe('https://twitter.com/blackbox/status/111');
    expect(lf.tweets.b).toBe('https://twitter.com/blackbox/status/222');
  });

  it('dryRun=true does NOT call postThread and does NOT write the lockfile', async () => {
    await writeEntry('a', { title: 'A', date: '2026-04-27', tweet: 'tweet a' });
    const fakePostThread = vi.fn();

    await runPostToTwitter({
      repoRoot: workDir,
      unposted: ['a'],
      dryRun: true,
      handle: 'blackbox',
      twitterClient: {},
      postThread: fakePostThread,
    });

    expect(fakePostThread).not.toHaveBeenCalled();
    const lf = JSON.parse(await fs.readFile(path.join(workDir, '.published.json'), 'utf8'));
    expect(lf.slugs).toEqual([]);
  });

  it('stops on the first failure and does NOT record the failed slug', async () => {
    await writeEntry('a', { title: 'A', date: '2026-04-27', tweet: 'tweet a' });
    await writeEntry('b', { title: 'B', date: '2026-04-27', tweet: 'tweet b' });

    let calls = 0;
    const fakePostThread = vi.fn(async () => {
      calls += 1;
      if (calls === 2) throw new Error('boom');
      return { headTweetId: '1', tweetUrl: 'https://twitter.com/x/status/1' };
    });

    await expect(runPostToTwitter({
      repoRoot: workDir,
      unposted: ['a', 'b'],
      dryRun: false,
      handle: 'blackbox',
      twitterClient: {},
      postThread: fakePostThread,
    })).rejects.toThrow(/boom/);

    const lf = JSON.parse(await fs.readFile(path.join(workDir, '.published.json'), 'utf8'));
    // 'a' was posted before 'b' failed, so 'a' should be recorded
    expect(lf.slugs).toEqual(['a']);
    expect(lf.slugs).not.toContain('b');
  });
});
```

- [ ] **Step 10.2: Run test — expect failure**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test -- post-to-twitter
```

Expected: FAIL — module missing.

- [ ] **Step 10.3: Implement `post-to-twitter.mjs`**

```javascript
#!/usr/bin/env node
import path from 'node:path';
import { parseEntryFile } from './lib/parse-entry.mjs';
import { readLockfile, writeLockfile, markPosted } from './lib/lockfile.mjs';
import { buildTweetPayloads } from './lib/build-tweet-payload.mjs';
import { makeTwitterClient, postThread as defaultPostThread } from './lib/twitter.mjs';

export async function runPostToTwitter({
  repoRoot,
  unposted,
  dryRun,
  handle,
  twitterClient,
  postThread = defaultPostThread,
}) {
  const lockfilePath = path.join(repoRoot, '.published.json');
  let lockfile = await readLockfile(lockfilePath);

  for (const slug of unposted) {
    const filePath = path.join(repoRoot, 'entries', `${slug}.md`);
    const entry = await parseEntryFile(filePath);
    const payloads = buildTweetPayloads(entry, { repoRoot });

    console.error(`[${slug}] preparing ${payloads.length} tweet(s)`);
    for (const [i, p] of payloads.entries()) {
      console.error(`  ${i === 0 ? 'head' : `reply${i}`}: ${p.text} ${p.mediaPaths.length ? `(+${p.mediaPaths.length} media)` : ''}`);
    }

    if (dryRun) {
      console.error(`[${slug}] DRY_RUN — not posting`);
      continue;
    }

    const result = await postThread(twitterClient, payloads, { handle });
    console.error(`[${slug}] posted: ${result.tweetUrl}`);

    lockfile = markPosted(lockfile, slug, result.tweetUrl);
    await writeLockfile(lockfilePath, lockfile);
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const repoRoot = process.cwd();
  const unposted = JSON.parse(process.env.UNPOSTED || '[]');
  const dryRun = process.env.DRY_RUN === 'true';
  const handle = process.env.TWITTER_HANDLE || 'blackbox';

  if (unposted.length === 0) {
    console.error('no unposted entries; nothing to do');
    process.exit(0);
  }

  const required = ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET'];
  for (const k of required) {
    if (!dryRun && !process.env[k]) {
      console.error(`missing required env: ${k}`);
      process.exit(1);
    }
  }

  const twitterClient = dryRun
    ? {}
    : makeTwitterClient({
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
      });

  await runPostToTwitter({ repoRoot, unposted, dryRun, handle, twitterClient });
}
```

- [ ] **Step 10.4: Run tests — expect pass**

```bash
cd /home/phill/blackbox-devlog/scripts
npm test
```

Expected: all tests across all files pass.

- [ ] **Step 10.5: Commit**

```bash
cd /home/phill/blackbox-devlog
git add scripts/post-to-twitter.mjs scripts/tests/post-to-twitter.test.mjs
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(scripts): post-to-twitter orchestrator with dry-run + lockfile updates"
```

---

## Task 11: Astro project init

**Files:**
- Create: `/home/phill/blackbox-devlog/site/package.json`
- Create: `/home/phill/blackbox-devlog/site/astro.config.mjs`
- Create: `/home/phill/blackbox-devlog/site/public/CNAME`
- Create: `/home/phill/blackbox-devlog/site/public/.nojekyll`
- Create: `/home/phill/blackbox-devlog/site/tsconfig.json`

- [ ] **Step 11.1: Write `site/package.json`**

```json
{
  "name": "blackbox-devlog-site",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "@astrojs/rss": "^4.0.7",
    "astro": "^4.16.0",
    "zod": "^3.23.8"
  }
}
```

- [ ] **Step 11.2: Write `site/astro.config.mjs`**

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blackbox.wyltekindustries.com',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
});
```

- [ ] **Step 11.3: Write `site/public/CNAME`**

```
blackbox.wyltekindustries.com
```

- [ ] **Step 11.4: Write `site/public/.nojekyll`** (empty file — disables Jekyll on GH Pages so files starting with `_` are served)

```
```

- [ ] **Step 11.5: Write `site/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": ["src/**/*", ".astro/types.d.ts"],
  "exclude": ["dist"]
}
```

- [ ] **Step 11.6: Install**

```bash
cd /home/phill/blackbox-devlog/site
npm install
```

Expected: success.

- [ ] **Step 11.7: Commit**

```bash
cd /home/phill/blackbox-devlog
git add site/package.json site/package-lock.json site/astro.config.mjs site/public/ site/tsconfig.json
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(site): astro project init with CNAME"
```

---

## Task 12: Astro content collection (imports shared schema)

**Files:**
- Create: `/home/phill/blackbox-devlog/site/src/content/config.ts`

- [ ] **Step 12.1: Write `site/src/content/config.ts`**

We re-import `entryFrontmatterSchema` from the shared module so the same Zod schema validates entries at site-build time as in CI. Astro requires entries to live under `src/content/<collection>/`, so we use a glob loader pointing back to `entries/` at the repo root.

```typescript
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { entryFrontmatterSchema } from '../../../shared/schema.mjs';

const entries = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: '../entries',
  }),
  schema: entryFrontmatterSchema,
});

export const collections = { entries };
```

- [ ] **Step 12.2: Run `astro check` to confirm the schema and content load**

```bash
cd /home/phill/blackbox-devlog/site
npm run check
```

Expected: 0 errors. (May require running `npm run build` once first to generate `.astro/types.d.ts`.)

- [ ] **Step 12.3: Commit**

```bash
cd /home/phill/blackbox-devlog
git add site/src/content/
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(site): content collection backed by shared zod schema"
```

---

## Task 13: Layouts and global styles

**Files:**
- Create: `/home/phill/blackbox-devlog/site/src/styles/global.css`
- Create: `/home/phill/blackbox-devlog/site/src/layouts/Base.astro`
- Create: `/home/phill/blackbox-devlog/site/src/layouts/Entry.astro`

- [ ] **Step 13.1: Write `site/src/styles/global.css`**

```css
:root {
  --bg: #0d0d0f;
  --fg: #e6e6e6;
  --fg-dim: #9a9a9a;
  --accent: #ff8c42;
  --rule: #2a2a2e;
  --max: 64ch;
  --gap: 8px;
  --radius: 4px;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  line-height: 1.55;
  font-size: 16px;
}

main {
  max-width: var(--max);
  margin: 0 auto;
  padding: calc(var(--gap) * 6) calc(var(--gap) * 3);
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

h1, h2, h3 {
  font-family: var(--font-mono);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

h1 { font-size: 1.75rem; margin: 0 0 calc(var(--gap) * 2); }
h2 { font-size: 1.25rem; margin: calc(var(--gap) * 4) 0 var(--gap); }

.meta {
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 0.875rem;
}

.tag {
  display: inline-block;
  padding: 2px 6px;
  margin-right: 4px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--fg-dim);
}

.entry-card {
  border-top: 1px solid var(--rule);
  padding: calc(var(--gap) * 3) 0;
}
.entry-card:last-child { border-bottom: 1px solid var(--rule); }

.entry-card img { max-width: 100%; height: auto; border-radius: var(--radius); }

article img { max-width: 100%; height: auto; border-radius: var(--radius); }

footer {
  margin-top: calc(var(--gap) * 8);
  padding-top: calc(var(--gap) * 2);
  border-top: 1px solid var(--rule);
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
```

- [ ] **Step 13.2: Write `site/src/layouts/Base.astro`**

```astro
---
import '../styles/global.css';
interface Props { title: string; description?: string; }
const { title, description = 'Dev log for the BlackBox CKB point-of-sale device.' } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="alternate" type="application/rss+xml" title="BlackBox devlog RSS" href="/rss.xml" />
    <link rel="alternate" type="application/feed+json" title="BlackBox devlog feed" href="/feed.json" />
  </head>
  <body>
    <main>
      <slot />
      <footer>
        <a href="/">blackbox devlog</a> · <a href="/rss.xml">rss</a> · <a href="/feed.json">json</a> · <a href="https://github.com/toastmanau/blackbox-devlog">source</a>
      </footer>
    </main>
  </body>
</html>
```

- [ ] **Step 13.3: Write `site/src/layouts/Entry.astro`**

```astro
---
import Base from './Base.astro';
interface Props {
  title: string;
  date: Date;
  summary?: string;
  tags?: string[];
  tweetUrl?: string;
}
const { title, date, summary, tags = [], tweetUrl } = Astro.props;
const dateStr = date.toISOString().slice(0, 10);
---
<Base title={`${title} — blackbox devlog`} description={summary}>
  <article>
    <h1>{title}</h1>
    <p class="meta">
      <time datetime={date.toISOString()}>{dateStr}</time>
      {tags.length > 0 && <span> · {tags.map((t) => <span class="tag">{t}</span>)}</span>}
      {tweetUrl && <span> · <a href={tweetUrl}>tweet</a></span>}
    </p>
    <slot />
  </article>
</Base>
```

- [ ] **Step 13.4: Commit**

```bash
cd /home/phill/blackbox-devlog
git add site/src/layouts/ site/src/styles/
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(site): base + entry layouts and global styles"
```

---

## Task 14: All pages (index, [slug], embed, feed.json, rss.xml)

We do these together because they share patterns and are short.

**Files:**
- Create: `/home/phill/blackbox-devlog/site/src/pages/index.astro`
- Create: `/home/phill/blackbox-devlog/site/src/pages/[slug].astro`
- Create: `/home/phill/blackbox-devlog/site/src/pages/embed.astro`
- Create: `/home/phill/blackbox-devlog/site/src/pages/feed.json.ts`
- Create: `/home/phill/blackbox-devlog/site/src/pages/rss.xml.ts`
- Create: `/home/phill/blackbox-devlog/site/src/lib/lockfile.ts`

- [ ] **Step 14.1: Write `site/src/lib/lockfile.ts`** — small typed read of the lockfile so pages can show the tweet URL per entry

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';

interface Lockfile {
  version: 1;
  slugs: string[];
  tweets: Record<string, string>;
}

let cache: Lockfile | null = null;

export async function getLockfile(): Promise<Lockfile> {
  if (cache) return cache;
  const file = path.resolve(process.cwd(), '..', '.published.json');
  const raw = await fs.readFile(file, 'utf8');
  cache = JSON.parse(raw) as Lockfile;
  return cache;
}

export async function tweetUrlFor(slug: string): Promise<string | undefined> {
  const lf = await getLockfile();
  return lf.tweets[slug];
}
```

- [ ] **Step 14.2: Write `site/src/pages/index.astro`** — paginated list of entries

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';

const all = await getCollection('entries');
const entries = all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---
<Base title="blackbox devlog">
  <h1>blackbox devlog</h1>
  <p class="meta">Dev log for the BlackBox CKB point-of-sale device. Wave 2.</p>
  {entries.map((e) => (
    <div class="entry-card">
      <h2><a href={`/${e.id.replace(/\.md$/, '')}`}>{e.data.title}</a></h2>
      <p class="meta">
        <time datetime={e.data.date.toISOString()}>{e.data.date.toISOString().slice(0, 10)}</time>
        {e.data.tags.length > 0 && <span> · {e.data.tags.map((t) => <span class="tag">{t}</span>)}</span>}
      </p>
      {e.data.summary && <p>{e.data.summary}</p>}
    </div>
  ))}
</Base>
```

- [ ] **Step 14.3: Write `site/src/pages/[slug].astro`** — full entry detail

```astro
---
import { getCollection, render } from 'astro:content';
import Entry from '../layouts/Entry.astro';
import { tweetUrlFor } from '../lib/lockfile.ts';

export async function getStaticPaths() {
  const all = await getCollection('entries');
  return all.map((entry) => ({
    params: { slug: entry.id.replace(/\.md$/, '') },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const tweetUrl = await tweetUrlFor(entry.id.replace(/\.md$/, ''));
---
<Entry
  title={entry.data.title}
  date={entry.data.date}
  summary={entry.data.summary}
  tags={entry.data.tags}
  tweetUrl={tweetUrl}
>
  <Content />
</Entry>
```

- [ ] **Step 14.4: Write `site/src/pages/embed.astro`** — iframe-friendly compact list

```astro
---
import { getCollection } from 'astro:content';

const all = await getCollection('entries');
const entries = all
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .slice(0, 5);
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>blackbox devlog (embed)</title>
    <style>
      :root { color-scheme: dark light; }
      body {
        margin: 0;
        padding: 12px 16px;
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 14px;
        line-height: 1.5;
        background: transparent;
        color: inherit;
      }
      h2 { font-size: 14px; margin: 0 0 4px; font-weight: 600; }
      .item { padding: 8px 0; border-bottom: 1px solid currentColor; opacity: 0.95; }
      .item:last-child { border-bottom: 0; }
      .meta { font-size: 12px; opacity: 0.6; }
      a { color: inherit; }
    </style>
  </head>
  <body>
    {entries.map((e) => (
      <div class="item">
        <h2><a href={`/${e.id.replace(/\.md$/, '')}`} target="_top">{e.data.title}</a></h2>
        <div class="meta">{e.data.date.toISOString().slice(0, 10)}</div>
      </div>
    ))}
  </body>
</html>
```

- [ ] **Step 14.5: Write `site/src/pages/feed.json.ts`** — JSON Feed 1.1

```typescript
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const all = await getCollection('entries');
  const entries = all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const baseUrl = site?.toString().replace(/\/$/, '') || '';

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'blackbox devlog',
    home_page_url: baseUrl,
    feed_url: `${baseUrl}/feed.json`,
    description: 'Dev log for the BlackBox CKB point-of-sale device.',
    items: entries.map((e) => {
      const slug = e.id.replace(/\.md$/, '');
      return {
        id: `${baseUrl}/${slug}`,
        url: `${baseUrl}/${slug}`,
        title: e.data.title,
        content_text: e.data.summary || e.data.tweet,
        date_published: e.data.date.toISOString(),
        tags: e.data.tags,
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
};
```

- [ ] **Step 14.6: Write `site/src/pages/rss.xml.ts`** — RSS 2.0 via `@astrojs/rss`

```typescript
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const all = await getCollection('entries');
  return rss({
    title: 'blackbox devlog',
    description: 'Dev log for the BlackBox CKB point-of-sale device.',
    site: site!,
    items: all
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((e) => ({
        title: e.data.title,
        pubDate: e.data.date,
        description: e.data.summary || e.data.tweet,
        link: `/${e.id.replace(/\.md$/, '')}`,
      })),
  });
};
```

- [ ] **Step 14.7: Build the site**

```bash
cd /home/phill/blackbox-devlog/site
npm run build
```

Expected: builds to `site/dist/` with `index.html`, `2026-04-27-hello-world/index.html`, `embed/index.html`, `feed.json`, `rss.xml`. No errors.

- [ ] **Step 14.8: Spot-check the output**

```bash
cd /home/phill/blackbox-devlog
ls site/dist
cat site/dist/feed.json | head -20
```

Expected: feed.json contains the hello-world entry.

- [ ] **Step 14.9: Commit**

```bash
cd /home/phill/blackbox-devlog
git add site/src/lib/ site/src/pages/
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "feat(site): pages (index, slug, embed, feed.json, rss.xml)"
```

---

## Task 15: GitHub Action workflow

**Files:**
- Create: `/home/phill/blackbox-devlog/.github/workflows/publish.yml`

- [ ] **Step 15.1: Write the workflow**

```yaml
name: publish
on:
  push:
    branches: [main]
    paths:
      - 'entries/**'
      - 'site/**'
      - 'scripts/**'
      - 'shared/**'
      - '.github/workflows/publish.yml'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'If true, log would-be tweets without posting.'
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
        with:
          node-version: '20'
      - name: install scripts deps
        working-directory: scripts
        run: npm ci
      - id: run
        name: detect unposted
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
        with:
          node-version: '20'
      - name: install scripts deps
        working-directory: scripts
        run: npm ci
      - name: post to twitter
        env:
          UNPOSTED: ${{ needs.detect.outputs.unposted }}
          TWITTER_HANDLE: blackbox
          TWITTER_API_KEY: ${{ secrets.TWITTER_API_KEY }}
          TWITTER_API_SECRET: ${{ secrets.TWITTER_API_SECRET }}
          TWITTER_ACCESS_TOKEN: ${{ secrets.TWITTER_ACCESS_TOKEN }}
          TWITTER_ACCESS_SECRET: ${{ secrets.TWITTER_ACCESS_SECRET }}
          DRY_RUN: ${{ github.event_name == 'workflow_dispatch' && inputs.dry_run || 'false' }}
        run: node scripts/post-to-twitter.mjs
      - name: commit lockfile
        if: github.event_name != 'workflow_dispatch' || inputs.dry_run != true
        run: |
          git config user.name "blackbox-devlog-bot"
          git config user.email "noreply@wyltekindustries.com"
          git add .published.json
          if git diff --staged --quiet; then
            echo "lockfile unchanged"
          else
            git commit -m "publish: update lockfile [skip ci]"
            git push
          fi

  build-and-deploy:
    needs: detect
    if: always()
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: install site deps
        working-directory: site
        run: npm ci
      - name: build site
        working-directory: site
        run: npm run build
      - name: deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site/dist
          cname: blackbox.wyltekindustries.com
```

- [ ] **Step 15.2: Commit**

```bash
cd /home/phill/blackbox-devlog
git add .github/
git -c user.name="Phill" -c user.email="toastmanau@gmail.com" commit -m "ci: publish workflow (detect → tweet → build & deploy)"
```

---

## Task 16: `/devlog` skill

The skill lives outside this repo, in `~/.claude/skills/devlog/SKILL.md`. It's a global Claude Code skill registered in the user's global CLAUDE.md.

**Files:**
- Create: `/home/phill/.claude/skills/devlog/SKILL.md`
- Modify: `/home/phill/.claude/CLAUDE.md` (append a registration block)

- [ ] **Step 16.1: Create the skill directory**

```bash
mkdir -p /home/phill/.claude/skills/devlog
```

- [ ] **Step 16.2: Write `~/.claude/skills/devlog/SKILL.md`**

```markdown
---
name: devlog
description: Scaffold a new BlackBox devlog entry from session context or inline notes, draft the tweet, confirm with user, then commit and push. Triggers on `/devlog` or "log this for blackbox".
---

# devlog

Scaffold a new entry in `~/blackbox-devlog/entries/` from current session context (or inline notes), draft the markdown + tweet text, confirm with the user, commit, and push. The push triggers the GitHub Action that fans out to Twitter and the website.

## When to invoke

- User types `/devlog` (with or without inline argument)
- User says "log this for blackbox" or "add a devlog entry"
- User just finished a session in `~/blackbox-pos` and asks to "write it up"

## Hard rules

1. **Never push without explicit user confirmation in this turn.** Pushing triggers a real-world tweet. A "yes" earlier in the session does not carry over.
2. **Never edit an already-published entry** to fix a tweet. The lockfile would prevent re-tweet, but the failure mode is confusing — refuse and tell the user to do it manually if they really want to.
3. **Never modify `.published.json` directly.** The lockfile is owned by CI.
4. **Tweet text is plain text, no markdown.** Strip any backticks, asterisks, or links the user might have included casually.

## Flow

### 1. Verify location

If CWD is not `~/blackbox-devlog`, `cd` there. If the directory does not exist, abort with: "blackbox-devlog repo not found at ~/blackbox-devlog. Clone it first: `git clone git@github.com:toastmanau/blackbox-devlog.git ~/blackbox-devlog`."

### 2. Gather context

Priority order:

1. **Inline argument** from `/devlog <text>` — use this as the seed.
2. **Recent session context** — if the user just worked in `~/blackbox-pos` or otherwise touched BlackBox code/hardware, summarise what was actually done (look at `git log --oneline -10` in `~/blackbox-pos`, recent file edits, conclusions reached).
3. **Ask** if neither yields enough: "What did you work on for BlackBox today? One or two sentences is enough."

### 3. Draft the entry

Compute today's date with `date -I`. Build the slug as `YYYY-MM-DD-<kebab-title>` (lowercase, dashes, no punctuation). Confirm the slug with the user before writing the file.

Draft:

- **`title`** — derived from the notes
- **Body** — 2 to 4 short paragraphs of what changed and what's next
- **`tweet`** — ~240 characters max (well under 280), conversational, no markdown. Show this to the user and **wait for explicit approval** before continuing.
- **`thread`** — only include if the material clearly needs more than one tweet's worth. Each thread item is its own ~240-char tweet.
- **`media`** — empty array unless the user mentioned image paths. If they did, copy the images into `entries/<slug>/` and reference them by relative `src`.
- **`summary`** — one-line description for the website card
- **`tags`** — pick 1–3 from existing usage (look at other entries). Common: `wave-2`, `release`, `hardware`, `firmware`, `case`, `screen`.

### 4. Show diff and confirm

Print the full proposed file content. Ask: "Write this and push? (the push will tweet)"

Acceptable answers:
- "yes" / "looks good" / "go" — proceed
- "tweak the tweet" / "rewrite X" — revise that field, show again, re-ask
- "no" / "cancel" — abort, leave nothing on disk

### 5. Write, commit, push

After explicit confirmation only:

```bash
cd ~/blackbox-devlog
mkdir -p entries/<slug>            # only if media exists
# write entries/<slug>.md and any media files
git add entries/
git commit -m "devlog: <title>"
git push
```

Then tell the user: "Pushed. Action will run, tweet will go live in ~30-60s. Watch: https://github.com/toastmanau/blackbox-devlog/actions"

## Frontmatter shape

The required + optional fields are documented in the design spec at `~/blackbox-devlog/docs/superpowers/specs/2026-04-27-blackbox-devlog-design.md` §4. The Zod source of truth is `~/blackbox-devlog/shared/schema.mjs`.

When in doubt, copy from `~/blackbox-devlog/entries/_template.md`.
```

- [ ] **Step 16.3: Append registration to `~/.claude/CLAUDE.md`**

Open `~/.claude/CLAUDE.md` and append (do NOT replace existing content):

```markdown

# devlog
- **devlog** (`~/.claude/skills/devlog/SKILL.md`) - scaffold a new BlackBox devlog entry from session context or inline notes, draft the tweet, confirm, commit + push. Trigger: `/devlog`
When the user types `/devlog`, "log this for blackbox", or "add a devlog entry", invoke the Skill tool with `skill: "devlog"` before doing anything else. Also invoke proactively after a session in `~/blackbox-pos` that produced a noteworthy change.
```

- [ ] **Step 16.4: Verify the skill loads**

Open a new Claude Code session and run `/devlog --help` (or just `/devlog` and abort). The skill should be invoked.

- [ ] **Step 16.5: Note in repo**

This step is intentionally NOT a git commit in `blackbox-devlog/` — the skill lives in `~/.claude/`, not in this repo. The repo's CLAUDE.md (Task 1) already references it.

---

## Bootstrap & First Push (post-implementation)

After all tasks are complete, follow the safe-bootstrap order from the spec (§9):

1. Create `github.com/toastmanau/blackbox-devlog` (public, empty, no README/license).
2. Add the four `TWITTER_*` secrets in repo Settings → Secrets and variables → Actions.
3. Add origin and push:
   ```bash
   cd ~/blackbox-devlog
   git remote add origin git@github.com:toastmanau/blackbox-devlog.git
   git push -u origin main
   ```
4. In GitHub Settings → Pages, set source = `gh-pages` branch, custom domain = `blackbox.wyltekindustries.com`, enforce HTTPS.
5. In wyltekindustries.com DNS: add CNAME `blackbox` → `toastmanau.github.io`.
6. Wait for DNS propagation; verify https://blackbox.wyltekindustries.com loads (will show the placeholder entry; the lockfile prevents it from tweeting).
7. Run a `workflow_dispatch` with `dry_run: true` on a freshly written real entry. Verify the run logs the would-be tweet without posting.
8. Push a real entry; first tweet goes live.
