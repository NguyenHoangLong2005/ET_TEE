'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, Search, ChevronDown, ChevronUp, ShoppingBag, Truck, RefreshCcw, Ruler, Award } from 'lucide-react';

const FAQ_DATA = [
  {
    cat: 'order',
    catName: 'Đặt Hàng & Thanh Toán',
    icon: ShoppingBag,
    items: [
      { q: 'Làm thế nào để đặt hàng tại website ET.TEE?', a: 'Bạn chỉ cần chọn sản phẩm yêu thích, chọn màu sắc & kích cỡ, bấm "Thêm vào giỏ" hoặc "Mua ngay", sau đó điền thông tin người nhận và lựa chọn phương thức thanh toán (COD hoặc chuyển khoản).' },
      { q: 'ET.TEE hỗ trợ những hình thức thanh toán nào?', a: 'Chúng tôi hỗ trợ Thanh toán khi nhận hàng (COD), Chuyển khoản ngân hàng qua mã QR (VietQR), Thẻ ATM/Visa/Mastercard và Ví MoMo/ZaloPay.' },
      { q: 'Tôi có thể hủy hoặc sửa thông tin đơn hàng đã đặt không?', a: 'Nếu đơn hàng chưa chuyển sang trạng thái "Đang giao", bạn có thể liên hệ ngay Hotline 1900 1234 để chuyên viên hỗ trợ điều chỉnh miễn phí.' },
    ]
  },
  {
    cat: 'shipping',
    catName: 'Giao Hàng & Phí Ship',
    icon: Truck,
    items: [
      { q: 'Phí giao hàng tại ET.TEE tính như thế nào?', a: 'MIỄN PHÍ VẬN CHUYỂN cho tất cả các đơn hàng từ 499.000đ trở lên trên toàn quốc. Đơn hàng dưới 499.000đ có phí giao hàng cố định là 20.000đ.' },
      { q: 'Bao lâu thì tôi nhận được hàng?', a: 'Tại Hà Nội & TP.HCM: nhận hàng trong 1-2 ngày. Các tỉnh thành khác: nhận hàng từ 2-4 ngày làm việc. ET.TEE cũng hỗ trợ giao hàng hỏa tốc 2h tại khu vực nội thành.' },
      { q: 'Tôi có được kiểm tra hàng trước khi thanh toán không?', a: 'CÓ! ET.TEE hỗ trợ 100% khách hàng đồng kiểm (mở hộp xem sản phẩm) trước khi thanh toán cho nhân viên giao hàng.' },
    ]
  },
  {
    cat: 'return',
    catName: 'Chính Sách Đổi Trả 30 Ngày',
    icon: RefreshCcw,
    items: [
      { q: 'Chính sách đổi trả 30 ngày áp dụng ra sao?', a: 'Trong vòng 30 ngày kể từ khi nhận hàng, nếu sản phẩm chưa qua sử dụng, còn nguyên tem mác, bạn có thể đổi size, đổi màu hoặc đổi mẫu khác hoàn toàn miễn phí.' },
      { q: 'Tôi có thể đổi hàng tại cửa hàng trực tiếp không?', a: 'Có! Bạn có thể mang sản phẩm tới bất kỳ cửa hàng nào trong hệ thống 200+ showroom ET.TEE trên toàn quốc để đổi hàng trực tiếp.' },
      { q: 'Nếu đổi trả qua bưu điện thì ai trả phí ship?', a: 'ET.TEE sẽ hỗ trợ phí ship 2 chiều nếu lỗi do sản phẩm bị chật size hoặc giao sai mẫu. Trường hợp khách muốn đổi mẫu theo sở thích, khách hàng hỗ trợ phí gửi hàng.' },
    ]
  },
  {
    cat: 'size',
    catName: 'Hướng Dẫn Chọn Size',
    icon: Ruler,
    items: [
      { q: 'Làm sao để biết mình mặc vừa size nào?', a: 'Bạn có thể sử dụng công cụ "Tính size tự động" tại trang Hướng dẫn chọn size hoặc mở Modal Chọn size ngay tại trang chi tiết sản phẩm để nhận gợi ý chuẩn xác theo chiều cao & cân nặng.' },
      { q: 'Size áo sơ mi ET.TEE là phom Slim Fit hay Regular?', a: 'Hầu hết sơ mi nam ET.TEE được thiết kế phom Slim Fit ôm nhẹ hiện đại. Nếu thích mặc thoải mái, bạn nên tăng lên 1 size.' },
    ]
  },
];

export default function FAQPage() {
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-5xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Câu hỏi thường gặp (FAQ)</span>
        </div>

        {/* Hero Header */}
        <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl mb-10 shadow-md relative overflow-hidden border border-slate-200/80">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-3.5 py-1 bg-amber-50 text-amber-900 text-xs font-bold uppercase tracking-widest rounded-full mb-4 border border-amber-200 shadow-2xs">
              Trung Tâm Trợ Giúp ET.TEE
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900 mb-4">
              Câu Hỏi Thường Gặp
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Giải đáp nhanh chóng các thắc mắc về đơn hàng, quy trình giao hàng, chính sách đổi trả 30 ngày và hướng dẫn chọn kích cỡ.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nhập từ khóa câu hỏi cần tìm (ví dụ: đổi trả, phí ship, chọn size...)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 text-slate-900"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <button
              onClick={() => setActiveCat('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCat === 'all' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả chủ đề
            </button>
            {FAQ_DATA.map(cat => (
              <button
                key={cat.cat}
                onClick={() => setActiveCat(cat.cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCat === cat.cat ? 'bg-amber-500 text-slate-950' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.catName}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Categories Accordion */}
        <div className="space-y-8">
          {FAQ_DATA.filter(c => activeCat === 'all' || activeCat === c.cat).map(section => {
            const Icon = section.icon;
            const filteredItems = section.items.filter(item =>
              item.q.toLowerCase().includes(search.toLowerCase()) ||
              item.a.toLowerCase().includes(search.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.cat} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-black uppercase text-slate-900">{section.catName}</h2>
                </div>

                <div className="divide-y divide-gray-100">
                  {filteredItems.map((item, idx) => {
                    const itemKey = `${section.cat}_${idx}`;
                    const isOpen = openItems[itemKey];

                    return (
                      <div key={idx} className="py-3">
                        <button
                          onClick={() => toggleItem(itemKey)}
                          className="w-full flex items-center justify-between text-left font-bold text-slate-900 text-xs sm:text-sm hover:text-amber-600 transition-colors py-1"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-amber-600">Q.</span>
                            {item.q}
                          </span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                        </button>

                        {isOpen && (
                          <div className="mt-2 pl-6 pr-2 text-xs text-slate-700 leading-relaxed bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 animate-in fade-in-50">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
