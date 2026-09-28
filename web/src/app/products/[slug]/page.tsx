import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductService } from '@/lib/services/productService';
import ProductGallery from '@/components/products/ProductGallery';
import ProductInfo from '@/components/products/ProductInfo';
import ProductDescription from '@/components/products/ProductDescription';
import ProductReviews from '@/components/products/ProductReviews';
import ProductRecommendations from '@/components/products/ProductRecommendations';
import PageBreadcrumb from '@/components/ui/PageBreadcrumb';
import { Suspense } from 'react';

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await ProductService.getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Không tìm thấy sản phẩm | ET.TEE',
      description: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.',
    };
  }

  const primaryImage = product.images?.[0]?.imageUrl || '/images/og-banner.jpg';
  const price = (product.salePrice || product.price || 0).toLocaleString('vi-VN');

  return {
    title: `${product.name} | ET.TEE`,
    description: product.description 
      ? product.description.slice(0, 160) 
      : `Mua ngay ${product.name} chính hãng tại ET.TEE. Giá chỉ ${price}₫. Thiết kế chuẩn form dáng, chất liệu cao cấp.`,
    openGraph: {
      title: `${product.name} - ET.TEE Fashion`,
      description: `Giá chỉ ${price}₫. Mua ngay thiết kế thời trang mới nhất tại ET.TEE.`,
      url: `/products/${product.slug}`,
      type: 'website',
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 1000,
          alt: product.name,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: `Giá chỉ ${price}₫ tại ET.TEE.`,
      images: [primaryImage],
    },
  };
}

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images?.map(img => img.imageUrl) || [],
    description: product.description || product.name,
    sku: product.slug,
    brand: {
      '@type': 'Brand',
      name: 'ET.TEE',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'VND',
      price: product.salePrice || product.price || 0,
      availability: 'https://schema.org/InStock',
      url: `https://et-tee.com/products/${product.slug}`,
      seller: {
        '@type': 'Organization',
        name: 'ET.TEE Fashion',
      },
    },
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 pt-3 md:pt-5 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 xl:px-8">
        
        {/* Breadcrumbs */}
        <PageBreadcrumb 
          items={[
            { label: 'Sản phẩm', href: '/products' },
            { label: product.category?.name || 'Danh mục', href: product.category?.name ? `/products?category=${encodeURIComponent(product.category.name)}` : '/products' },
            { label: product.name }
          ]} 
        />

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
        <Suspense fallback={<div className="h-40 animate-pulse bg-slate-100 rounded-2xl"></div>}>
          <ProductRecommendations slug={product.slug} />
        </Suspense>
        
      </div>
    </main>
  );
}
