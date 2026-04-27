import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { entryFrontmatterSchema } from '../../shared/schema.mjs';

export async function parseEntryFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const { data, content } = matter(raw);

  const result = entryFrontmatterSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid frontmatter in ${filePath}: ${issues}`);
  }

  const slug = path.basename(filePath, '.md');
  return { slug, frontmatter: result.data, body: content };
}
