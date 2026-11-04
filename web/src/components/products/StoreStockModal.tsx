'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Phone } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface StoreStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  selectedColor?: string;
  selectedSize?: string;
}

type Shop = {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
};

export default function StoreStockModal({
  isOpen,
  onClose,
  productName,
  selectedColor,
  selectedSize,
}: StoreStockModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // He thong chi co mot cua hang.
      apiClient.get<Shop>('/api/shops/current')
        .then((data) => setShops(data ? [data] : []))
        .catch(() => setError('Không thể tải danh sách cửa hàng.'))
        .finally(() => setLoading(false));
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const filteredStores = shops;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Box */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] border border-slate-100 my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase text-slate-900">Cửa Hàng ET.TEE</h2>
            <p className="text-xs text-slate-500 font-medium">
              Sản phẩm: <span className="text-slate-900 font-bold">{productName}</span>
              {selectedSize && <span> • Size: <strong>{selectedSize}</strong></span>}
              {selectedColor && <span> • Màu: <strong>{selectedColor}</strong></span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Honesty notice: we do not have live per-store stock data (see
           WarehouseService/ProductVariant split — online stock and each
           branch's physical inventory aren't linked), so we no longer
           fabricate "còn hàng"/size-availability per store. */}
        <div className="px-6 pt-4 text-[11px] text-amber-800 bg-amber-50 border-b border-amber-100 py-2">
          Vui lòng gọi cửa hàng để xác nhận còn đúng size/màu trước khi ghé mua.
        </div>

        {/* Stores List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">Đang tải thông tin cửa hàng...</div>
          ) : error ? (
            <div className="py-12 text-center text-rose-600 text-xs">{error}</div>
          ) : filteredStores.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Chưa có thông tin cửa hàng.
            </div>
          ) : (
            filteredStores.map((store) => (
              <div key={store.id} className="p-4 rounded-2xl border border-slate-200 hover:border-amber-400 transition-colors bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-bold text-slate-900 text-sm">{store.name}</h3>

                  <p className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{store.address || 'Đang cập nhật địa chỉ'}</span>
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {store.phone}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <a
                    href={`tel:${store.phone?.replace(/\s/g, '')}`}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl text-center transition-colors shadow-2xs"
                  >
                    Gọi Cửa Hàng
                  </a>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(store.address || store.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 hover:border-slate-900 text-slate-800 font-bold text-xs rounded-xl text-center transition-colors"
                  >
                    Chỉ Đường
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center font-medium">
          Cửa hàng mở cửa 8:00 - 22:00 hằng ngày
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
