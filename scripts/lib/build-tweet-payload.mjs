import path from 'node:path';
import twitterText from 'twitter-text';

const MAX_LENGTH = 280;
const MAX_MEDIA = 4;

function validateLength(text, where) {
  const parsed = twitterText.parseTweet(text);
  if (!parsed.valid) {
    throw new Error(
      `${where}: tweet length ${parsed.weightedLength} exceeds ${MAX_LENGTH} weighted characters`,
    );
  }
}

function resolveMediaPath(repoRoot, slug, src) {
  if (/^https?:\/\//i.test(src)) return src;
  return path.join(repoRoot, 'entries', slug, src);
}

export function buildTweetPayloads(entry, { repoRoot }) {
  const { slug, frontmatter } = entry;
  const { tweet, thread, media } = frontmatter;

  if (media.length > MAX_MEDIA) {
    throw new Error(
      `${slug}: ${media.length} media items exceeds Twitter's limit of ${MAX_MEDIA} per tweet`,
    );
  }

  validateLength(tweet, `${slug}: head tweet`);
  thread.forEach((t, i) => validateLength(t, `${slug}: thread[${i}]`));

  const headPayload = {
    text: tweet,
    mediaPaths: media.map((m) => resolveMediaPath(repoRoot, slug, m.src)),
  };

  const threadPayloads = thread.map((text) => ({ text, mediaPaths: [] }));

  return [headPayload, ...threadPayloads];
}
