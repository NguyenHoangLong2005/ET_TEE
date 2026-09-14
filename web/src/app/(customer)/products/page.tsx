"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

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

export default function CustomerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(`${API_BASE}/api/products`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Không thể tải danh sách sản phẩm");
        }

        setProducts(payload.data?.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải danh sách sản phẩm");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Danh Sách Sản Phẩm</h1>
          <p className="text-sm text-slate-400 mt-1">
            Kết nối trực tiếp API Spring Boot Backend (GET /api/products)
          </p>
        </div>
        <Link
          href="/"
          className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
        >
          ← Quay lại Trang chủ
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-300">
          Đang tải sản phẩm từ backend...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 hover:border-violet-500/50 transition">
              <div className="h-48 rounded-xl bg-slate-900 flex items-center justify-center text-slate-600 font-semibold border border-slate-800">
                [Hình ảnh Sản phẩm]
              </div>
              <div>
                <span className="text-xs font-semibold text-violet-400">{product.brand}</span>
                <h3 className="font-bold text-white text-lg">{product.name}</h3>
                <p className="text-sm font-extrabold text-amber-300 mt-1">{formatCurrency(getProductPrice(product))}</p>
              </div>
              <Link
                href={`/products/${product.id}`}
                className="block w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition text-center"
              >
                Xem chi tiết
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
