import HeroBanner from '@/components/home/HeroBanner';
import CategoryHighlights from '@/components/home/CategoryHighlights';
import OutfitSection from '@/components/home/OutfitSection';
import TrustBar from '@/components/home/TrustBar';
import Newsletter from '@/components/home/Newsletter';
import MarketingCarousel from '@/components/home/MarketingCarousel';
import PersonalizedSections from '@/components/home/PersonalizedSections';
import RecentlyViewedSection from '@/components/home/RecentlyViewedSection';
import ProductCarousel from '@/components/home/ProductCarousel';
import { ProductService } from '@/lib/services/productService';
import { RecommendationService, TrendingFeed } from '@/lib/services/recommendationService';

export default async function Home() {
  let newProducts: any[] = [];
  let bestSellers: any[] = [];
  let saleProducts: any[] = [];
  let familyOutfits: any[] = [];
  let trending: TrendingFeed = { windowDays: 0, products: [] };

  try {
    const results = await Promise.allSettled([
      ProductService.getNewProducts(8),
      ProductService.getBestSellers(8),
      ProductService.getSaleProducts(8),
      ProductService.getFamilyOutfitProducts(4),
      RecommendationService.getTrending(12),
    ]);

    newProducts = results[0].status === 'fulfilled' ? results[0].value : [];
    bestSellers = results[1].status === 'fulfilled' ? results[1].value : [];
    saleProducts = results[2].status === 'fulfilled' ? results[2].value : [];

    familyOutfits = results[3].status === 'fulfilled' ? results[3].value : [];
    if (results[4].status === 'fulfilled') trending = results[4].value;
  } catch (error) {
    console.error("Home page fetch error:", error);
  }

  return (
    // RootLayoutWrapper already renders a <main> around every page's
    // children, so this used to nest a second <main> landmark inside it.
    <div className="min-h-screen bg-white">
      {/* 1. High Impact Seasonal Hero Banner */}
      <HeroBanner />

      {/* 2. Value Proposition & Guarantees */}
      <TrustBar />

      {/* 3. Category Bento Highlights Grid */}
      <CategoryHighlights />

      {/* 3b. Personalised sections (client side: need the shopper's login / guest token):
         "Dành riêng cho bạn" (SASRec), "Vì bạn đã xem" (CLIP), "Hoàn thiện giỏ hàng" (FP-Growth).
         Each renders nothing until there is history / a cart to work from. */}
      <PersonalizedSections />

      {/* 3c. Everyone, including first-time visitors: interest from all shoppers in the last
         7 days (30 when the week is quiet), counted in distinct shoppers. */}
      <ProductCarousel
        title="Đang Được Quan Tâm"
        subtitle={`Được nhiều khách xem, thêm vào giỏ và mua nhất ${trending.windowDays || 7} ngày qua`}
        bgColor="bg-slate-50"
        products={trending.products}
        trackSource="recommendation"
      />

      {/* 4. Special Deals & Flash Sale (Urgency Driver) */}
      <MarketingCarousel
        placementKey="HOME_SALE"
        title="Ưu Đãi Đặc Biệt"
        subtitle="Mức giá cực tốt - Số lượng có hạn, mua ngay kẻo lỡ"
        viewAllLink="/products?status=sale"
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

      {/* Only shown when marketing curates HOME_RECOMMENDED. Its fallback used to be the
         best-seller list, so the page showed the exact same 8 products twice (here and in
         "Bán Chạy Nhất" below). */}
      <MarketingCarousel
        placementKey="HOME_RECOMMENDED"
        title="Được Yêu Thích Nhất"
        subtitle="Những sản phẩm đang bán chạy và được nhiều khách hàng lựa chọn"
        viewAllLink="/products"
        bgColor="bg-slate-50"
        fallback={[]}
      />

      {/* 7. Mix & Match Outfit Guide & Family Lookbook */}
      <OutfitSection products={familyOutfits.length > 0 ? familyOutfits : newProducts} />

      {/* 8. Best Sellers & Social Proof */}
      <MarketingCarousel
        placementKey="HOME_BEST_SELLER"
        title="Bán Chạy Nhất"
        subtitle="Những sản phẩm được ưa chuộng và đánh giá 5 sao từ khách hàng"
        viewAllLink="/products?sort=best-seller"
        bgColor="bg-slate-50"
        fallback={bestSellers}
      />

      {/* Shopper's own last product pages (hidden without history) */}
      <RecentlyViewedSection />

      {/* 9. Newsletter & Exclusive Voucher Incentives */}
      <Newsletter />
    </div>
  );
}
