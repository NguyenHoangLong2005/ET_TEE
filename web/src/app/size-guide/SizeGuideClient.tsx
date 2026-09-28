'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Ruler, Calculator, Sparkles, CheckCircle2, ShieldCheck, HelpCircle, RefreshCcw, Truck } from 'lucide-react';

export default function SizeGuideClient() {
  const [activeTab, setActiveTab] = useState<'nam' | 'nu' | 'tre-em' | 'phu-kien'>('nam');
  const [subType, setSubType] = useState<'ao' | 'quan' | 'vay'>('ao');

  // Calculator State
  const [height, setHeight] = useState<number>(170);
  const [weight, setWeight] = useState<number>(65);
  const [fit, setFit] = useState<'slim' | 'regular' | 'loose'>('regular');
  const [suggestedSize, setSuggestedSize] = useState<string | null>(null);

  const calculateSize = (e: React.FormEvent) => {
    e.preventDefault();
    let size = 'M';
    if (weight < 54 && height <= 165) size = 'S';
    else if (weight <= 62 && height <= 168) size = 'M';
    else if (weight <= 70 && height <= 174) size = 'L';
    else if (weight <= 78 && height <= 180) size = 'XL';
    else if (weight <= 86) size = '2XL';
    else size = '3XL';

    if (fit === 'loose' && size !== '3XL') {
      const order = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
      size = order[order.indexOf(size) + 1] || size;
    }
    setSuggestedSize(size);
  };

  return (
    <div className="space-y-12">
      
      {/* 1. Value Badges Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <RefreshCcw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Đổi trả 30 ngày</h3>
            <p className="text-xs text-slate-500">Đổi size tận nhà hoàn toàn miễn phí</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Chuẩn Form Dáng Việt</h3>
            <p className="text-xs text-slate-500">Đo đạc thực tế trên 100.000 vóc dáng</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Hỗ trợ 200+ Cửa hàng</h3>
            <p className="text-xs text-slate-500">Thử size trực tiếp trên toàn quốc</p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Calculator Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase text-slate-900">Công Cụ Gợi Ý Size Thông Minh</h2>
            <p className="text-xs text-slate-500">Nhập chiều cao & cân nặng để hệ thống tự động tính toán size phù hợp nhất</p>
          </div>
        </div>

        <form onSubmit={calculateSize} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Chiều cao (cm)</label>
            <input
              type="number"
              min="100"
              max="210"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl font-bold text-sm outline-none focus:border-amber-500"
              placeholder="170"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Cân nặng (kg)</label>
            <input
              type="number"
              min="30"
              max="150"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl font-bold text-sm outline-none focus:border-amber-500"
              placeholder="65"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Gu phom dáng</label>
            <select
              value={fit}
              onChange={(e) => setFit(e.target.value as any)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl font-bold text-sm outline-none focus:border-amber-500 bg-white"
            >
              <option value="slim">Ôm vừa (Slim Fit)</option>
              <option value="regular">Thoải mái (Regular)</option>
              <option value="loose">Rộng rãi (Loose / Oversize)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Tính Size Ngay</span>
          </button>
        </form>

        {suggestedSize && (
          <div className="mt-6 p-6 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest block text-slate-900">Kích Thước Khuyên Dùng</span>
              <div className="text-3xl font-black tracking-tight text-slate-950">SIZE {suggestedSize}</div>
              <p className="text-xs text-slate-900 font-medium mt-1">Phù hợp hoàn hảo với chiều cao {height}cm và cân nặng {weight}kg</p>
            </div>
            <Link
              href="/products"
              className="px-6 py-3 bg-slate-950 hover:bg-black text-white font-bold uppercase text-xs tracking-wider rounded-full shadow-md whitespace-nowrap transition-transform hover:scale-105"
            >
              Mua sắm ngay với Size {suggestedSize}
            </Link>
          </div>
        )}
      </div>

      {/* 3. Detailed Category Size Tables */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black uppercase text-slate-900">Bảng Số Đo Chi Tiết Phân Theo Danh Mục</h2>
            <p className="text-xs text-slate-500">Tra cứu chi tiết các vòng ngực, eo, mông, rộng vai</p>
          </div>

          {/* Main Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'nam', label: 'Nam' },
              { id: 'nu', label: 'Nữ' },
              { id: 'tre-em', label: 'Trẻ Em' },
              { id: 'phu-kien', label: 'Phụ Kiện' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id as any)}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === cat.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtype selectors */}
        {activeTab === 'nam' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSubType('ao')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                subType === 'ao' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Áo Sơ Mi, Polo, Áo Thun Nam
            </button>
            <button
              onClick={() => setSubType('quan')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                subType === 'quan' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Quần Tây, Jeans, Short Nam
            </button>
          </div>
        )}

        {/* Tables */}
        {activeTab === 'nam' && subType === 'ao' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 border-r border-slate-700">Kích thước</th>
                  <th className="py-3 px-3 border-r border-slate-700">S</th>
                  <th className="py-3 px-3 border-r border-slate-700">M</th>
                  <th className="py-3 px-3 border-r border-slate-700">L</th>
                  <th className="py-3 px-3 border-r border-slate-700">XL</th>
                  <th className="py-3 px-3 border-r border-slate-700">2XL</th>
                  <th className="py-3 px-3 border-r border-slate-700">3XL</th>
                  <th className="py-3 px-3 border-r border-slate-700">4XL</th>
                  <th className="py-3 px-3">5XL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-slate-800">
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Chiều cao (cm)</td><td className="border-r">160–165</td><td className="border-r">160–165</td><td className="border-r">166–172</td><td className="border-r">172–177</td><td className="border-r">177–184</td><td className="border-r">184–192</td><td className="border-r">184–192</td><td>184–192</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Cân nặng (kg)</td><td className="border-r">50–54</td><td className="border-r">55–61</td><td className="border-r">62–68</td><td className="border-r">69–75</td><td className="border-r">76–84</td><td className="border-r">85–90</td><td className="border-r">90–98</td><td>99–105</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Rộng vai (cm)</td><td className="border-r">41</td><td className="border-r">42</td><td className="border-r">43.5</td><td className="border-r">45</td><td className="border-r">46.5</td><td className="border-r">48</td><td className="border-r">49</td><td>50</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Vòng ngực (cm)</td><td className="border-r">82–86</td><td className="border-r">86–90</td><td className="border-r">90–94</td><td className="border-r">94–98</td><td className="border-r">98–103</td><td className="border-r">103–108</td><td className="border-r">108–113</td><td>114–120</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'nam' && subType === 'quan' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 border-r border-slate-700">Size quần</th>
                  <th className="py-3 px-3 border-r border-slate-700">29 (S)</th>
                  <th className="py-3 px-3 border-r border-slate-700">30 (M)</th>
                  <th className="py-3 px-3 border-r border-slate-700">31 (L)</th>
                  <th className="py-3 px-3 border-r border-slate-700">32 (XL)</th>
                  <th className="py-3 px-3 border-r border-slate-700">33 (2XL)</th>
                  <th className="py-3 px-3">34 (3XL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-slate-800">
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Chiều cao (cm)</td><td className="border-r">160–165</td><td className="border-r">163–168</td><td className="border-r">166–172</td><td className="border-r">170–176</td><td className="border-r">175–182</td><td>178–186</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Cân nặng (kg)</td><td className="border-r">52–56</td><td className="border-r">57–63</td><td className="border-r">64–70</td><td className="border-r">71–77</td><td className="border-r">78–84</td><td>85–92</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Vòng bụng (cm)</td><td className="border-r">73–75</td><td className="border-r">76–78</td><td className="border-r">79–81</td><td className="border-r">82–84</td><td className="border-r">85–88</td><td>89–92</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'nu' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 border-r border-slate-700">Kích thước</th>
                  <th className="py-3 px-3 border-r border-slate-700">S</th>
                  <th className="py-3 px-3 border-r border-slate-700">M</th>
                  <th className="py-3 px-3 border-r border-slate-700">L</th>
                  <th className="py-3 px-3 border-r border-slate-700">XL</th>
                  <th className="py-3 px-3">2XL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-slate-800">
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Chiều cao (cm)</td><td className="border-r">150–156</td><td className="border-r">156–162</td><td className="border-r">162–166</td><td className="border-r">165–170</td><td>168–174</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Cân nặng (kg)</td><td className="border-r">40–47</td><td className="border-r">48–53</td><td className="border-r">54–59</td><td className="border-r">60–65</td><td>66–72</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Vòng ngực (cm)</td><td className="border-r">80–84</td><td className="border-r">84–88</td><td className="border-r">88–92</td><td className="border-r">92–96</td><td>96–100</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Vòng eo (cm)</td><td className="border-r">62–66</td><td className="border-r">66–70</td><td className="border-r">70–74</td><td className="border-r">74–78</td><td>78–82</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tre-em' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 border-r border-slate-700">Size bé</th>
                  <th className="py-3 px-3 border-r border-slate-700">100</th>
                  <th className="py-3 px-3 border-r border-slate-700">110</th>
                  <th className="py-3 px-3 border-r border-slate-700">120</th>
                  <th className="py-3 px-3 border-r border-slate-700">130</th>
                  <th className="py-3 px-3 border-r border-slate-700">140</th>
                  <th className="py-3 px-3">150</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-slate-800">
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Ước tính tuổi</td><td className="border-r">2–3 tuổi</td><td className="border-r">4–5 tuổi</td><td className="border-r">6–7 tuổi</td><td className="border-r">8–9 tuổi</td><td className="border-r">10–11 tuổi</td><td>12–13 tuổi</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Chiều cao (cm)</td><td className="border-r">90–100</td><td className="border-r">100–110</td><td className="border-r">110–120</td><td className="border-r">120–130</td><td className="border-r">130–140</td><td>140–150</td></tr>
                <tr><td className="py-3.5 px-3 font-bold bg-slate-50 border-r text-left">Cân nặng (kg)</td><td className="border-r">12–15</td><td className="border-r">15–18</td><td className="border-r">18–23</td><td className="border-r">23–28</td><td className="border-r">28–34</td><td>34–40</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'phu-kien' && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-slate-900 text-xs text-center">
            <h3 className="font-bold text-sm mb-2">Phụ Kiện ET.TEE Freesize</h3>
            <p className="text-slate-600 max-w-lg mx-auto">
              Các sản phẩm Mũ nón, Tất vớ, Khăn quàng, Thắt lưng da của ET.TEE được thiết kế Freesize co giãn cao cấp, 
              dễ dàng điều chỉnh vừa vặn với mọi vóc dáng người dùng.
            </p>
          </div>
        )}
      </div>

      {/* 4. FAQs Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <HelpCircle className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-black uppercase text-slate-900">Câu Hỏi Thường Gặp Về Size Số</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-slate-600">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-2">Nếu số đo của tôi ở giữa 2 size thì chọn size nào?</h3>
            <p>
              Nếu số đo của bạn nằm ở mốc giữa 2 size (ví dụ chiều cao vừa M nhưng cân nặng chớm L), 
              ET.TEE khuyên bạn nên chọn <strong>Size lớn hơn (Size L)</strong> để đảm bảo sự thoải mái tuyệt đối khi di chuyển và giặt giũ.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-2">Nếu mua về mặc không vừa size có được đổi lại không?</h3>
            <p>
              Hoàn toàn ĐƯỢC! ET.TEE áp dụng chính sách <strong>đổi trả 30 ngày hoàn toàn miễn phí</strong>. 
              Bạn có thể đem sản phẩm ra bất kỳ cửa hàng ET.TEE nào gần nhất hoặc yêu cầu shipper đến tận nhà đổi size cho bạn.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

