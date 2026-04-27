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
