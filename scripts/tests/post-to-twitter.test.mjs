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
