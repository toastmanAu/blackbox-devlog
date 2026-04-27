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
