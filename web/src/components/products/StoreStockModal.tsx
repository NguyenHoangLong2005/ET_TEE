'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Phone, Clock, Search, CheckCircle, AlertCircle } from 'lucide-react';

interface StoreStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  selectedColor?: string;
  selectedSize?: string;
}

const PROVINCES = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Hải Phòng',
  'Đà Nẵng',
  'Bắc Ninh',
  'Hải Dương',
  'Bình Dương',
  'Cần Thơ',
  'Quảng Ninh',
  'Thái Nguyên',
];

const STORES_DATABASE: Record<string, Array<{ name: string; address: string; phone: string; hours: string; stockStatus: 'available' | 'low' | 'out_of_stock'; sizesAvailable: string[] }>> = {
  'Hà Nội': [
    { name: 'ET.TEE Vincom Bà Triệu', address: 'Tầng 2, Vincom Center, 191 Bà Triệu, Q. Hai Bà Trưng, Hà Nội', phone: '0981 123 456', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL', '2XL'] },
    { name: 'ET.TEE Cầu Giấy', address: '175 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội', phone: '0982 234 567', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL'] },
    { name: 'ET.TEE Phạm Văn Đồng', address: '234 Phạm Văn Đồng, P. Cổ Nhuế 1, Q. Bắc Từ Liêm, Hà Nội', phone: '0983 345 678', hours: '08:00 - 22:00', stockStatus: 'low', sizesAvailable: ['M', 'L'] },
    { name: 'ET.TEE Hà Đông', address: '45 Trần Phú, P. Văn Quán, Q. Hà Đông, Hà Nội', phone: '0984 456 789', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL', '3XL'] },
  ],
  'TP. Hồ Chí Minh': [
    { name: 'ET.TEE Nguyễn Trãi Q1', address: '128 Nguyễn Trãi, P. Bến Thành, Q. 1, TP. HCM', phone: '0971 111 222', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL', '2XL'] },
    { name: 'ET.TEE Lê Văn Sỹ Q3', address: '350 Lê Văn Sỹ, P. 14, Q. 3, TP. HCM', phone: '0972 222 333', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL'] },
    { name: 'ET.TEE Quang Trung Gò Vấp', address: '567 Quang Trung, P. 10, Q. Gò Vấp, TP. HCM', phone: '0973 333 444', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['M', 'L', 'XL', '2XL'] },
  ],
  'Hải Phòng': [
    { name: 'ET.TEE Lê Hồng Phong', address: '12 Lê Hồng Phong, Q. Ngô Quyền, Hải Phòng', phone: '0961 888 999', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL'] },
  ],
  'Đà Nẵng': [
    { name: 'ET.TEE Nguyễn Văn Linh', address: '180 Nguyễn Văn Linh, Q. Thanh Khê, Đà Nẵng', phone: '0951 777 888', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL', '2XL'] },
  ],
  'Bắc Ninh': [
    { name: 'ET.TEE Trần Hưng Đạo', address: '88 Trần Hưng Đạo, TP. Bắc Ninh', phone: '0941 666 777', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL'] },
  ],
  'Hải Dương': [
    { name: 'ET.TEE Hồng Quang (Headquarter)', address: '45 Hồng Quang, TP. Hải Dương', phone: '0931 555 666', hours: '08:00 - 22:00', stockStatus: 'available', sizesAvailable: ['S', 'M', 'L', 'XL', '2XL', '3XL'] },
  ],
};

export default function StoreStockModal({
  isOpen,
  onClose,
  productName,
  selectedColor,
  selectedSize,
}: StoreStockModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('Hà Nội');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const stores = STORES_DATABASE[selectedProvince] || [];
  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Main Box */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] border border-gray-100 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase text-slate-900">Xem Cửa Hàng Còn Hàng</h2>
            <p className="text-xs text-gray-500 font-medium">
              Sản phẩm: <span className="text-slate-900 font-bold">{productName}</span> 
              {selectedSize && <span> • Size: <strong>{selectedSize}</strong></span>}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-slate-900 hover:text-white text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Row: Select Province & Search */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-1/2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Chọn Tỉnh / Thành phố</label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-1/2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tìm theo tên/địa chỉ</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nhập tên quận/huyện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-slate-900 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Stores List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredStores.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              Không tìm thấy cửa hàng ET.TEE nào có sẵn sản phẩm tại khu vực này.
            </div>
          ) : (
            filteredStores.map((store, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-gray-200 hover:border-amber-400 transition-colors bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{store.name}</h3>
                    {store.stockStatus === 'available' ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> Còn hàng
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> Số lượng ít
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{store.address}</span>
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-1">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {store.phone}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" /> {store.hours}</span>
                  </div>

                  <div className="pt-2 flex items-center gap-1 text-[11px]">
                    <span className="text-gray-400">Các size còn:</span>
                    {store.sizesAvailable.map(sz => (
                      <span key={sz} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sz === selectedSize ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {sz}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <a 
                    href={`tel:${store.phone.replace(/\s/g, '')}`}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl text-center transition-colors shadow-2xs"
                  >
                    Gọi Cửa Hàng
                  </a>
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial px-4 py-2 border border-gray-300 hover:border-slate-900 text-slate-800 font-bold text-xs rounded-xl text-center transition-colors"
                  >
                    Chỉ Đường
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center font-medium">
          Hotline hỗ trợ giữ hàng tại showroom: <strong>1900 1234</strong> (8:00 - 22:00)
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
