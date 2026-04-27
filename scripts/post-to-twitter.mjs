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
