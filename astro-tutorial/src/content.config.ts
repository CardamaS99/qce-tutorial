import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/chapters' }),
  schema: z.object({
    lang: z.enum(['es', 'en']),
    order: z.number().int().positive(),
    part: z.string(),
    title: z.string(),
    lead: z.string(),
    accent: z.enum(['classical', 'quantum']).default('classical'),
  }),
});

export const collections = { chapters };
