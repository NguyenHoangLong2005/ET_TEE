import Link from 'next/link';
import { ProductService } from '@/lib/services/productService';
import ProductCard from '@/components/ui/ProductCard';
import FilterSidebar from '@/components/products/FilterSidebar';
import SortDropdown from '@/components/products/SortDropdown';
import Pagination from '@/components/products/Pagination';
import { Suspense } from 'react';

// Use Next.js searchParams prop
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  
  // Extract params
  const targetGroup = typeof resolvedSearchParams.targetGroup === 'string' ? resolvedSearchParams.targetGroup : undefined;
  const gender = typeof resolvedSearchParams.gender === 'string' ? resolvedSearchParams.gender : undefined;
  const productType = typeof resolvedSearchParams.productType === 'string' ? resolvedSearchParams.productType : undefined;
  const category = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const collection = typeof resolvedSearchParams.collection === 'string' ? resolvedSearchParams.collection : undefined;
  const rawMinPrice = typeof resolvedSearchParams.minPrice === 'string' ? parseInt(resolvedSearchParams.minPrice, 10) : undefined;
  const minPrice = rawMinPrice !== undefined && !isNaN(rawMinPrice) && rawMinPrice >= 0 ? rawMinPrice : undefined;
  const rawMaxPrice = typeof resolvedSearchParams.maxPrice === 'string' ? parseInt(resolvedSearchParams.maxPrice, 10) : undefined;
  const maxPrice = rawMaxPrice !== undefined && !isNaN(rawMaxPrice) && rawMaxPrice >= 0 ? rawMaxPrice : undefined;
  const adultSize = typeof resolvedSearchParams.adultSize === 'string' ? resolvedSearchParams.adultSize : undefined;
  const kidsSize = typeof resolvedSearchParams.kidsSize === 'string' ? resolvedSearchParams.kidsSize : undefined;
  const accessorySize = typeof resolvedSearchParams.accessorySize === 'string' ? resolvedSearchParams.accessorySize : undefined;
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : undefined;
  const search = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined;
  const rawPage = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page, 10) : 1;
  const page = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1;
  const rawPageSize = typeof resolvedSearchParams.pageSize === 'string' ? parseInt(resolvedSearchParams.pageSize, 10) : 24;
  const pageSize = !isNaN(rawPageSize) && rawPageSize >= 1 && rawPageSize <= 100 ? rawPageSize : 24;

  // Fetch products and stats in parallel for maximum speed
  const [productsPromise, statsPromise] = await Promise.allSettled([
    ProductService.getProducts({
      targetGroup,
      gender,
      productType,
      category,
      collection,
      minPrice,
      maxPrice,
      adultSize,
      kidsSize,
      accessorySize,
      status,
      sort,
      q: search,
      page,
      pageSize,
    }),
    ProductService.getStats(),
  ]);

  if (productsPromise.status === 'rejected') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 text-center">Không thể tải sản phẩm</h1>
        <p className="text-slate-500 text-sm mb-8 text-center max-w-md">
          Vui lòng kiểm tra kết nối máy chủ hoặc thử lại sau.
        </p>
        <Link 
          href="/products"
          className="bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-full font-black uppercase text-xs tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          Thử lại
        </Link>
      </div>
    );
  }

  const result = productsPromise.value;
  const { items: products, totalItems, currentPage, totalPages } = result;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  let stats = {
    targetGroup: {} as Record<string, number>,
    productType: {} as Record<string, number>,
    sizes: {} as { letter?: string[]; number?: string[]; accessory?: string[]; kids?: string[] },
  };
  if (statsPromise.status === 'fulfilled') {
    const apiStats = statsPromise.value;
    // Sizes arrive grouped (letter / number / accessory / kids) and sorted by the backend
    stats = {
      targetGroup: apiStats.targetGroup || {},
      productType: apiStats.productType || {},
      sizes: apiStats.sizes || {},
    };
  }
  
  const titleMap: Record<string, string> = {
    women: 'Nữ',
    men: 'Nam',
    kids: 'Trẻ em',
    baby: 'Em bé',
    family: 'Gia đình',
  };
  
  let pageTitle = 'Tất cả sản phẩm';
  if (search) {
    pageTitle = `Kết quả tìm kiếm cho "${search}"`;
  } else if (targetGroup === 'kids' && gender === 'boy') {
    pageTitle = 'Bé trai';
  } else if (targetGroup === 'kids' && gender === 'girl') {
    pageTitle = 'Bé gái';
  } else if (targetGroup && titleMap[targetGroup]) {
    pageTitle = titleMap[targetGroup];
  }

  // Helper cho active chips
  const typeMap: Record<string, string> = {
    'tshirt': 'Áo thun', 't-shirt': 'Áo thun', 'shirt': 'Áo sơ mi', 'polo': 'Áo polo',
    'pants': 'Quần', 'trousers': 'Quần', 'jeans': 'Quần jeans', 'shorts': 'Quần short',
    'jacket': 'Áo khoác', 'coat': 'Áo khoác', 'dress': 'Váy', 'skirt': 'Chân váy',
    'accessory': 'Phụ kiện', 'accessories': 'Phụ kiện', 'homewear': 'Đồ mặc nhà',
    'set': 'Set đồ', 'family-set': 'Set gia đình',
  };
  const tgMap: Record<string, string> = {
    men: 'Nam', women: 'Nữ', boys: 'Bé trai', girls: 'Bé gái', family: 'Gia đình', baby: 'Em bé'
  };

  const activeFilters: { key: string; label: string; params: string[] }[] = [];
  if (targetGroup) {
    const tgs = targetGroup.split(',').map(t => tgMap[t.trim()] || t.trim());
    activeFilters.push({ key: 'targetGroup', label: `Danh mục: ${tgs.join(', ')}`, params: ['targetGroup'] });
  }
  if (productType) {
    const types = productType.split(',').map(t => typeMap[t.trim()] || t.trim());
    activeFilters.push({ key: 'productType', label: `Loại SP: ${types.join(', ')}`, params: ['productType'] });
  }
  if (category) activeFilters.push({ key: 'category', label: `Nhóm: ${category === 'accessories' ? 'Phụ kiện' : category}`, params: ['category'] });
  if (collection && collection !== 'all') activeFilters.push({ key: 'collection', label: `Bộ sưu tập: ${collection}`, params: ['collection'] });
  if (search) activeFilters.push({ key: 'search', label: `Tìm kiếm: "${search}"`, params: ['q'] });
  if (adultSize) activeFilters.push({ key: 'adultSize', label: `Size: ${adultSize}`, params: ['adultSize'] });
  if (kidsSize) activeFilters.push({ key: 'kidsSize', label: `Size trẻ em: ${kidsSize}`, params: ['kidsSize'] });
  if (accessorySize) activeFilters.push({ key: 'accessorySize', label: `Size phụ kiện: ${accessorySize}`, params: ['accessorySize'] });
  if (status) {
    const stMap: Record<string, string> = { sale: 'Đang giảm giá', new: 'Hàng mới', best: 'Bán chạy' };
    const sts = status.split(',').map(s => stMap[s.trim()] || s.trim());
    activeFilters.push({ key: 'status', label: `Trạng thái: ${sts.join(', ')}`, params: ['status'] });
  }
  if (minPrice || maxPrice) {
    let priceLabel = '';
    if (minPrice && maxPrice) priceLabel = `${minPrice.toLocaleString('vi-VN')}đ - ${maxPrice.toLocaleString('vi-VN')}đ`;
    else if (minPrice) priceLabel = `Từ ${minPrice.toLocaleString('vi-VN')}đ`;
    else if (maxPrice) priceLabel = `Dưới ${maxPrice.toLocaleString('vi-VN')}đ`;
    activeFilters.push({ key: 'price', label: priceLabel, params: ['minPrice', 'maxPrice'] });
  }

  // Href that drops the given query params but keeps everything else (sort, other filters).
  const hrefWithout = (drop: string[]) => {
    const qs = new URLSearchParams();
    Object.entries(resolvedSearchParams).forEach(([k, v]) => {
      if (drop.includes(k) || k === 'page' || v === undefined) return;
      (Array.isArray(v) ? v : [v]).forEach(item => qs.append(k, item));
    });
    const str = qs.toString();
    return `/products${str ? `?${str}` : ''}`;
  };

  return (
    <>
      <main className="min-h-screen bg-slate-50/50 text-slate-900 pt-3 md:pt-5 pb-20">
        <div className="container mx-auto px-4 xl:px-8 max-w-7xl">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:underline">Trang chủ</Link>
            <span>/</span>
            <span className="font-bold text-slate-900">{pageTitle}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Sidebar (Mobile Toggle + Desktop Sticky). Capped to the viewport with
                its own scroll, otherwise a sidebar taller than the screen only
                reveals its lower filters once the page is scrolled to the end. */}
            <aside className="w-full lg:w-[240px] shrink-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain custom-scrollbar lg:pr-1">
              <Suspense fallback={<div className="h-12 lg:h-96 bg-slate-100 rounded-2xl animate-pulse"></div>}>
                <FilterSidebar stats={stats} />
              </Suspense>
            </aside>

            {/* Main Content */}
            <div className="flex-1 w-full">
              
              {/* Header & Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900 mb-1">
                    {pageTitle}
                  </h1>
                  <p className="text-sm text-slate-500">
                    Đang xem {totalItems === 0 ? 0 : startIndex}–{endIndex} trên {totalItems} sản phẩm
                  </p>
                </div>
                
                <div className="flex items-center">
                  <Suspense fallback={<div className="w-48 h-8 bg-slate-100 rounded-full animate-pulse"></div>}>
                    <SortDropdown />
                  </Suspense>
                </div>
              </div>

              {/* Active Filters */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Đang lọc theo:</span>
                  {activeFilters.map(filter => (
                    <Link
                      key={filter.key}
                      href={hrefWithout(filter.params)}
                      aria-label={`Bỏ lọc ${filter.label}`}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3 py-1 text-xs font-bold rounded-full flex items-center gap-2 transition-colors"
                    >
                      {filter.label}
                      <span aria-hidden="true" className="text-slate-500">×</span>
                    </Link>
                  ))}
                  <Link href="/products" className="text-xs text-slate-500 hover:text-slate-900 underline font-bold ml-2">
                    Xóa tất cả
                  </Link>
                </div>
              )}

              {/* Product Grid or Empty State */}
              <div className="flex-1 w-full flex flex-col items-center">
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center w-full bg-slate-50/60 border border-dashed border-slate-200/80 rounded-3xl p-12">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4M8 16l-4-4 4-4M16 16l4-4-4-4" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                      {targetGroup === 'kids' && gender === 'boy' 
                        ? 'Chưa có sản phẩm bé trai phù hợp'
                        : targetGroup === 'kids' && gender === 'girl'
                          ? 'Chưa có sản phẩm bé gái phù hợp'
                          : 'Không tìm thấy sản phẩm phù hợp'}
                    </h2>
                    <p className="text-slate-500 text-sm mb-6 max-w-md">
                      Hãy thử thay đổi tiêu chí lọc hoặc xóa bộ lọc để xem thêm các sản phẩm khác.
                    </p>
                    <Link 
                      href="/products"
                      className="bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-full font-black uppercase tracking-wider text-xs shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      Xóa bộ lọc
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8 gap-y-12 w-full mb-16">
                      {products.map(product => (
                        <ProductCard
                          key={product.id}
                          id={product.slug}
                          productId={product.id}
                          name={product.name}
                          price={product.salePrice || product.price}
                          originalPrice={product.salePrice ? product.price : undefined}
                          image={product.images && product.images.length > 0 ? product.images[0].imageUrl : '/images/products/placeholder.webp'}
                          hoverImage={product.images && product.images.length > 1 ? product.images[1].imageUrl : undefined}
                          category={product.category?.name || 'Sản phẩm'}
                          isNew={product.isNew}
                          colors={Array.from(
                            new Map(
                              (product.variants || [])
                                .filter(v => v.colorHex)
                                .map(v => [v.colorHex!, { hex: v.colorHex, name: v.color }])
                            ).values()
                          ) as { hex: string; name: string }[]}
                          sizes={Array.from(new Set(product.variants?.map(v => v.size).filter(Boolean))) as string[]}
                        />
                      ))}
                    </div>
                    {/* Pagination */}
                    <Suspense fallback={null}>
                      <Pagination currentPage={currentPage} totalPages={totalPages} />
                    </Suspense>
                  </>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
