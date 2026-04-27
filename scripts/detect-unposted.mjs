#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
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
