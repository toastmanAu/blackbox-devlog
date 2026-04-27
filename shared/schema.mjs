import { z } from 'zod';

export const mediaItemSchema = z.object({
  src: z.string().min(1, 'media.src must be non-empty'),
  alt: z.string().min(1, 'media.alt must be non-empty'),
});

export const entryFrontmatterSchema = z.object({
  // Required
  title: z.string().min(1, 'title is required'),
  date: z.coerce.date(),
  tweet: z.string().min(1, 'tweet is required'),

  // Optional content
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  version: z.string().optional(),

  // Optional media
  media: z.array(mediaItemSchema).default([]),

  // Optional thread
  thread: z.array(z.string().min(1, 'thread items must be non-empty')).default([]),

  // Optional escape hatch
  do_not_post: z.boolean().default(false),
});

export const lockfileSchema = z.object({
  version: z.literal(1),
  slugs: z.array(z.string().min(1)),
  tweets: z.record(z.string(), z.string().url()),
});
