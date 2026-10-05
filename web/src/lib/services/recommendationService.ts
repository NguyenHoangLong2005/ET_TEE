import { Product, ProductService } from './productService';
import { getApiBaseUrl } from '@/lib/api-config';
import { getAuthHeaders } from '@/lib/auth';

export type RecommendationItem = {
  product: Product;
  reason: string;
};

// score/strategy fields used to sit here too (score: 0.95 - index*0.01,
// strategy: "Collaborative Filtering DB" / "Cross-Selling Rule-based" /
// "Content-based Filtering"), fabricated numbers and technique names with
// no model or ranking behind them - the actual data is just best-sellers
// (ProductService.getBestSellers), the rule-based target-group matching in
// ProductServiceImpl.getOutfits, and CLIP-embedding nearest neighbours in
// getSimilarProducts (no score is exposed by the API either).
// Nothing in the UI ever rendered score/strategy (grep confirmed only
// `.product` and `.reason` are read), so they were pure misleading dead
// weight. `reason` is real, generic display copy and is kept.
export type ForYouFeed = {
  strategy: 'SASREC' | 'CLIP_RECENT' | 'NONE';
  model: string | null;
  products: Product[];
};

const EMPTY_FEED: ForYouFeed = { strategy: 'NONE', model: null, products: [] };

export type CartComplement = {
  product: Product;
  /** target_group:product_type, e.g. "men:pants" */
  segment: string;
  /** RULE = FP-Growth association rule matched the cart; POPULAR_SEGMENT = back-off (best sellers of the group) */
  source: 'RULE' | 'POPULAR_SEGMENT';
};

const GROUP_LABEL: Record<string, string> = { men: 'nam', women: 'nữ', kids: 'trẻ em', unisex: '' };
const TYPE_LABEL: Record<string, string> = {
  tshirt: 'Áo thun', shirt: 'Áo sơ mi', polo: 'Áo polo', pants: 'Quần dài', shorts: 'Quần short',
  skirt: 'Chân váy', dress: 'Đầm', outerwear: 'Áo khoác', accessories: 'Phụ kiện', homewear: 'Đồ mặc nhà',
};

/** "men:pants" -> "Quần dài nam" */
export function segmentLabel(segment: string): string {
  const [group, type] = segment.split(':');
  return [TYPE_LABEL[type] ?? type, GROUP_LABEL[group] ?? ''].filter(Boolean).join(' ');
}

export type OutfitPiece = {
  /** top | bottom | dress | outer | accessory; null for the rule-based fallback */
  slot: string | null;
  product: Product;
  alternatives: Product[];
};

export type OutfitSet = {
  strategy: 'MODEL' | 'RULE';
  model: string | null;
  anchorSlot: string | null;
  pieces: OutfitPiece[];
};

export const SLOT_LABEL: Record<string, string> = {
  top: 'Áo', bottom: 'Quần / Váy', dress: 'Đầm', outer: 'Áo khoác', accessory: 'Phụ kiện',
};

export const RecommendationService = {
  async getPersonalizedRecommendations(limit: number = 8): Promise<RecommendationItem[]> {
    const valid = await ProductService.getBestSellers(limit);

    // Best-sellers, the same for everyone: never labelled "Dành riêng cho bạn" (that is getForYou).
    return valid.map(product => ({
      product,
      reason: "Đang được yêu thích",
    }));
  },

  /**
   * Home feed ranked from this shopper's own recent behavior (backend ForYouService: SASRec, or the
   * CLIP fallback). Must run in the browser: the guest token / login lives there. strategy NONE (no
   * behavior yet) comes back with no products.
   */
  /** "Thường được mua kèm" for the current cart (backend CartComplementService, FP-Growth rules). */
  async getCartComplements(limit: number = 4): Promise<CartComplement[]> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/recommendations/cart-complements?limit=${limit}`, {
        headers: getAuthHeaders(true),
        cache: 'no-store',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.items ?? [];
    } catch {
      return [];
    }
  },

  async getForYou(limit: number = 12): Promise<ForYouFeed> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/recommendations/for-you?limit=${limit}`, {
        headers: getAuthHeaders(true),
        cache: 'no-store',
      });
      if (!res.ok) return EMPTY_FEED;
      const json = await res.json();
      return json.data ?? EMPTY_FEED;
    } catch {
      return EMPTY_FEED;
    }
  },

  /** PDP "Phối trọn bộ": outfit completed around the product (backend OutfitService). */
  async getOutfitSet(slug: string): Promise<OutfitSet | null> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/recommendations/outfit/${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? null;
    } catch {
      return null;
    }
  },

  async getSimilarProducts(slug: string, limit: number = 10): Promise<RecommendationItem[]> {
    const similar = await ProductService.getSimilarProducts(slug, limit);

    return similar.slice(0, limit).map(product => ({
      product,
      reason: "Sản phẩm tương tự",
    }));
  }
};
