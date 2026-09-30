'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Clock, Search, Navigation, Store, Sparkles, CheckCircle2 } from 'lucide-react';

const STORES_DATA = [
  { city: 'Hà Nội', name: 'ET.TEE Vincom Bà Triệu', address: 'Tầng 2, Vincom Center, 191 Bà Triệu, Q. Hai Bà Trưng, Hà Nội', phone: '0981 123 456', hours: '08:00 - 22:00' },
  { city: 'Hà Nội', name: 'ET.TEE Cầu Giấy', address: '175 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội', phone: '0982 234 567', hours: '08:00 - 22:00' },
  { city: 'Hà Nội', name: 'ET.TEE Phạm Văn Đồng', address: '234 Phạm Văn Đồng, P. Cổ Nhuế 1, Q. Bắc Từ Liêm, Hà Nội', phone: '0983 345 678', hours: '08:00 - 22:00' },
  { city: 'Hà Nội', name: 'ET.TEE Hà Đông', address: '45 Trần Phú, P. Văn Quán, Q. Hà Đông, Hà Nội', phone: '0984 456 789', hours: '08:00 - 22:00' },
  { city: 'Hà Nội', name: 'ET.TEE Long Biên', address: '280 Nguyễn Văn Cừ, P. Ngọc Lâm, Q. Long Biên, Hà Nội', phone: '0985 567 890', hours: '08:00 - 22:00' },
  
  { city: 'TP. Hồ Chí Minh', name: 'ET.TEE Nguyễn Trãi Q1', address: '128 Nguyễn Trãi, P. Bến Thành, Q. 1, TP. HCM', phone: '0971 111 222', hours: '08:00 - 22:00' },
  { city: 'TP. Hồ Chí Minh', name: 'ET.TEE Lê Văn Sỹ Q3', address: '350 Lê Văn Sỹ, P. 14, Q. 3, TP. HCM', phone: '0972 222 333', hours: '08:00 - 22:00' },
  { city: 'TP. Hồ Chí Minh', name: 'ET.TEE Quang Trung Gò Vấp', address: '567 Quang Trung, P. 10, Q. Gò Vấp, TP. HCM', phone: '0973 333 444', hours: '08:00 - 22:00' },
  { city: 'TP. Hồ Chí Minh', name: 'ET.TEE Võ Văn Ngân Thủ Đức', address: '198 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP. HCM', phone: '0974 444 555', hours: '08:00 - 22:00' },

  { city: 'Hải Phòng', name: 'ET.TEE Lê Hồng Phong', address: '12 Lê Hồng Phong, Q. Ngô Quyền, Hải Phòng', phone: '0961 888 999', hours: '08:00 - 22:00' },
  { city: 'Hải Phòng', name: 'ET.TEE Trần Nguyên Hãn', address: '240 Trần Nguyên Hãn, Q. Lê Chân, Hải Phòng', phone: '0962 777 888', hours: '08:00 - 22:00' },

  { city: 'Đà Nẵng', name: 'ET.TEE Nguyễn Văn Linh', address: '180 Nguyễn Văn Linh, Q. Thanh Khê, Đà Nẵng', phone: '0951 777 888', hours: '08:00 - 22:00' },
  { city: 'Đà Nẵng', name: 'ET.TEE Lê Duẩn', address: '320 Lê Duẩn, Q. Hải Châu, Đà Nẵng', phone: '0952 666 777', hours: '08:00 - 22:00' },

  { city: 'Bắc Ninh', name: 'ET.TEE Trần Hưng Đạo', address: '88 Trần Hưng Đạo, TP. Bắc Ninh', phone: '0941 666 777', hours: '08:00 - 22:00' },
  
  { city: 'Hải Dương', name: 'ET.TEE Hồng Quang (Headquarter)', address: '45 Hồng Quang, TP. Hải Dương', phone: '0931 555 666', hours: '08:00 - 22:00' },

  { city: 'Cần Thơ', name: 'ET.TEE 3 Tháng 2', address: '95 Đường 3 Tháng 2, Q. Ninh Kiều, Cần Thơ', phone: '0921 444 555', hours: '08:00 - 22:00' },
];

const CITIES = ['Tất cả', 'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Bắc Ninh', 'Hải Dương', 'Cần Thơ'];

export default function StoresPage() {
  const [selectedCity, setSelectedCity] = useState('Tất cả');
  const [search, setSearch] = useState('');

  const filteredStores = STORES_DATA.filter((s) => {
    const matchCity = selectedCity === 'Tất cả' || s.city === selectedCity;
    const matchQuery = s.name.toLowerCase().includes(search.toLowerCase()) || 
                       s.address.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchQuery;
  });

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
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-50 text-amber-900 text-xs font-bold uppercase tracking-widest rounded-full border border-amber-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Hệ Thống ET.TEE Việt Nam</span>
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900">
              200+ Showroom Trên Toàn Quốc
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Trải nghiệm không gian mua sắm hiện đại, thử đồ trực tiếp và nhận sự tư vấn tận tâm từ đội ngũ ET.TEE tại cửa hàng gần nhất.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Search Input */}
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

            {/* City Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {CITIES.map((city) => {
                const count = city === 'Tất cả' 
                  ? STORES_DATA.length 
                  : STORES_DATA.filter(s => s.city === city).length;

                return (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedCity === city
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{city}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${selectedCity === city ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* Store Grid Result */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredStores.length === 0 ? (
            <div className="col-span-2 py-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-500 text-sm space-y-3">
              <Store className="w-10 h-10 text-slate-300 mx-auto" />
              <p>Không tìm thấy cửa hàng ET.TEE nào tại khu vực này.</p>
              <button 
                onClick={() => { setSelectedCity('Tất cả'); setSearch(''); }} 
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Xem tất cả cửa hàng
              </button>
            </div>
          ) : (
            filteredStores.map((store, index) => (
              <div 
                key={index} 
                className="bg-white p-6 rounded-3xl border border-slate-200/80 hover:border-amber-400 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/80">
                      Showroom {store.city}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Đang mở cửa
                    </span>
                  </div>

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
                  <div className="space-y-1 text-slate-500 text-[11px]">
                    <a href={`tel:${store.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-amber-600 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{store.phone}</span>
                    </a>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{store.hours}</span>
                    </div>
                  </div>

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

      </div>
    </main>
  );
}

