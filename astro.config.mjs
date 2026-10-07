import { defineConfig } from 'astro/config';
import { site } from './src/config/site.mjs';

export default defineConfig({
  site: site.origin,
  output: 'static',
  build: { inlineStylesheets: 'never' },
  // One cached external stylesheet avoids a second render-blocking round trip on mobile.
  vite: { build: { assetsInlineLimit: 0, cssCodeSplit: false } },
});
