import HeroBanner from '@/components/home/HeroBanner';
import CategoryHighlights from '@/components/home/CategoryHighlights';
import ProductCarousel from '@/components/home/ProductCarousel';
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
      forYouProducts = results[3].value.map(item => item.product);
    }

    familyOutfits = results[4].status === 'fulfilled' ? results[4].value : [];
  } catch (error) {
    console.error("Home page fetch error:", error);
  }

  return (
    <>
      <HeroBanner />

      <CategoryHighlights />

      <MarketingCarousel
        placementKey="HOME_NEW"
        title="Sản Phẩm Mới"
        subtitle="Cập nhật xu hướng thời trang Thu Đông 2026"
        viewAllLink="/products?sort=new"
        bgColor="bg-white"
        fallback={newProducts}
      />

      <MarketingCarousel
        placementKey="HOME_BEST_SELLER"
        title="Bán Chạy Nhất"
        subtitle="Những items được khách hàng yêu thích nhất"
        viewAllLink="/products?sort=best-seller"
        bgColor="bg-gray-50"
        fallback={bestSellers}
      />

      <MarketingCarousel
        placementKey="HOME_RECOMMENDED"
        title="Dành Riêng Cho Bạn"
        subtitle="Gợi ý từ AI dựa trên phong cách của bạn"
        bgColor="bg-white"
        fallback={forYouProducts}
      />

      <OutfitSection products={familyOutfits} />

      <MarketingCarousel
        placementKey="HOME_SALE"
        title="Ưu Đãi Đặc Biệt"
        subtitle="Số lượng có hạn, mua ngay kẻo lỡ"
        viewAllLink="/products?sale=true"
        bgColor="bg-red-50"
        fallback={saleProducts}
      />

      <TrustBar />

      <Newsletter />
    </>
  );
}
