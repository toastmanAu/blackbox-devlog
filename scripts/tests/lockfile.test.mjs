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
