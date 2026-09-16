"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
const CART_STORAGE_KEY = "ettee_cart";

type ProductVariant = {
  id: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  active: boolean;
  attributeSignature?: string;
};

type Product = {
  id: string;
  name: string;
  brand: string;
  description: string;
  categoryId: string;
  slug: string;
  status: string;
  basePrice: number;
  variants: ProductVariant[];
  images?: Array<{ id: string; url: string; altText?: string; primary: boolean }>;
};

type ProductReview = { id: string; rating: number; comment?: string; createdAt: string };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewForm, setReviewForm] = useState({ orderItemId: "", rating: 5, comment: "" });
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!id) {
        setError("Không tìm thấy sản phẩm");
        setLoading(false);
        return;
      }

      try {
        setProduct(await apiClient.get<Product>(`/api/products/${id}`));
        setReviews(await apiClient.get<ProductReview[]>(`/api/products/${id}/reviews`));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải sản phẩm");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Đang tải sản phẩm...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-3xl border border-rose-500/30 bg-slate-900 p-8">
          <h1 className="text-2xl font-black text-white">Không tìm thấy sản phẩm</h1>
          <p className="mt-2 text-slate-300">{error || "Sản phẩm chưa có hoặc đã bị ẩn."}</p>
          <Link href="/products" className="mt-5 inline-block text-violet-300 hover:text-violet-200">← Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  const activeVariant = product.variants.find((variant) => variant.active) ?? product.variants[0];
  const displayPrice = activeVariant?.price ?? product.basePrice;
  const primaryImage = product.images?.find((image) => image.primary)?.url || product.images?.[0]?.url;

  const handleAddToCart = () => {
    if (!activeVariant) {
      setCartMessage("Sản phẩm chưa có biến thể hoạt động");
      return;
    }

    const existingRaw = window.localStorage.getItem(CART_STORAGE_KEY);
    const existing: Array<{
      id: string;
      productId: string;
      name: string;
      brand: string;
      price: number;
      quantity: number;
      image: string;
      color: string;
      size: string;
    }> = existingRaw ? JSON.parse(existingRaw) : [];

    const itemIndex = existing.findIndex((item) => item.id === activeVariant.id);
    const nextItems = [...existing];

    if (itemIndex >= 0) {
      nextItems[itemIndex] = { ...nextItems[itemIndex], quantity: nextItems[itemIndex].quantity + 1 };
    } else {
      nextItems.push({
        id: activeVariant.id,
        productId: product.id,
        name: product.name,
        brand: product.brand,
        price: activeVariant.price,
        quantity: 1,
        image: "PRODUCT",
        color: activeVariant.attributeSignature || "N/A",
        size: activeVariant.attributeSignature || "N/A",
      });
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    setCartMessage("Đã thêm vào giỏ hàng");
  };

  const submitReview = async () => {
    try {
      const created = await apiClient.post<ProductReview>(`/api/products/${product.id}/reviews`, {
        orderItemId: reviewForm.orderItemId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setReviews((current) => [created, ...current]);
      setReviewForm({ orderItemId: "", rating: 5, comment: "" });
      setReviewMessage("Đã gửi đánh giá sau khi xác thực đơn đã giao.");
    } catch (err) {
      setReviewMessage(err instanceof Error ? err.message : "Không thể gửi đánh giá");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <Link href="/products" className="inline-flex items-center text-sm text-violet-300 hover:text-violet-200">
          ← Quay lại danh sách
        </Link>

        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="space-y-4">
            <div className="h-[520px] overflow-hidden rounded-[32px] border border-slate-800 bg-gradient-to-br from-violet-950 via-slate-900 to-slate-800 flex items-center justify-center text-4xl font-black text-slate-500">
              {primaryImage ? <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" /> : "PRODUCT"}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(product.images?.length ? product.images : [null, null, null]).slice(0, 3).map((image, index) => (
                <div key={image?.id || index} className="h-28 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-500">
                  {image ? <img src={image.url} alt={image.altText || product.name} className="h-full w-full object-cover" /> : index + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <span className="inline-flex px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[11px] font-semibold uppercase tracking-[0.2em]">
                {product.brand}
              </span>
              <h1 className="text-4xl font-black text-white">{product.name}</h1>
              <p className="text-sm text-slate-400">{product.slug}</p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-amber-300">{formatCurrency(displayPrice)}</span>
              {activeVariant?.compareAtPrice ? (
                <span className="text-xl text-slate-500 line-through">{formatCurrency(activeVariant.compareAtPrice)}</span>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300 space-y-3">
              <div className="flex justify-between"><span className="text-slate-400">Phân loại</span><span>{activeVariant?.attributeSignature || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Trạng thái</span><span className="text-emerald-300">{product.status}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Bảo hành</span><span>90 ngày</span></div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleAddToCart} className="flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition">Thêm vào giỏ</button>
              <Link href="/checkout" className="flex-1 py-3 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-center transition">Mua ngay</Link>
            </div>

            {cartMessage ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{cartMessage}</div> : null}

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-bold text-white">Mô tả sản phẩm</h2>
              <p className="mt-4 leading-relaxed text-slate-300">{product.description}</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">Đánh giá khách hàng</h2>
                <span className="text-xs text-slate-400">{reviews.length} đánh giá</span>
              </div>
              <div className="mt-4 space-y-3">
                {reviews.length === 0 ? <p className="text-sm text-slate-400">Chưa có đánh giá đã xác thực.</p> : reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                      <time className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString("vi-VN")}</time>
                    </div>
                    {review.comment ? <p className="mt-2 text-sm text-slate-300">{review.comment}</p> : null}
                  </article>
                ))}
              </div>
              <div className="mt-5 border-t border-slate-800 pt-5 space-y-3">
                <p className="text-sm font-semibold text-white">Đánh giá sau khi đã nhận hàng</p>
                <input value={reviewForm.orderItemId} onChange={(event) => setReviewForm({ ...reviewForm, orderItemId: event.target.value })} placeholder="Order item ID" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" onClick={() => setReviewForm({ ...reviewForm, rating })} className={rating <= reviewForm.rating ? "text-amber-300 text-xl" : "text-slate-600 text-xl"}>★</button>)}
                </div>
                <textarea value={reviewForm.comment} onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })} rows={3} placeholder="Chia sẻ trải nghiệm..." className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
                <button type="button" onClick={submitReview} disabled={!reviewForm.orderItemId} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Gửi đánh giá</button>
                {reviewMessage ? <p className="text-xs text-slate-300">{reviewMessage}</p> : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
