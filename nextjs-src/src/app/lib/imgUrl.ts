/**
 * Image URL helpers — generate Supabase Storage transform URLs for
 * thumbnails / previews / responsive images. Saves 5–50× bandwidth
 * vs. serving originals.
 *
 * Original:    https://db.archflow.ru/storage/v1/object/public/photos/.../foo.jpg  (90 KB)
 * Thumbnail:   https://db.archflow.ru/storage/v1/render/image/public/photos/.../foo.jpg?width=400&...  (15 KB)
 *
 * Use thumb() for grids/cards, preview() for medium views (modal etc),
 * original URL only when user clicks fullscreen.
 */

export interface ImgOpts {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
}

/**
 * Convert any Supabase /object/public/ URL into a /render/image/public/
 * transformation URL. Pass-through for non-Supabase URLs (e.g. blob:, https://example.com).
 */
export function imgUrl(url: string | null | undefined, opts: ImgOpts = {}): string {
  if (!url) return '';
  // Match Supabase public object URL
  const m = url.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+)$/);
  if (!m) return url; // not a Supabase URL — return as-is

  const [, host, bucketAndPath] = m;
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  if (opts.resize) params.set('resize', opts.resize);
  params.set('quality', String(opts.quality ?? 75));

  // Strip query string from original path (e.g. ?token=)
  const path = bucketAndPath.split('?')[0];
  return `${host}/storage/v1/render/image/public/${path}?${params.toString()}`;
}

/** 400x400 thumbnail for grid cards. */
export function thumb(url: string | null | undefined): string {
  return imgUrl(url, { width: 400, height: 400, resize: 'cover', quality: 75 });
}

/** 800px wide preview for medium views (modals, lightbox previews). */
export function preview(url: string | null | undefined): string {
  return imgUrl(url, { width: 800, quality: 80 });
}
