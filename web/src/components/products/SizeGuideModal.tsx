'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCcw, Sparkles, CheckCircle2, Ruler, Calculator, ShieldCheck, ChevronRight } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSize?: (size: string) => void;
  defaultCategory?: 'nam' | 'nu' | 'tre-em' | 'phu-kien';
}

type MainCategory = 'nam' | 'nu' | 'tre-em' | 'phu-kien';

export default function SizeGuideModal({
  isOpen,
  onClose,
  onSelectSize,
  defaultCategory = 'nam',
}: SizeGuideModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<MainCategory>(defaultCategory);
  const [subType, setSubType] = useState<string>('ao');
  const [activeView, setActiveView] = useState<'table' | 'calculator' | 'guide'>('table');

  // Calculator inputs
  const [height, setHeight] = useState<number>(170);
  const [weight, setWeight] = useState<number>(65);
  const [fitPreference, setFitPreference] = useState<'slim' | 'regular' | 'loose'>('regular');
  const [calculatedSize, setCalculatedSize] = useState<string | null>(null);
  const [calculatedReason, setCalculatedReason] = useState<string>('');

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

  // Calculate size logic
  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    let size = 'M';
    let reason = '';

    if (activeTab === 'nam') {
      if (weight < 54 && height <= 165) {
        size = 'S';
        reason = 'Phù hợp với vóc dáng nhỏ gọn (Dưới 54kg & dưới 1m65)';
      } else if (weight <= 62 && height <= 168) {
        size = 'M';
        reason = 'Vừa vặn chuẩn dáng người Việt (55kg - 62kg & 1m60 - 1m68)';
      } else if (weight <= 70 && height <= 174) {
        size = 'L';
        reason = 'Thoải mái và chuẩn dáng (63kg - 70kg & 1m66 - 1m74)';
      } else if (weight <= 78 && height <= 180) {
        size = 'XL';
        reason = 'Rộng rãi phong cách (71kg - 78kg & 1m72 - 1m80)';
      } else if (weight <= 86 && height <= 185) {
        size = '2XL';
        reason = 'Phom dáng lớn 2XL (79kg - 86kg & 1m77 - 1m85)';
      } else if (weight <= 94) {
        size = '3XL';
        reason = 'Phom ngoại cỡ 3XL (87kg - 94kg)';
      } else if (weight <= 102) {
        size = '4XL';
        reason = 'Phom thoải mái 4XL (95kg - 102kg)';
      } else {
        size = '5XL';
        reason = 'Phom cực đại 5XL (Trên 103kg)';
      }

      if (fitPreference === 'loose' && ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].includes(size)) {
        const order = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
        const nextIdx = order.indexOf(size) + 1;
        if (nextIdx < order.length) {
          size = order[nextIdx];
          reason += ' • Đã tăng 1 size theo sở thích mặc rộng rãi';
        }
      }
    } else if (activeTab === 'nu') {
      if (weight < 45 && height <= 155) {
        size = 'S';
        reason = 'Chuẩn phom dáng mảnh mai (Dưới 45kg & dưới 1m55)';
      } else if (weight <= 52 && height <= 162) {
        size = 'M';
        reason = 'Cân đối thanh lịch (46kg - 52kg & 1m56 - 1m62)';
      } else if (weight <= 60 && height <= 168) {
        size = 'L';
        reason = 'Thoải mái dễ vận động (53kg - 60kg & 1m62 - 1m68)';
      } else if (weight <= 68) {
        size = 'XL';
        reason = 'Dáng giấu bụng, dễ mặc (61kg - 68kg)';
      } else {
        size = '2XL';
        reason = 'Phom giấu dáng 2XL (Trên 68kg)';
      }
    } else if (activeTab === 'tre-em') {
      if (height <= 100) {
        size = '100 (2-3 tuổi)';
        reason = 'Chiều cao bé dưới 100cm (Nặng 12 - 15kg)';
      } else if (height <= 110) {
        size = '110 (4-5 tuổi)';
        reason = 'Chiều cao bé 100 - 110cm (Nặng 15 - 18kg)';
      } else if (height <= 120) {
        size = '120 (6-7 tuổi)';
        reason = 'Chiều cao bé 110 - 120cm (Nặng 18 - 23kg)';
      } else if (height <= 130) {
        size = '130 (8-9 tuổi)';
        reason = 'Chiều cao bé 120 - 130cm (Nặng 23 - 28kg)';
      } else if (height <= 140) {
        size = '140 (10-11 tuổi)';
        reason = 'Chiều cao bé 130 - 140cm (Nặng 28 - 34kg)';
      } else {
        size = '150 (12-13 tuổi)';
        reason = 'Chiều cao bé 140 - 150cm (Nặng 34 - 40kg)';
      }
    } else {
      size = 'Freesize';
      reason = 'Phụ kiện ET.TEE thiết kế vừa vặn cho mọi vóc dáng';
    }

    setCalculatedSize(size);
    setCalculatedReason(reason);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Overlay backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Main Modal Window Box */}
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh] border border-slate-200/80 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">Bảng kích thước ET.TEE</h2>
              <p className="text-[11px] text-gray-500">Quy đổi thông số chuẩn vóc dáng người Việt Nam</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Commitment Banner */}
        <div className="bg-amber-50/70 px-6 py-2.5 border-b border-amber-100/80 flex items-center justify-between text-xs text-amber-950 font-medium">
          <div className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Không hài lòng? <strong>Đổi trả miễn phí trong 30 ngày</strong> tận nhà hoặc tại cửa hàng</span>
          </div>
          <span className="hidden sm:inline-flex items-center text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
            ET.TEE Cam Kết ✓
          </span>
        </div>

        {/* View Switcher (Table vs Calculator vs Guide) */}
        <div className="flex items-center justify-between px-6 pt-3 bg-slate-50/70 border-b border-gray-100">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveView('table')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeView === 'table'
                  ? 'border-amber-500 text-slate-900 bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-gray-500 hover:text-slate-900'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Bảng số đo</span>
            </button>
            <button
              onClick={() => setActiveView('calculator')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeView === 'calculator'
                  ? 'border-amber-500 text-slate-900 bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-gray-500 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-amber-600" />
              <span>Tính size tự động</span>
              <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">Smart AI</span>
            </button>
            <button
              onClick={() => setActiveView('guide')}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeView === 'guide'
                  ? 'border-amber-500 text-slate-900 bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-gray-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Cách lấy số đo</span>
            </button>
          </div>
        </div>

        {/* Category Pills (Nam, Nữ, Trẻ em, Phụ kiện) */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-gray-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['nam', 'nu', 'tre-em', 'phu-kien'] as MainCategory[]).map((cat) => {
            const labels: Record<MainCategory, string> = {
              nam: 'Áo & Quần Nam',
              nu: 'Áo & Váy Nữ',
              'tre-em': 'Thời Trang Trẻ Em',
              'phu-kien': 'Phụ Kiện',
            };
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveTab(cat);
                  setCalculatedSize(null);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                  activeTab === cat
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* VIEW 1: SIZE TABLES */}
          {activeView === 'table' && (
            <div>
              {/* Sub-type buttons */}
              {activeTab === 'nam' && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSubType('ao')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                      subType === 'ao' ? 'bg-amber-50 border-amber-300 text-amber-950 font-extrabold' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Áo Nam (Sơ mi, Polo, Áo thun)
                  </button>
                  <button
                    onClick={() => setSubType('quan')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                      subType === 'quan' ? 'bg-amber-50 border-amber-300 text-amber-950 font-extrabold' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Quần Nam (Âu, Jeans, Kaki, Short)
                  </button>
                </div>
              )}

              {activeTab === 'nu' && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSubType('ao')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                      subType === 'ao' ? 'bg-amber-50 border-amber-300 text-amber-950 font-extrabold' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Áo & Sơ Mi Nữ
                  </button>
                  <button
                    onClick={() => setSubType('vay')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                      subType === 'vay' ? 'bg-amber-50 border-amber-300 text-amber-950 font-extrabold' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Váy Liền & Chân Váy
                  </button>
                  <button
                    onClick={() => setSubType('quan')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                      subType === 'quan' ? 'bg-amber-50 border-amber-300 text-amber-950 font-extrabold' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    Quần Nữ
                  </button>
                </div>
              )}

              {/* TABLE content */}
              {activeTab === 'nam' && subType === 'ao' && (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-2 border-r border-slate-700">Thông số</th>
                        <th className="py-3 px-2 border-r border-slate-700">S</th>
                        <th className="py-3 px-2 border-r border-slate-700">M</th>
                        <th className="py-3 px-2 border-r border-slate-700">L</th>
                        <th className="py-3 px-2 border-r border-slate-700">XL</th>
                        <th className="py-3 px-2 border-r border-slate-700">2XL</th>
                        <th className="py-3 px-2 border-r border-slate-700">3XL</th>
                        <th className="py-3 px-2 border-r border-slate-700">4XL</th>
                        <th className="py-3 px-2">5XL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white font-medium text-slate-800">
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Chiều cao (cm)</td>
                        <td className="border-r">160–165</td>
                        <td className="border-r">160–165</td>
                        <td className="border-r">166–172</td>
                        <td className="border-r">172–177</td>
                        <td className="border-r">177–184</td>
                        <td className="border-r">184–192</td>
                        <td className="border-r">184–192</td>
                        <td>184–192</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Cân nặng (kg)</td>
                        <td className="border-r">50–54</td>
                        <td className="border-r">55–61</td>
                        <td className="border-r">62–68</td>
                        <td className="border-r">69–75</td>
                        <td className="border-r">76–84</td>
                        <td className="border-r">85–90</td>
                        <td className="border-r">90–98</td>
                        <td>99–105</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Rộng vai (cm)</td>
                        <td className="border-r">41</td>
                        <td className="border-r">42</td>
                        <td className="border-r">43.5</td>
                        <td className="border-r">45</td>
                        <td className="border-r">46.5</td>
                        <td className="border-r">48</td>
                        <td className="border-r">49</td>
                        <td>50</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Vòng ngực (cm)</td>
                        <td className="border-r">82–86</td>
                        <td className="border-r">86–90</td>
                        <td className="border-r">90–94</td>
                        <td className="border-r">94–98</td>
                        <td className="border-r">98–103</td>
                        <td className="border-r">103–108</td>
                        <td className="border-r">108–113</td>
                        <td>114–120</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'nam' && subType === 'quan' && (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-2 border-r border-slate-700">Size quần</th>
                        <th className="py-3 px-2 border-r border-slate-700">29 (S)</th>
                        <th className="py-3 px-2 border-r border-slate-700">30 (M)</th>
                        <th className="py-3 px-2 border-r border-slate-700">31 (L)</th>
                        <th className="py-3 px-2 border-r border-slate-700">32 (XL)</th>
                        <th className="py-3 px-2 border-r border-slate-700">33 (2XL)</th>
                        <th className="py-3 px-2">34 (3XL)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white font-medium text-slate-800">
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Chiều cao (cm)</td>
                        <td className="border-r">160–165</td>
                        <td className="border-r">163–168</td>
                        <td className="border-r">166–172</td>
                        <td className="border-r">170–176</td>
                        <td className="border-r">175–182</td>
                        <td>178–186</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Cân nặng (kg)</td>
                        <td className="border-r">52–56</td>
                        <td className="border-r">57–63</td>
                        <td className="border-r">64–70</td>
                        <td className="border-r">71–77</td>
                        <td className="border-r">78–84</td>
                        <td>85–92</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Vòng bụng (cm)</td>
                        <td className="border-r">73–75</td>
                        <td className="border-r">76–78</td>
                        <td className="border-r">79–81</td>
                        <td className="border-r">82–84</td>
                        <td className="border-r">85–88</td>
                        <td>89–92</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'nu' && (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-2 border-r border-slate-700">Thông số</th>
                        <th className="py-3 px-2 border-r border-slate-700">S</th>
                        <th className="py-3 px-2 border-r border-slate-700">M</th>
                        <th className="py-3 px-2 border-r border-slate-700">L</th>
                        <th className="py-3 px-2 border-r border-slate-700">XL</th>
                        <th className="py-3 px-2">2XL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white font-medium text-slate-800">
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Chiều cao (cm)</td>
                        <td className="border-r">150–156</td>
                        <td className="border-r">156–162</td>
                        <td className="border-r">162–166</td>
                        <td className="border-r">165–170</td>
                        <td>168–174</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Cân nặng (kg)</td>
                        <td className="border-r">40–47</td>
                        <td className="border-r">48–53</td>
                        <td className="border-r">54–59</td>
                        <td className="border-r">60–65</td>
                        <td>66–72</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Vòng ngực (cm)</td>
                        <td className="border-r">80–84</td>
                        <td className="border-r">84–88</td>
                        <td className="border-r">88–92</td>
                        <td className="border-r">92–96</td>
                        <td>96–100</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Vòng eo (cm)</td>
                        <td className="border-r">62–66</td>
                        <td className="border-r">66–70</td>
                        <td className="border-r">70–74</td>
                        <td className="border-r">74–78</td>
                        <td>78–82</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'tre-em' && (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-2 border-r border-slate-700">Size bé</th>
                        <th className="py-3 px-2 border-r border-slate-700">100</th>
                        <th className="py-3 px-2 border-r border-slate-700">110</th>
                        <th className="py-3 px-2 border-r border-slate-700">120</th>
                        <th className="py-3 px-2 border-r border-slate-700">130</th>
                        <th className="py-3 px-2 border-r border-slate-700">140</th>
                        <th className="py-3 px-2">150</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white font-medium text-slate-800">
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Độ tuổi ước tính</td>
                        <td className="border-r">2–3 tuổi</td>
                        <td className="border-r">4–5 tuổi</td>
                        <td className="border-r">6–7 tuổi</td>
                        <td className="border-r">8–9 tuổi</td>
                        <td className="border-r">10–11 tuổi</td>
                        <td>12–13 tuổi</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Chiều cao (cm)</td>
                        <td className="border-r">90–100</td>
                        <td className="border-r">100–110</td>
                        <td className="border-r">110–120</td>
                        <td className="border-r">120–130</td>
                        <td className="border-r">130–140</td>
                        <td>140–150</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-bold bg-gray-50 text-left border-r">Cân nặng (kg)</td>
                        <td className="border-r">12–15</td>
                        <td className="border-r">15–18</td>
                        <td className="border-r">18–23</td>
                        <td className="border-r">23–28</td>
                        <td className="border-r">28–34</td>
                        <td>34–40</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'phu-kien' && (
                <div className="bg-amber-50/60 p-6 rounded-2xl border border-amber-200/80 text-center">
                  <h3 className="font-bold text-slate-900 mb-2">Phụ Kiện ET.TEE Freesize</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Các sản phẩm Mũ, Tất, Khăn, Túi Xách, Thắt Lưng của ET.TEE được thiết kế theo tiêu chuẩn vừa vặn linh hoạt với mọi kích thước cơ thể. 
                    Thắt lưng có thể điều chỉnh độ dài, nón/mũ có khóa cài điều chỉnh vòng đầu từ 54–60cm.
                  </p>
                </div>
              )}

              <p className="mt-4 text-[11px] text-gray-500 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mẹo ET.TEE: Nếu số đo của bạn nằm ở khoảng giữa 2 size, nên ưu tiên chọn <strong>Size lớn hơn</strong> để thoải mái khi cử động.</span>
              </p>
            </div>
          )}

          {/* VIEW 2: SMART CALCULATOR */}
          {activeView === 'calculator' && (
            <div className="max-w-xl mx-auto py-2">
              <div className="bg-gradient-to-br from-amber-50 via-white to-slate-50 p-6 rounded-2xl border border-amber-200/80 shadow-xs mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 uppercase tracking-wide text-sm">Tính Size Tự Động Theo Vóc Dáng</h3>
                </div>

                <form onSubmit={handleCalculate} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Chiều cao của bạn (cm)</label>
                      <input
                        type="number"
                        min="90"
                        max="210"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-amber-500 outline-none font-bold text-slate-900 bg-white"
                        placeholder="Ví dụ: 170"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cân nặng của bạn (kg)</label>
                      <input
                        type="number"
                        min="10"
                        max="150"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-amber-500 outline-none font-bold text-slate-900 bg-white"
                        placeholder="Ví dụ: 65"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sở thích mặc</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'slim', label: 'Ôm vừa vặn (Slim)' },
                        { id: 'regular', label: 'Thoải mái (Regular)' },
                        { id: 'loose', label: 'Rộng rãi (Oversize)' },
                      ].map((pref) => (
                        <button
                          key={pref.id}
                          type="button"
                          onClick={() => setFitPreference(pref.id as any)}
                          className={`py-2 px-2 text-center rounded-xl border font-bold transition-all ${
                            fitPreference === pref.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {pref.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold uppercase rounded-xl tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Xem Gợi Ý Size Ngay</span>
                  </button>
                </form>
              </div>

              {/* Calculator Output Display */}
              {calculatedSize && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl" />
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                    Gợi Ý Size Tối Ưu Cho Bạn
                  </span>
                  <div className="text-4xl font-black text-amber-400 my-2 tracking-tight">
                    SIZE {calculatedSize}
                  </div>
                  <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed mb-4">
                    {calculatedReason}
                  </p>

                  {onSelectSize && (
                    <button
                      onClick={() => {
                        const cleanSize = calculatedSize.split(' ')[0];
                        onSelectSize(cleanSize);
                        onClose();
                      }}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-wider text-xs rounded-full transition-transform hover:scale-105 shadow-md"
                    >
                      <span>Chọn Size {calculatedSize.split(' ')[0]} Ngay</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: MEASUREMENT GUIDE */}
          {activeView === 'guide' && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Đo Vòng Ngực (Chest)</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Dùng thước dây quấn quanh phần nở nhất của ngực (ngang qua 2 núm ngực). Giữ thước thẳng ngang lưng và vừa vặn, không siết quá chặt.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Đo Vòng Eo (Waist)</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Vòng dây qua phần nhỏ nhất của thắt lưng (thường nằm trên rốn khoảng 2-3cm). Thở ra tự nhiên khi đọc số đo.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Đo Vòng Mông (Hips)</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Đứng chụm hai chân, quấn thước dây qua điểm nhô cao nhất của mông. Đảm bảo dây nằm song song với mặt đất.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Đo Rộng Vai (Shoulders)</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Đo từ đỉnh xương vai bên trái kéo thẳng sang đỉnh xương vai bên phải theo đường cong nhẹ phía sau lưng.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-start gap-3 text-xs text-amber-950">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-1">Chính sách bảo hành đổi size ET.TEE:</strong>
                  <span>Nếu mua sản phẩm về không vừa vặn, quý khách được <strong>đổi trả hoàn toàn miễn phí</strong> tận nhà hoặc đổi trực tiếp tại cửa hàng trong vòng 30 ngày.</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
          <div className="text-[11px] text-gray-500 font-medium hidden sm:block">
            Cần tư vấn thêm? Gọi Hotline <strong>1900 1234</strong> (Miễn phí)
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors ml-auto"
          >
            Đã Hiểu
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
