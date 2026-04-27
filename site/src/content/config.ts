import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { entryFrontmatterSchema } from '../../../shared/schema.mjs';

const entries = defineCollection({
  loader: glob({
    pattern: '[0-9]*.md',
    base: '../entries',
  }),
  schema: entryFrontmatterSchema,
});

export const collections = { entries };
