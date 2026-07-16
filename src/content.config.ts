import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const partialDate = z.string().regex(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/, {
  message: 'Use YYYY, YYYY-MM, or YYYY-MM-DD.',
});

const mediaPath = z.string().regex(/^\/media\/.+\.(?:avif|jpe?g|png|webp)$/i, {
  message: 'Media paths must begin with /media/ and use a supported image extension.',
});

const publicationStatus = z.enum(['published', 'draft', 'hidden']);

const photography = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/photography' }),
  schema: z
    .object({
      title: z.string().min(1),
      navTitle: z.string().min(1).optional(),
      order: z.number().int().nonnegative(),
      status: publicationStatus.default('published'),
      date: partialDate,
      dateEnd: partialDate.optional(),
      dateDisplay: z.string().min(1),
      dateHtml: z.string().min(1).optional(),
      equipment: z.object({
        cameras: z.array(z.string().min(1)).min(1),
        lenses: z.array(z.string().min(1)).default([]),
      }),
      equipmentDisplay: z.string().min(1),
      youtubeId: z
        .string()
        .regex(/^[A-Za-z0-9_-]{11}$/)
        .optional(),
      cover: mediaPath.optional(),
      images: z.array(mediaPath).default([]),
      featured: z.boolean().default(false),
      seoDescription: z.string().max(180).optional(),
    })
    .superRefine((project, context) => {
      if (project.cover && !project.images.includes(project.cover)) {
        context.addIssue({
          code: 'custom',
          path: ['cover'],
          message: 'The cover must also appear in the project image list.',
        });
      }

      if (project.status === 'published' && project.images.length === 0 && !project.youtubeId) {
        context.addIssue({
          code: 'custom',
          path: ['images'],
          message: 'A published project needs photographs or a video.',
        });
      }
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().min(1),
    path: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    order: z.number().int().nonnegative(),
    status: publicationStatus.default('published'),
    email: z.string().email().optional(),
    profileImages: z.array(mediaPath).default([]),
    seoDescription: z.string().max(180).optional(),
  }),
});

export const collections = { photography, pages };
