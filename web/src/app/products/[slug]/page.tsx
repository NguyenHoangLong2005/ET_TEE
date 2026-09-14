import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductService } from '@/lib/services/productService';
import ProductGallery from '@/components/products/ProductGallery';
import ProductInfo from '@/components/products/ProductInfo';
import ProductDescription from '@/components/products/ProductDescription';
import ProductReviews from '@/components/products/ProductReviews';
import ProductRecommendations from '@/components/products/ProductRecommendations';
import { Suspense } from 'react';

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const product = await ProductService.getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const categoryMap: Record<string, string> = {
    women: 'Nữ',
    men: 'Nam',
    kids: 'Trẻ em',
    accessories: 'Phụ kiện',
    family: 'Gia đình',
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 pt-3 md:pt-5 pb-20">
      <div className="container mx-auto px-4 xl:px-8">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <Link href="/products" className="hover:underline">Sản phẩm</Link>
          <span>/</span>
          <Link href={`/products?category=${product.category?.name}`} className="hover:underline">
            {product.category?.name || 'Sản phẩm'}
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900 truncate max-w-[200px] md:max-w-md">
            {product.name}
          </span>
        </div>

        {/* Top Section: Gallery & Info */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 mb-16">
          <div className="w-full lg:w-7/12">
            <ProductGallery images={product.images} />
          </div>
          
          <div className="w-full lg:w-5/12">
            <div className="sticky top-24">
              <ProductInfo product={product} />
              <ProductDescription product={product} />
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <ProductReviews productId={product.id} slug={product.slug} />

        {/* Similar & Outfits */}
        <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div>}>
          <ProductRecommendations slug={product.slug} />
        </Suspense>
        
      </div>
    </main>
  );
}
