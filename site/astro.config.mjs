import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blackbox.wyltekindustries.com',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
});
