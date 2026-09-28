"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import { toast } from "sonner";
import { 
  Search, Plus, Trash2, ArrowUp, ArrowDown, GripVertical, 
  Save, Layout, Smartphone, Crown, Zap, Star, Loader2, X, Check
} from "lucide-react";
// Types
type SectionType = "HOMEPAGE_FEATURED" | "HOMEPAGE_NEW" | "BESTSELLER" | "FLASH_SALE" | "RECOMMENDED";

interface ProductPlacement {
  id: string;
  productId: string;
  section: SectionType;
  displayOrder: number;
  product?: {
    id?: number;
    name?: string;
    sku?: string;
    imageUrl?: string;
    price?: number;
    salePrice?: number;
  };
}

interface ProductItem {
  id: number;
  name: string;
  slug?: string;
  price?: number;
  salePrice?: number;
  images?: { imageUrl: string }[];
}

const SECTIONS: { id: SectionType; label: string; icon: React.ReactNode }[] = [
  { id: "HOMEPAGE_FEATURED", label: "Nổi bật", icon: <Crown className="w-4 h-4" /> },
  { id: "HOMEPAGE_NEW", label: "Hàng mới", icon: <Star className="w-4 h-4" /> },
  { id: "BESTSELLER", label: "Bán chạy", icon: <Layout className="w-4 h-4" /> },
  { id: "FLASH_SALE", label: "Flash Sale", icon: <Zap className="w-4 h-4" /> },
  { id: "RECOMMENDED", label: "Đề xuất", icon: <Smartphone className="w-4 h-4" /> },
];

export default function ProductPlacementPage() {
  const [activeSection, setActiveSection] = useState<SectionType>("HOMEPAGE_FEATURED");
  const [placements, setPlacements] = useState<ProductPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const fetchPlacements = async (section: SectionType) => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`${baseUrl}/api/staff/marketing/placements?section=${section}`, { headers });
      if (!res.ok) throw new Error("Lỗi khi tải vị trí sản phẩm");
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      setPlacements(items.sort((a: ProductPlacement, b: ProductPlacement) => a.displayOrder - b.displayOrder));
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải danh sách vị trí sản phẩm");
      setPlacements([]);
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  };

  useEffect(() => {
    fetchPlacements(activeSection);
  }, [activeSection]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...placements];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    
    newItems.forEach((item, idx) => {
      item.displayOrder = idx + 1;
    });
    
    setPlacements(newItems);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === placements.length - 1) return;
    const newItems = [...placements];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    
    newItems.forEach((item, idx) => {
      item.displayOrder = idx + 1;
    });
    
    setPlacements(newItems);
    setHasChanges(true);
  };

  const handleRemove = async (id: string) => {
    const newItems = placements.filter(p => p.id !== id);
    newItems.forEach((item, idx) => { item.displayOrder = idx + 1; });
    setPlacements(newItems);
    setHasChanges(true);

    try {
      const url = `${getApiBaseUrl()}/api/staff/marketing/placements/${id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders() as Record<string, string>,
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      toast.success("Đã xóa khỏi vị trí hiển thị");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xóa vị trí sản phẩm");
      fetchPlacements(activeSection);
    }
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const url = `${getApiBaseUrl()}/api/staff/marketing/placements/reorder`;
      const orderedIds = placements.map(p => Number(p.id));
      
      const res = await fetch(url, {
        method: "PUT",
        headers: { ...(getAuthHeaders() as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ section: activeSection, orderedIds }),
      });
      
      if (!res.ok) throw new Error("Lưu thứ tự thất bại");
      toast.success("Đã lưu thứ tự hiển thị thành công");
      setHasChanges(false);
      await fetchPlacements(activeSection);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi lưu thứ tự hiển thị");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const searchProducts = async (keyword: string) => {
    setSearchProduct(keyword);
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/products?search=${encodeURIComponent(keyword.trim())}&size=8`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.data?.items ?? data?.content ?? data?.data ?? []);
        setSearchResults(items);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProduct) return;
    try {
      const url = `${getApiBaseUrl()}/api/staff/marketing/placements`;
      const res = await fetch(url, {
        method: "POST",
        headers: { ...(getAuthHeaders() as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          section: activeSection,
          displayOrder: placements.length + 1
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Thêm sản phẩm thất bại");
      }

      toast.success("Đã thêm sản phẩm vào vị trí hiển thị");
      setIsAddModalOpen(false);
      setSelectedProduct(null);
      setSearchProduct("");
      setSearchResults([]);
      await fetchPlacements(activeSection);
    } catch (err: any) {
      toast.error(err?.message || "Không thể thêm sản phẩm vào vị trí này");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Vị Trí Hiển Thị Sản Phẩm
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Tùy chỉnh thứ tự xuất hiện của sản phẩm trên trang chủ và các phân mục đề xuất
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                {isSavingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu thứ tự
              </button>
            )}
            <button
              onClick={() => {
                setIsAddModalOpen(true);
                setSelectedProduct(null);
                setSearchProduct("");
                setSearchResults([]);
              }}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {SECTIONS.map(section => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
              <p className="text-sm">Đang tải danh sách vị trí hiển thị...</p>
            </div>
          ) : placements.length === 0 ? (
            <div className="text-center py-16">
              <Layout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Chưa có sản phẩm nào ở mục này</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                Nhấn "Thêm sản phẩm" để chọn các mặt hàng nổi bật hiển thị tại vị trí này.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-xl text-xs font-semibold"
              >
                Thêm sản phẩm ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {placements.map((item, index) => {
                const prod = item.product;
                const img = prod?.imageUrl || "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&q=80";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <GripVertical className="w-5 h-5 cursor-grab" />
                        <span className="w-6 text-center font-bold text-slate-600 text-sm">
                          #{item.displayOrder}
                        </span>
                      </div>
                      <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={img}
                          alt={prod?.name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{prod?.name || "Sản phẩm #" + item.productId}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span>Mã: {prod?.sku || item.productId}</span>
                          {prod?.price && (
                            <span>· {prod.price.toLocaleString("vi-VN")}₫</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-2 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-200 transition"
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === placements.length - 1}
                        className="p-2 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-200 transition"
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition ml-2"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Thêm Sản Phẩm vào {SECTIONS.find(s => s.id === activeSection)?.label}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Tìm kiếm sản phẩm thực tế từ hệ thống</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Tìm kiếm Sản phẩm</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nhập tên sản phẩm hoặc mã..."
                    value={searchProduct}
                    onChange={(e) => searchProducts(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-purple-600" />
                  )}
                </div>
              </div>

              {/* Product Selection List */}
              <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-slate-100">
                {searchResults.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">
                    {searchProduct.trim() ? "Không tìm thấy sản phẩm phù hợp" : "Nhập từ khóa để tìm sản phẩm..."}
                  </p>
                ) : (
                  searchResults.map((prod) => {
                    const isSelected = selectedProduct?.id === prod.id;
                    const img = (prod.images && prod.images.length > 0) ? prod.images[0].imageUrl : "";
                    return (
                      <div
                        key={prod.id}
                        onClick={() => setSelectedProduct(prod)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${
                          isSelected ? "bg-purple-50 border border-purple-200" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                          {img ? (
                            <img src={img} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">No img</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {prod.price ? `${prod.price.toLocaleString("vi-VN")}₫` : "—"}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleAddProduct}
                disabled={!selectedProduct}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Thêm vào danh sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
