import type { ImageMetadata } from 'astro';

const mediaModules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/media/**/*.{avif,jpg,jpeg,png,webp}',
  { eager: true },
);

export function resolveMedia(path: string): ImageMetadata {
  const key = `../assets${path}`;
  const asset = mediaModules[key]?.default;

  if (!asset) {
    throw new Error(`Could not resolve local media asset: ${path}`);
  }

  return asset;
}

export function responsiveWidths(image: ImageMetadata, candidates = [640, 1200, 1800]): number[] {
  const widths = candidates.filter((width) => width < image.width);
  widths.push(Math.min(image.width, candidates.at(-1) ?? image.width));

  return [...new Set(widths)].sort((a, b) => a - b);
}
