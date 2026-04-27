import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const all = await getCollection('entries');
  const entries = all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const baseUrl = site?.toString().replace(/\/$/, '') || '';

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'blackbox devlog',
    home_page_url: baseUrl,
    feed_url: `${baseUrl}/feed.json`,
    description: 'Dev log for the BlackBox CKB point-of-sale device.',
    items: entries.map((e) => {
      const slug = e.id.replace(/\.md$/, '');
      return {
        id: `${baseUrl}/${slug}`,
        url: `${baseUrl}/${slug}`,
        title: e.data.title,
        content_text: e.data.summary || e.data.tweet,
        date_published: e.data.date.toISOString(),
        tags: e.data.tags,
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
};
