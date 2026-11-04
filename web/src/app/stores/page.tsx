'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Navigation, Store } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type Shop = {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
};

// He thong chi co mot cua hang: trang nay hien dia chi, dien thoai va ban do
// cua cua hang do (truoc day la danh sach chi nhanh).
export default function StoresPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient.get<Shop>('/api/shops/current')
      .then((data) => { if (!cancelled) setShop(data ?? null); })
      .catch(() => { if (!cancelled) setError('Không thể tải thông tin cửa hàng. Vui lòng thử lại sau.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const address = shop?.address?.trim() || '';
  const phone = shop?.phone?.trim() || '';

  return (
    <main className="min-h-screen bg-slate-50/70 pt-6 pb-24">
      <div className="container mx-auto px-4 xl:px-8 max-w-5xl">

        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Cửa hàng</span>
        </div>

        <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl mb-8 shadow-md relative overflow-hidden border border-slate-200/80">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900">
              Cửa hàng ET.TEE
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Ghé cửa hàng để thử đồ trực tiếp và nhận tư vấn từ đội ngũ ET.TEE.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-500 text-sm">
            Đang tải thông tin cửa hàng...
          </div>
        ) : error || !shop ? (
          <div className="py-16 bg-white rounded-3xl border border-rose-200 text-center text-rose-600 text-sm">
            {error || 'Chưa có thông tin cửa hàng.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Store className="w-5 h-5 text-primary-600 shrink-0" />
                <span>{shop.name}</span>
              </h2>
              {address && (
                <p className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{address}</span>
                </p>
              )}
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-sm text-slate-600 hover:text-primary-600 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{phone}</span>
                </a>
              )}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                {phone && (
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="px-4 py-2.5 border border-slate-300 hover:border-slate-900 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Gọi cửa hàng
                  </a>
                )}
                {address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-primary/20"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Chỉ đường
                  </a>
                )}
              </div>
            </div>

            {address && (
              <div className="rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs min-h-[280px] bg-slate-100">
                <iframe
                  title={`Bản đồ ${shop.name}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                  className="w-full h-full min-h-[280px] border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
