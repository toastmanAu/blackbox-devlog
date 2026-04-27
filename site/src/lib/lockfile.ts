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
