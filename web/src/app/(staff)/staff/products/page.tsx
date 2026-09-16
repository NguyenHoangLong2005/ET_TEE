"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type ProductItem = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  genderTarget: string;
  status: string;
  basePrice: number;
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    active: boolean;
    attributeSignature?: string | null;
  }>;
};

type CategoryItem = {
  id: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
  children?: CategoryItem[];
};

type InventoryItem = {
  variantId: string;
  available: number;
};

type AdjustmentRequestItem = {
  id: string;
  variantId: string;
  locationId: string;
  requestedBy?: string | null;
  quantityDiff: number;
  reason: string;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
};

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("ettee_access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function StaffProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequestItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [selectedStatusByProduct, setSelectedStatusByProduct] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    categoryId: "",
    name: "",
    slug: "",
    description: "",
    brand: "",
    genderTarget: "unisex",
    basePrice: "",
  });
  const [categoryForm, setCategoryForm] = useState({
    parentId: "",
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    active: true,
    sortOrder: "0",
  });

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/categories`, {
        headers: getAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể tải danh mục");
      }
      setCategories(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh mục");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ size: "50" });
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);

      const requestParams = new URLSearchParams({ size: "50" });
      if (requestStatusFilter !== "all") requestParams.set("status", requestStatusFilter);

      const [productResponse, lowStockResponse, adjustmentResponse] = await Promise.all([
        fetch(`${API_BASE}/api/store-owner/products?${params.toString()}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/store-owner/inventory/low-stock?size=50`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/store-owner/inventory/adjustment-requests?${requestParams.toString()}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const productPayload = await productResponse.json();
      const lowStockPayload = await lowStockResponse.json();
      const adjustmentPayload = await adjustmentResponse.json();

      if (!productResponse.ok || !productPayload.success) {
        throw new Error(productPayload.message || "Không thể tải danh sách sản phẩm");
      }

      if (!lowStockResponse.ok || !lowStockPayload.success) {
        throw new Error(lowStockPayload.message || "Không thể tải danh sách tồn kho");
      }

      if (!adjustmentResponse.ok || !adjustmentPayload.success) {
        throw new Error(adjustmentPayload.message || "Không thể tải yêu cầu điều chỉnh tồn kho");
      }

      setProducts(productPayload.data?.items ?? []);
      setLowStock(lowStockPayload.data?.items ?? []);
      setAdjustmentRequests(adjustmentPayload.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadData();
  }, [keyword, statusFilter, categoryFilter, requestStatusFilter]);

  const lowStockMap = new Map(lowStock.map((item) => [item.variantId, item.available]));

  const handleCreateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setCreating(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/store-owner/products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          categoryId: productForm.categoryId,
          name: productForm.name,
          slug: productForm.slug,
          description: productForm.description,
          brand: productForm.brand,
          genderTarget: productForm.genderTarget,
          basePrice: Number(productForm.basePrice || 0),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể tạo sản phẩm");
      }

      setProductForm({
        categoryId: "",
        name: "",
        slug: "",
        description: "",
        brand: "",
        genderTarget: "unisex",
        basePrice: "",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo sản phẩm");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (productId: string) => {
    const nextStatus = selectedStatusByProduct[productId];
    if (!nextStatus) return;

    try {
      const response = await fetch(`${API_BASE}/api/store-owner/products/${productId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể cập nhật trạng thái sản phẩm");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái sản phẩm");
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      parentId: "",
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      active: true,
      sortOrder: "0",
    });
    setEditingCategoryId(null);
  };

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setCategorySubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/admin/categories${editingCategoryId ? `/${editingCategoryId}` : ""}`, {
        method: editingCategoryId ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          parentId: categoryForm.parentId || null,
          name: categoryForm.name,
          slug: categoryForm.slug,
          description: categoryForm.description,
          imageUrl: categoryForm.imageUrl || null,
          active: categoryForm.active,
          sortOrder: Number(categoryForm.sortOrder || 0),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể lưu danh mục");
      }

      resetCategoryForm();
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu danh mục");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleEditCategory = (category: CategoryItem) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      parentId: category.parentId ?? "",
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      imageUrl: category.imageUrl ?? "",
      active: category.active ?? true,
      sortOrder: String(category.sortOrder ?? 0),
    });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa danh mục này?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/admin/categories/${categoryId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể xóa danh mục");
      }

      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa danh mục");
    }
  };

  const handleApproveAdjustment = async (requestId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/store-owner/inventory/adjustment-requests/${requestId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể phê duyệt yêu cầu");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể phê duyệt yêu cầu");
    }
  };

  const handleRejectAdjustment = async (requestId: string) => {
    const reason = window.prompt("Nhập lý do từ chối:");
    if (!reason || !reason.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/store-owner/inventory/adjustment-requests/${requestId}/reject`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể từ chối yêu cầu");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể từ chối yêu cầu");
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SHOP_OWNER"]} allowedPermissions={["product.manage"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
            MERCHANT PORTAL
          </span>
          <h1 className="text-2xl font-bold text-white">Quản lý Sản phẩm & Tồn kho</h1>
        </div>
        <Link href="/staff/dashboard" className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition">
          ← Quay lại Dashboard
        </Link>
      </div>

      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <Link href="/staff/dashboard" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">📊 Tổng quan</Link>
        <Link href="/staff/products" className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">📦 Quản lý Sản phẩm & Tồn kho</Link>
        <Link href="/staff/orders" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">🚚 Quản lý Đơn hàng & Đóng gói</Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 text-sm">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-6">
        <div>
          <h3 className="font-bold text-white mb-4">Tạo sản phẩm mới</h3>
          <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={productForm.categoryId}
              onChange={(e) => setProductForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input
              value={productForm.name}
              onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Tên sản phẩm"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
            <input
              value={productForm.slug}
              onChange={(e) => setProductForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="Slug"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
            <input
              value={productForm.brand}
              onChange={(e) => setProductForm((prev) => ({ ...prev, brand: e.target.value }))}
              placeholder="Brand"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <select
              value={productForm.genderTarget}
              onChange={(e) => setProductForm((prev) => ({ ...prev, genderTarget: e.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="unisex">Unisex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input
              value={productForm.basePrice}
              onChange={(e) => setProductForm((prev) => ({ ...prev, basePrice: e.target.value }))}
              placeholder="Giá gốc"
              type="number"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả"
              className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {creating ? "Đang tạo..." : "+ Tạo sản phẩm"}
              </button>
            </div>
          </form>
        </div>

        <div className="border-t border-slate-800 pt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Quản lý danh mục</h3>
            {editingCategoryId ? (
              <button
                onClick={resetCategoryForm}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 text-xs"
              >
                Hủy chỉnh sửa
              </button>
            ) : null}
          </div>

          <form onSubmit={handleCategorySubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={categoryForm.parentId}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, parentId: e.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">Không có danh mục cha</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Tên danh mục"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
            <input
              value={categoryForm.slug}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="Slug"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
            <input
              value={categoryForm.sortOrder}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              placeholder="Thứ tự sắp xếp"
              type="number"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <input
              value={categoryForm.imageUrl}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="Image URL"
              className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả danh mục"
              className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={categoryForm.active}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Active
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={categorySubmitting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {categorySubmitting ? "Đang lưu..." : editingCategoryId ? "Lưu chỉnh sửa danh mục" : "Tạo danh mục"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300 text-sm">
          Đang tải dữ liệu sản phẩm...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.8fr] gap-8">
          <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white">Danh sách sản phẩm</h3>
            </div>

            <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-3">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm sản phẩm"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
                <option value="discontinued">Discontinued</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="p-4 border-b border-slate-800">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <h3 className="font-bold text-white">Yêu cầu điều chỉnh tồn kho</h3>
                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="mt-4 space-y-3">
                {adjustmentRequests.length === 0 ? (
                  <div className="text-sm text-slate-400">Không có yêu cầu điều chỉnh nào.</div>
                ) : (
                  adjustmentRequests.slice(0, 6).map((request) => (
                    <div key={request.id} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">Variant {request.variantId.slice(0, 8)}</p>
                          <p className="text-[11px] text-slate-400">Location {request.locationId.slice(0, 8)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${request.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-300" : request.status === "REJECTED" ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300"}`}>
                          {request.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-400">{request.reason}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Quantity diff: {request.quantityDiff}</span>
                        <span>{new Date(request.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>

                      {request.status === "PENDING" ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleApproveAdjustment(request.id)}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectAdjustment(request.id)}
                            className="px-2 py-1 rounded border border-rose-500 text-rose-300 text-[11px]"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Variants</th>
                    <th className="p-3">Giá</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-slate-400">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id}>
                        <td className="p-3 font-semibold text-white">{product.name}</td>
                        <td className="p-3">{product.brand}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {product.variants.map((variant) => (
                              <span
                                key={variant.id}
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  lowStockMap.get(variant.id) !== undefined && lowStockMap.get(variant.id)! <= 5
                                    ? "bg-amber-500/10 text-amber-300"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                              >
                                {variant.sku}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-amber-300">{formatCurrency(product.basePrice)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${product.status === "active" ? "bg-emerald-500/10 text-emerald-300" : product.status === "draft" ? "bg-sky-500/10 text-sky-300" : product.status === "hidden" ? "bg-violet-500/10 text-violet-300" : "bg-rose-500/10 text-rose-300"}`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-2">
                            <select
                              value={selectedStatusByProduct[product.id] ?? product.status}
                              onChange={(e) =>
                                setSelectedStatusByProduct((prev) => ({ ...prev, [product.id]: e.target.value }))
                              }
                              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-white"
                            >
                              <option value="draft">Draft</option>
                              <option value="active">Active</option>
                              <option value="hidden">Hidden</option>
                              <option value="discontinued">Discontinued</option>
                            </select>
                            <button
                              onClick={() => handleUpdateStatus(product.id)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"
                            >
                              Lưu trạng thái
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
              <h3 className="text-lg font-bold text-white mb-3">Tồn kho cảnh báo</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                {lowStock.length === 0 ? (
                  <li className="text-slate-400">Không có cảnh báo tồn kho.</li>
                ) : (
                  lowStock.slice(0, 5).map((item) => (
                    <li key={`${item.variantId}`} className="flex justify-between gap-2">
                      <span className="text-slate-300">Variant {item.variantId.slice(0, 8)}</span>
                      <span className="text-amber-300 font-semibold">{item.available}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
              <h3 className="text-lg font-bold text-white mb-3">Danh mục hiện có</h3>
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-400">Không có danh mục nào.</p>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950 border border-slate-800 p-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{category.name}</p>
                        <p className="text-[11px] text-slate-400">{category.slug}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
      </div>
    </ProtectedRoute>
  );
}
