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
  const minPrice = typeof resolvedSearchParams.minPrice === 'string' ? parseInt(resolvedSearchParams.minPrice, 10) : undefined;
  const maxPrice = typeof resolvedSearchParams.maxPrice === 'string' ? parseInt(resolvedSearchParams.maxPrice, 10) : undefined;
  const adultSize = typeof resolvedSearchParams.adultSize === 'string' ? resolvedSearchParams.adultSize : undefined;
  const kidsSize = typeof resolvedSearchParams.kidsSize === 'string' ? resolvedSearchParams.kidsSize : undefined;
  const accessorySize = typeof resolvedSearchParams.accessorySize === 'string' ? resolvedSearchParams.accessorySize : undefined;
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : undefined;
  const search = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined;
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page, 10) : 1;
  const pageSize = typeof resolvedSearchParams.pageSize === 'string' ? parseInt(resolvedSearchParams.pageSize, 10) : 24;

  // Fetch data
  let result;
  try {
    result = await ProductService.getProducts({
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
    });
  } catch (err: any) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Không thể tải sản phẩm</h1>
        <p className="text-gray-500 mb-8 text-center max-w-md">
          Vui lòng kiểm tra kết nối máy chủ hoặc thử lại sau.
        </p>
        <Link 
          href="/products"
          className="bg-black text-white px-8 py-3 rounded-md font-bold uppercase hover:bg-gray-800 transition-colors"
        >
          Thử lại
        </Link>
      </div>
    );
  }

  const { items: products, totalItems, currentPage, totalPages } = result;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  // Fetch real aggregated stats from /api/products/stats so the sidebar shows
  // actual DB counts. Replaced the previous hardcoded dummy constants that
  // caused "Nam (150)" to be displayed while the API returned 177.
  let stats = {
    targetGroup: {} as Record<string, number>,
    productType: {} as Record<string, number>,
    sizes: { adult: ['S', 'M', 'L', 'XL'] as string[], kids: ['100', '110', '120'] as string[] }
  };
  try {
    const apiStats = await ProductService.getStats();
    stats = {
      targetGroup: apiStats.targetGroup || {},
      productType: apiStats.productType || {},
      sizes: { adult: ['S', 'M', 'L', 'XL'], kids: ['100', '110', '120'] }
    };
  } catch (statsErr) {
    console.warn('Failed to load product stats, sidebar will show empty counts.', statsErr);
  }
  
  const titleMap: Record<string, string> = {
    women: 'Nữ',
    men: 'Nam',
    kids: 'Trẻ em',
    baby: 'Em bé',
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
  const activeFilters = [];
  if (productType) activeFilters.push({ key: 'productType', label: typeMap[productType] || productType });
  if (search) activeFilters.push({ key: 'search', label: `Tìm kiếm: "${search}"` });
  if (adultSize) activeFilters.push({ key: 'adultSize', label: `Size người lớn: ${adultSize}` });
  if (kidsSize) activeFilters.push({ key: 'kidsSize', label: `Size trẻ em: ${kidsSize}` });
  if (accessorySize) activeFilters.push({ key: 'accessorySize', label: `Size phụ kiện: ${accessorySize}` });
  if (status) {
    const stMap: Record<string, string> = { sale: 'Đang giảm giá', new: 'Hàng mới', best: 'Bán chạy' };
    activeFilters.push({ key: 'status', label: stMap[status] || status });
  }
  if (minPrice || maxPrice) {
    let priceLabel = '';
    if (minPrice && maxPrice) priceLabel = `${minPrice.toLocaleString('vi-VN')}đ - ${maxPrice.toLocaleString('vi-VN')}đ`;
    else if (minPrice) priceLabel = `Từ ${minPrice.toLocaleString('vi-VN')}đ`;
    else if (maxPrice) priceLabel = `Dưới ${maxPrice.toLocaleString('vi-VN')}đ`;
    activeFilters.push({ key: 'price', label: priceLabel });
  }

  return (
    <>
      <main className="min-h-screen bg-white text-slate-900 pt-3 md:pt-5 pb-20">
        <div className="container mx-auto px-4 xl:px-8">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
            <Link href="/" className="hover:underline">Trang chủ</Link>
            <span>/</span>
            <span className="font-bold text-slate-900">{pageTitle}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:block w-[240px] shrink-0 sticky top-24">
              <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse"></div>}>
                <FilterSidebar stats={stats} />
              </Suspense>
            </aside>

            {/* Main Content */}
            <div className="flex-1 w-full">
              
              {/* Header & Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight uppercase mb-1">
                    {pageTitle}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Đang xem {totalItems === 0 ? 0 : startIndex}–{endIndex} trên {totalItems} sản phẩm
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Suspense fallback={<div className="w-32 h-8 bg-gray-100 animate-pulse"></div>}>
                    <SortDropdown />
                  </Suspense>
                </div>
              </div>

              {/* Active Filters */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="text-sm text-gray-500 mr-2">Đang lọc theo:</span>
                  {activeFilters.map(filter => (
                    <div key={filter.key} className="bg-gray-100 text-slate-900 px-3 py-1.5 rounded text-[13px] font-bold flex items-center gap-2">
                      {filter.label}
                    </div>
                  ))}
                  <Link href={`/products${targetGroup ? `?targetGroup=${targetGroup}` : ''}`} className="text-[13px] text-gray-500 hover:text-[#e50027] hover:underline font-bold ml-2">
                    XÓA BỘ LỌC
                  </Link>
                </div>
              )}

              {/* Product Grid or Empty State */}
              <div className="flex-1 w-full flex flex-col items-center">
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center w-full">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 12H4M8 16l-4-4 4-4M16 16l4-4-4-4" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">
                      {targetGroup === 'kids' && gender === 'boy' 
                        ? 'Chưa có sản phẩm bé trai phù hợp'
                        : targetGroup === 'kids' && gender === 'girl'
                          ? 'Chưa có sản phẩm bé gái phù hợp'
                          : 'Không tìm thấy sản phẩm phù hợp'}
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-md">
                      Hãy thử thay đổi tiêu chí lọc hoặc xóa bộ lọc để xem thêm các sản phẩm khác.
                    </p>
                    <Link 
                      href="/products"
                      className="bg-slate-900 text-white px-8 py-3 font-bold uppercase tracking-widest text-[13px] hover:bg-slate-800 transition-colors"
                    >
                      Xóa bộ lọc
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-10 w-full mb-12">
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
