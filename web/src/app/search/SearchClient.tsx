'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, ImagePlus, Search, X } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { SearchService, SearchResult } from '@/lib/services/searchService';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const EXAMPLES = ['váy đi tiệc cho phụ nữ', 'áo khoác chống nắng cho bé', 'quần jean nam', 'đồ ngủ cho bé', 'giày đi tiệc nữ'];

export default function SearchClient({
  initialQuery,
  initialResult,
}: {
  initialQuery: string;
  initialResult: SearchResult | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [imageResult, setImageResult] = useState<SearchResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const result = imageResult ?? initialResult;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    clearImage();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setImageResult(null);
    setError(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setError('Chỉ nhận ảnh JPG, PNG hoặc WEBP.');
    if (file.size > MAX_BYTES) return setError('Ảnh tối đa 5 MB.');
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setQuery('');
    setLoading(true);
    try {
      setImageResult(await SearchService.searchByImage(file, 24));
    } catch (err) {
      setImageResult(null);
      setError(err instanceof Error ? err.message : 'Không tìm được bằng ảnh này.');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Paste a screenshot / copied image anywhere on the page (Ctrl+V) to search by it.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.kind === 'file' && i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      onFile(item.getAsFile() ?? undefined);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={onDrop}
      className="relative"
    >
      {dragging && (
        <div className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-primary bg-primary-50/80 flex flex-col items-center justify-center gap-2 text-primary font-bold pointer-events-none">
          <ImagePlus className="w-8 h-8" />
          Thả ảnh vào đây để tìm sản phẩm giống
        </div>
      )}
      <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">Tìm kiếm</h1>
      <p className="text-sm text-slate-500 mb-6">
        Mô tả món bạn cần bằng lời, hoặc tìm bằng ảnh: bấm &ldquo;Tìm bằng ảnh&rdquo;, kéo thả ảnh vào trang hay dán ảnh (Ctrl+V).
      </p>

      <form onSubmit={submit} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Bạn đang tìm gì?"
            maxLength={200}
            aria-label="Từ khóa tìm kiếm"
            className="w-full border border-slate-200 rounded-full pl-11 pr-10 py-3 text-sm focus:outline-none focus:border-slate-900"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Xóa từ khóa"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-900">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 text-sm font-bold transition-colors">
          Tìm
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="border border-slate-200 rounded-full px-4 flex items-center gap-2 text-sm font-bold text-slate-700 hover:border-slate-900"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">Tìm bằng ảnh</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => onFile(e.target.files?.[0])}
        />
      </form>

      {preview && (
        <div className="flex items-center gap-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Ảnh bạn tải lên" className="w-16 h-20 object-cover rounded-xl border border-slate-200" />
          <span className="text-sm text-slate-600">{loading ? 'Đang tìm món giống ảnh…' : 'Sản phẩm giống ảnh của bạn'}</span>
          <button type="button" onClick={clearImage} aria-label="Bỏ ảnh" className="text-slate-400 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

      {!result && !preview && !loading && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-slate-500">Thử:</span>
          {EXAMPLES.map(ex => (
            <button key={ex} type="button" onClick={() => router.push(`/search?q=${encodeURIComponent(ex)}`)}
              className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-900 transition-colors">
              {ex}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      )}

      {result && !loading && (
        result.products.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Không tìm thấy sản phẩm phù hợp. Thử mô tả khác (ví dụ thêm &ldquo;nam&rdquo;, &ldquo;nữ&rdquo;, &ldquo;bé&rdquo;) hoặc tìm bằng ảnh.
          </p>
        ) : (
          <>
            {imageResult && (
              <p className="text-xs text-slate-500 mb-4">{result.products.length} sản phẩm giống ảnh của bạn</p>
            )}
            {!imageResult && initialQuery && (
              <p className="text-xs text-slate-500 mb-4">
                {result.products.length} kết quả cho &ldquo;{initialQuery}&rdquo; ·{' '}
                <Link href={`/products?q=${encodeURIComponent(initialQuery)}`} className="underline hover:text-slate-900">
                  lọc theo giá, size, màu
                </Link>
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.products.map(product => (
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
                  colors={Array.from(new Set(product.variants?.map(v => v.colorHex).filter(Boolean))) as string[]}
                  sizes={Array.from(new Set(product.variants?.map(v => v.size).filter(Boolean))) as string[]}
                />
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
