export const FALLBACK_MEN_IMAGES = [
  '/images/men/tshirt/ao-phong-nam-cotton-usa-basic-co-tron-sw001.webp',
  '/images/men/tshirt/ao-polo-nam-basic-dang-suong-sw001.webp',
  '/images/men/tshirt/ao-phong-nam-basic-dang-boxy-sb001.webp',
  '/images/men/tshirt/ao-phong-active-nam-co-hinh-in-wicking-fk140.webp',
];

export const FALLBACK_WOMEN_IMAGES = [
  '/images/women/tshirt/ao-phong-nu-cotton-usa-basic-co-tron-sw001.webp',
  '/images/women/tshirt/ao-kieu-nu-tay-bong-fy061.webp',
  '/images/women/tshirt/ao-phong-nu-baby-tee-in-hinh-winnie-the-pooh-sa464.webp',
  '/images/women/tshirt/ao-polo-len-nu-ngan-tay-cotton-linen-se187.webp',
];

export const FALLBACK_KIDS_IMAGES = [
  '/images/kids/tshirt/ao-phong-be-trai-cotton-usa-co-hinh-in-oeko-tex-sa014.webp',
  '/images/kids/tshirt/ao-kieu-be-gai-dang-babydoll-inh-no-cr167.webp',
  '/images/kids/tshirt/ao-polo-be-trai-cotton-usa-co-hinh-in-sw001.webp',
];

export const DEFAULT_FALLBACK_IMAGES = [
  '/images/men/tshirt/ao-phong-nam-cotton-usa-basic-co-tron-sw001.webp',
  '/images/women/tshirt/ao-phong-nu-cotton-usa-basic-co-tron-sw001.webp',
  '/images/men/tshirt/ao-polo-nam-basic-dang-suong-sw001.webp',
  '/images/women/tshirt/ao-kieu-nu-tay-bong-fy061.webp',
  '/images/kids/tshirt/ao-phong-be-trai-cotton-usa-co-hinh-in-oeko-tex-sa014.webp',
];

/**
 * Returns a valid, non-empty image URL for any product.
 * If the provided image is missing, blank, or pointing to non-existent placeholders,
 * returns an appropriate real fashion item image.
 */
export function getValidProductImage(product: any, index: number = 0): string {
  if (!product) return DEFAULT_FALLBACK_IMAGES[index % DEFAULT_FALLBACK_IMAGES.length];

  let url: string | undefined = undefined;

  if (typeof product.image === 'string') {
    url = product.image;
  } else if (typeof product.imageUrl === 'string') {
    url = product.imageUrl;
  } else if (Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find((img: any) => img?.isPrimary) || product.images[0];
    url = typeof primary === 'string' ? primary : primary?.imageUrl;
  }

  if (url && typeof url === 'string' && url.trim().length > 0 && !url.includes('placeholder')) {
    return url;
  }

  const seedStr = String(product.id || product.slug || product.name || index);
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const group = String(product.targetGroup || product.category?.name || product.category || '').toLowerCase();

  if (group.includes('women') || group.includes('nữ') || group.includes('nu')) {
    return FALLBACK_WOMEN_IMAGES[positiveHash % FALLBACK_WOMEN_IMAGES.length];
  }
  if (group.includes('kid') || group.includes('trẻ') || group.includes('tre') || group.includes('bé')) {
    return FALLBACK_KIDS_IMAGES[positiveHash % FALLBACK_KIDS_IMAGES.length];
  }
  if (group.includes('men') || group.includes('nam')) {
    return FALLBACK_MEN_IMAGES[positiveHash % FALLBACK_MEN_IMAGES.length];
  }

  return DEFAULT_FALLBACK_IMAGES[positiveHash % DEFAULT_FALLBACK_IMAGES.length];
}

/**
 * Returns hover image for hover preview, or fallback second image.
 */
export function getValidHoverImage(product: any): string | undefined {
  if (!product) return undefined;
  if (Array.isArray(product.images) && product.images.length > 1) {
    const img2 = product.images[1];
    const url = typeof img2 === 'string' ? img2 : img2?.imageUrl;
    if (url && typeof url === 'string' && url.trim().length > 0 && !url.includes('placeholder')) {
      return url;
    }
  }
  return undefined;
}

/**
 * Normalizes an admin/API-supplied image URL into something next/image accepts:
 * an absolute http(s) URL or a root-relative path. Returns null for anything
 * else (blank, `javascript:`/`data:` schemes, malformed) so callers can fall back.
 */
export function sanitizeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let url = raw.trim();
  if (!url) return null;
  if (url.startsWith('//')) url = `https:${url}`;
  if (/^https?:\/\//i.test(url)) {
    try {
      new URL(url);
      return url;
    } catch {
      return null;
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
  return url.startsWith('/') ? url : `/${url}`;
}

/**
 * Remote hosts are not allowlisted in next.config, and next/image throws on
 * unknown hosts, so remote images must bypass the optimizer.
 */
export function isRemoteImage(src: unknown): boolean {
  return typeof src === 'string' && /^https?:\/\//i.test(src);
}

const PLACEHOLDER_IMAGE_HOSTS = ['picsum.photos', 'placehold.co', 'placeholder.com', 'via.placeholder.com', 'dummyimage.com', 'loremflickr.com'];

/** True for stock/test placeholder hosts that must never reach production UI. */
export function isPlaceholderImage(url: string): boolean {
  try {
    const host = new URL(url, 'http://localhost').hostname.toLowerCase();
    return PLACEHOLDER_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
