import { Product, ProductService } from './productService';

export type RecommendationItem = {
  product: Product;
  reason: string;
};

// score/strategy fields used to sit here too (score: 0.95 - index*0.01,
// strategy: "Collaborative Filtering DB" / "Cross-Selling Rule-based" /
// "Content-based Filtering"), fabricated numbers and technique names with
// no model or ranking behind them - the actual data is just best-sellers
// (ProductService.getBestSellers) or the simple rule-based product-type/
// target-group matching in ProductServiceImpl.getOutfits/getSimilarProducts.
// Nothing in the UI ever rendered score/strategy (grep confirmed only
// `.product` and `.reason` are read), so they were pure misleading dead
// weight. `reason` is real, generic display copy and is kept.
export const RecommendationService = {
  async getPersonalizedRecommendations(limit: number = 8): Promise<RecommendationItem[]> {
    const valid = await ProductService.getBestSellers(limit);

    return valid.map((product, index) => ({
      product,
      reason: index < 2 ? "Dành riêng cho bạn" : "Đang được yêu thích",
    }));
  },

  async getOutfitRecommendations(slug: string, limit: number = 4): Promise<RecommendationItem[]> {
    const outfit = await ProductService.getOutfits(slug);

    return outfit.slice(0, limit).map(product => ({
      product,
      reason: "Phối cực chuẩn",
    }));
  },

  async getSimilarProducts(slug: string, limit: number = 4): Promise<RecommendationItem[]> {
    const similar = await ProductService.getSimilarProducts(slug);

    return similar.slice(0, limit).map(product => ({
      product,
      reason: "Sản phẩm tương tự",
    }));
  }
};
