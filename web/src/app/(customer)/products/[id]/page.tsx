"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function getProductPrice(product: Product) {
  return product.variants.find((variant) => variant.active)?.price ?? product.basePrice;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!id) {
        setError("Không tìm thấy sản phẩm");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/products/${id}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Không thể tải sản phẩm");
        }

        setProduct(payload.data);
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
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
          Đang tải thông tin sản phẩm...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">
          <h1 className="text-2xl font-black mb-2">Không tìm thấy sản phẩm</h1>
          <p>{error || "Sản phẩm bạn yêu cầu không tồn tại hoặc đã bị ẩn."}</p>
          <Link href="/products" className="mt-5 inline-block text-violet-300 hover:text-violet-200">
            ← Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const displayPrice = getProductPrice(product);
  const activeVariant = product.variants.find((variant) => variant.active) ?? product.variants[0];

  const handleAddToCart = () => {
    if (!activeVariant) {
      setCartMessage("Sản phẩm hiện chưa có biến thể để thêm vào giỏ hàng");
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

    const nextItems = (() => {
      const itemIndex = existing.findIndex((item) => item.id === activeVariant.id);
      if (itemIndex >= 0) {
        const updated = [...existing];
        updated[itemIndex] = {
          ...updated[itemIndex],
          quantity: updated[itemIndex].quantity + 1,
        };
        return updated;
      }

      return [
        ...existing,
        {
          id: activeVariant.id,
          productId: product.id,
          name: product.name,
          brand: product.brand,
          price: activeVariant.price,
          quantity: 1,
          image: "PRODUCT",
          color: activeVariant.attributeSignature || "N/A",
          size: activeVariant.attributeSignature || "N/A",
        },
      ];
    })();

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    setCartMessage("Đã thêm sản phẩm vào giỏ hàng");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              ET.TEE FASHION
            </Link>
            <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
              Product detail
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="/" className="hover:text-violet-400 transition-colors">Trang chủ</Link>
            <Link href="/products" className="text-white font-semibold">Sản phẩm</Link>
            <Link href="/cart" className="hover:text-violet-400 transition-colors">Giỏ hàng</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <Link href="/products" className="inline-flex items-center text-sm text-violet-300 hover:text-violet-200">
          ← Quay lại danh sách
        </Link>

        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
          <div className="space-y-4">
            <div className="h-[520px] rounded-3xl border border-slate-800 bg-gradient-to-br from-violet-900/40 via-slate-900 to-slate-800 flex items-center justify-center text-2xl font-black text-slate-500">
              PRODUCT IMAGE
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-28 rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center text-sm text-slate-500">
                  Gallery {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                {product.brand}
              </span>
              <h1 className="text-4xl font-black text-white">{product.name}</h1>
              <p className="text-sm text-violet-400 font-semibold">{product.slug}</p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-3xl font-black text-amber-300">{formatCurrency(displayPrice)}</span>
              {product.variants[0]?.compareAtPrice ? (
                <span className="text-lg text-slate-500 line-through">
                  {formatCurrency(product.variants[0].compareAtPrice)}
                </span>
              ) : null}
            </div>

            <p className="text-slate-300 leading-relaxed">{product.description}</p>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Màu / Size</span>
                <span className="text-slate-200 font-medium">{product.variants[0]?.attributeSignature || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Trạng thái</span>
                <span className="text-emerald-300 font-medium">{product.status}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition"
              >
                Thêm vào giỏ hàng
              </button>
              <button className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold transition">
                Mua ngay
              </button>
            </div>

            {cartMessage ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {cartMessage}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                <p className="text-slate-500">Giao hàng</p>
                <p className="font-bold text-white mt-1">2 - 4 ngày</p>
              </div>
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                <p className="text-slate-500">Bảo hành</p>
                <p className="font-bold text-white mt-1">90 ngày</p>
              </div>
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                <p className="text-slate-500">Chính sách</p>
                <p className="font-bold text-white mt-1">Đổi trả dễ dàng</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
