import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const all = await getCollection('entries');
  return rss({
    title: 'blackbox devlog',
    description: 'Dev log for the BlackBox CKB point-of-sale device.',
    site: site!,
    items: all
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((e) => ({
        title: e.data.title,
        pubDate: e.data.date,
        description: e.data.summary || e.data.tweet,
        link: `/${e.id.replace(/\.md$/, '')}`,
      })),
  });
};
