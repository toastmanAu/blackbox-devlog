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
