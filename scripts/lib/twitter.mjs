import fs from 'node:fs/promises';
import path from 'node:path';
import { TwitterApi } from 'twitter-api-v2';

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
};

export function makeTwitterClient(creds) {
  return new TwitterApi({
    appKey: creds.apiKey,
    appSecret: creds.apiSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
}

export async function defaultReadMedia(filePath) {
  if (/^https?:\/\//i.test(filePath)) {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`fetch ${filePath} failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(filePath);
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) throw new Error(`Unsupported media extension: ${ext} (${filePath})`);
  return mime;
}

async function uploadAll(client, mediaPaths, readMedia) {
  const ids = [];
  for (const p of mediaPaths) {
    const buf = await readMedia(p);
    const mid = await client.v1.uploadMedia(buf, { mimeType: mimeFor(p) });
    ids.push(mid);
  }
  return ids;
}

export async function postThread(client, payloads, { readMedia = defaultReadMedia, handle } = {}) {
  let headTweetId = null;
  let prevId = null;

  for (const payload of payloads) {
    const tweetPayload = { text: payload.text };

    if (payload.mediaPaths.length > 0) {
      const ids = await uploadAll(client, payload.mediaPaths, readMedia);
      tweetPayload.media = { media_ids: ids };
    }

    if (prevId) {
      tweetPayload.reply = { in_reply_to_tweet_id: prevId };
    }

    const res = await client.v2.tweet(tweetPayload);
    const id = res.data.id;
    if (!headTweetId) headTweetId = id;
    prevId = id;
  }

  const tweetUrl = handle
    ? `https://twitter.com/${handle}/status/${headTweetId}`
    : `https://twitter.com/i/status/${headTweetId}`;

  return { headTweetId, tweetUrl };
}
