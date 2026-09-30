import { Product, ProductService } from './productService';

export type RecommendationItem = {
  product: Product;
  score: number;
  reason: string;
  strategy: string;
};

export const RecommendationService = {
  async getPersonalizedRecommendations(limit: number = 8): Promise<RecommendationItem[]> {
    // For now, we'll fetch random or best sellers from API and wrap them in RecommendationItem
    const valid = await ProductService.getBestSellers(limit);
    
    return valid.map((product, index) => ({
      product,
      score: 0.95 - (index * 0.01),
      reason: index < 2 ? "Dành riêng cho bạn" : "Đang được yêu thích",
      strategy: "Collaborative Filtering DB"
    }));
  },

  async getOutfitRecommendations(slug: string, limit: number = 4): Promise<RecommendationItem[]> {
    const outfit = await ProductService.getOutfits(slug);

    return outfit.slice(0, limit).map(product => ({
      product,
      score: 0.88,
      reason: "Phối cực chuẩn",
      strategy: "Cross-Selling Rule-based"
    }));
  },

  async getSimilarProducts(slug: string, limit: number = 4): Promise<RecommendationItem[]> {
    const similar = await ProductService.getSimilarProducts(slug);

    return similar.slice(0, limit).map(product => ({
      product,
      score: 0.90,
      reason: "Sản phẩm tương tự",
      strategy: "Content-based Filtering"
    }));
  }
};
