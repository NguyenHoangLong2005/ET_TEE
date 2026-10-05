'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Search, Navigation, Store } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type Shop = {
  id: number;
  name: string;
  address: string;
  phone: string;
};

export default function StoresPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient.get<Shop[]>('/api/shops/active')
      .then((data) => { if (!cancelled) setShops(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError('Không thể tải danh sách cửa hàng. Vui lòng thử lại sau.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredStores = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50/70 pt-6 pb-24">
      <div className="container mx-auto px-4 xl:px-8 max-w-5xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Danh sách cửa hàng</span>
        </div>

        {/* Hero Header */}
        <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl mb-10 shadow-md relative overflow-hidden border border-slate-200/80">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900">
              Hệ Thống Showroom ET.TEE
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Trải nghiệm không gian mua sắm hiện đại, thử đồ trực tiếp và nhận sự tư vấn tận tâm từ đội ngũ ET.TEE tại cửa hàng gần nhất.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md mb-8">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nhập tên đường, quận huyện hoặc tên cửa hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-amber-500 text-slate-900 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-500 text-sm">
            Đang tải danh sách cửa hàng...
          </div>
        ) : error ? (
          <div className="py-16 bg-white rounded-3xl border border-rose-200 text-center text-rose-600 text-sm">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredStores.length === 0 ? (
              <div className="col-span-2 py-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-500 text-sm space-y-3">
                <Store className="w-10 h-10 text-slate-300 mx-auto" />
                <p>{shops.length === 0 ? 'Hiện chưa có cửa hàng nào được công bố.' : 'Không tìm thấy cửa hàng ET.TEE nào phù hợp.'}</p>
              </div>
            ) : (
              filteredStores.map((store) => (
                <div
                  key={store.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 hover:border-amber-400 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-2 group-hover:text-amber-600 transition-colors">
                      <Store className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>{store.name}</span>
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{store.address}</span>
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 text-xs">
                    <a href={`tel:${store.phone?.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-amber-600 font-medium text-slate-500 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{store.phone}</span>
                    </a>

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 shrink-0 hover:scale-105"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Chỉ đường</span>
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </main>
  );
}
