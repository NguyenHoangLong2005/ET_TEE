import HeroBanner from '@/components/home/HeroBanner';
import CategoryHighlights from '@/components/home/CategoryHighlights';
import OutfitSection from '@/components/home/OutfitSection';
import TrustBar from '@/components/home/TrustBar';
import Newsletter from '@/components/home/Newsletter';
import MarketingCarousel from '@/components/home/MarketingCarousel';
import { ProductService } from '@/lib/services/productService';
import { RecommendationService } from '@/lib/services/recommendationService';

export default async function Home() {
  let newProducts: any[] = [];
  let bestSellers: any[] = [];
  let saleProducts: any[] = [];
  let forYouProducts: any[] = [];
  let familyOutfits: any[] = [];

  try {
    const results = await Promise.allSettled([
      ProductService.getNewProducts(8),
      ProductService.getBestSellers(8),
      ProductService.getSaleProducts(8),
      RecommendationService.getPersonalizedRecommendations(8),
      ProductService.getFamilyOutfitProducts(4)
    ]);

    newProducts = results[0].status === 'fulfilled' ? results[0].value : [];
    bestSellers = results[1].status === 'fulfilled' ? results[1].value : [];
    saleProducts = results[2].status === 'fulfilled' ? results[2].value : [];

    if (results[3].status === 'fulfilled') {
      forYouProducts = results[3].value.map(item => item.product).filter(Boolean);
    }

    familyOutfits = results[4].status === 'fulfilled' ? results[4].value : [];
  } catch (error) {
    console.error("Home page fetch error:", error);
  }

  return (
    <main className="min-h-screen bg-white">
      {/* 1. High Impact Seasonal Hero Banner */}
      <HeroBanner />

      {/* 2. Value Proposition & Guarantees */}
      <TrustBar />

      {/* 3. Category Bento Highlights Grid */}
      <CategoryHighlights />

      {/* 4. Special Deals & Flash Sale (Urgency Driver) */}
      <MarketingCarousel
        placementKey="HOME_SALE"
        title="Ưu Đãi Đặc Biệt"
        subtitle="Mức giá cực tốt - Số lượng có hạn, mua ngay kẻo lỡ"
        viewAllLink="/products?sort=price-asc"
        bgColor="bg-red-50/40"
        fallback={saleProducts}
      />

      {/* 5. New Arrivals & Latest Collection Drop */}
      <MarketingCarousel
        placementKey="HOME_NEW"
        title="Sản Phẩm Mới"
        subtitle="Cập nhật xu hướng thời trang Thu Đông 2026 mới nhất"
        viewAllLink="/products?sort=newest"
        bgColor="bg-white"
        fallback={newProducts}
      />

      {/* 6. AI Personalized Recommendations */}
      <MarketingCarousel
        placementKey="HOME_RECOMMENDED"
        title="Dành Riêng Cho Bạn"
        subtitle="Gợi ý trang phục cá nhân hóa bởi trợ lý thời trang AI"
        viewAllLink="/products"
        bgColor="bg-slate-50"
        fallback={forYouProducts.length > 0 ? forYouProducts : newProducts}
      />

      {/* 7. Mix & Match Outfit Guide & Family Lookbook */}
      <OutfitSection products={familyOutfits.length > 0 ? familyOutfits : newProducts} />

      {/* 8. Best Sellers & Social Proof */}
      <MarketingCarousel
        placementKey="HOME_BEST_SELLER"
        title="Bán Chạy Nhất"
        subtitle="Những sản phẩm được ưa chuộng và đánh giá 5 sao từ khách hàng"
        viewAllLink="/products?sort=best-seller"
        bgColor="bg-white"
        fallback={bestSellers}
      />

      {/* 9. Newsletter & Exclusive Voucher Incentives */}
      <Newsletter />
    </main>
  );
}
