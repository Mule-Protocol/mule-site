import { defineConfig } from 'astro/config';
import { site } from './src/config/site.mjs';

export default defineConfig({
  site: site.origin,
  output: 'static',
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
});
