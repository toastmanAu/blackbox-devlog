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
