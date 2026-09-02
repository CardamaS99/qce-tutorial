import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

/** Convierte ```python title="..." en un atributo que la hoja de estilo rotula. */
const codeTitle = {
  pre(node) {
    const raw = this.options.meta?.__raw ?? '';
    const match = raw.match(/title="([^"]+)"/);
    if (match) node.properties['data-title'] = match[1];
  },
};

export default defineConfig({
  site: 'https://example.org',
  base: '/tutorial',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: false,
      transformers: [codeTitle],
    },
  },
  build: { inlineStylesheets: 'auto' },
});
