import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://shuqitree.github.io',
  output: 'static',
  integrations: [react(), sitemap()],
});
