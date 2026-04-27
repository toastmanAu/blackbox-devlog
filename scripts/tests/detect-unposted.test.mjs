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
