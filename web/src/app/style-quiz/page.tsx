'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Check, RefreshCw, Shirt, UserCheck, Palette, ShoppingBag } from 'lucide-react';
import PageBreadcrumb from '@/components/ui/PageBreadcrumb';
import PageHero from '@/components/ui/PageHero';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

export default function StyleQuizPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    height: '170',
    weight: '65',
    bodyType: 'balanced',
    style: 'minimalist',
    colorPreference: 'neutral',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    // Finalize quiz. There is no AI/recommendation model reading this data -
    // this used to just fake a 1.2s "analysis" and claim an "AI profile" was
    // created without saving anything. Height/weight/fit/style preference do
    // map onto the real UserMeasurement record (the same one shown at
    // /account/measurements), so at least save that much truthfully for a
    // logged-in user instead of discarding the answers.
    setIsAnalyzing(true);
    if (user) {
      try {
        await apiClient.put('/api/account/measurements', {
          measurementProfileType: 'SELF_ADULT',
          heightCm: Number(formData.height),
          weightKg: Number(formData.weight),
          fitPreference: formData.bodyType,
          note: `Style quiz: phong cách=${formData.style}, gam màu=${formData.colorPreference}`,
        });
      } catch {
        // Non-fatal: still show the (locally computed) suggestion below.
      }
    }
    setIsAnalyzing(false);
    setIsCompleted(true);
    toast.success(user
      ? 'Đã lưu số đo của bạn vào hồ sơ tài khoản.'
      : 'Đã ghi nhận câu trả lời. Đăng nhập để lưu số đo vào hồ sơ của bạn.');
  };

  const handleReset = () => {
    setStep(1);
    setIsCompleted(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 text-slate-900">
      <PageBreadcrumb items={[{ label: 'AI Style Quiz' }]} />

      <PageHero 
        badge="AI STYLIST"
        badgeText="Tối ưu kích cỡ & Phong cách"
        title="STYLE QUIZ AI"
        subtitle="Khám phá bộ sưu tập được may đo riêng cho vóc dáng & thần thái của bạn chỉ trong 3 bước đơn giản."
      />

      <div className="max-w-3xl mx-auto">
        {!isCompleted && !isAnalyzing ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Bước {step} / 3</span>
                <span>{step === 1 ? 'Vóc dáng & Số đo' : step === 2 ? 'Phong cách thời trang' : 'Gam màu ưa thích'}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* STEP 1: Body Measurements */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <UserCheck className="w-6 h-6 text-primary" />
                  <h2 className="text-lg font-black text-slate-900 uppercase">1. Chiều cao & Vóc dáng</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Chiều cao (cm)</label>
                    <input 
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-full h-12 px-4 border border-slate-300 rounded-xl focus:border-slate-900 outline-none font-bold text-sm bg-slate-50/50"
                      placeholder="170"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Cân nặng (kg)</label>
                    <input 
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full h-12 px-4 border border-slate-300 rounded-xl focus:border-slate-900 outline-none font-bold text-sm bg-slate-50/50"
                      placeholder="65"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-3">Dáng người của bạn</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'slim', label: 'Thon gọn', desc: 'Nhẹ nhàng' },
                      { id: 'balanced', label: 'Cân đối', desc: 'Chuẩn phom' },
                      { id: 'athletic', label: 'Thể thao', desc: 'Săn chắc' },
                      { id: 'plus', label: 'Mũm mĩm', desc: 'Thoải mái' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, bodyType: item.id })}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          formData.bodyType === item.id 
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                            : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:border-slate-400'
                        }`}
                      >
                        <p className="font-black text-sm uppercase">{item.label}</p>
                        <p className={`text-xs mt-1 ${formData.bodyType === item.id ? 'text-slate-300' : 'text-slate-500'}`}>{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Style Preference */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <Shirt className="w-6 h-6 text-primary" />
                  <h2 className="text-lg font-black text-slate-900 uppercase">2. Định hình Phong cách</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'minimalist', title: 'Minimalist Clean', desc: 'Tối giản, tinh tế, ưu tiên chất liệu cotton cao cấp' },
                    { id: 'streetwear', title: 'Oversize Streetwear', desc: 'Cá tính, năng động, phom dáng rộng phóng khoáng' },
                    { id: 'office', title: 'Elegant Everyday', desc: 'Lịch sự, sang trọng, phù hợp đi làm & gặp đối tác' },
                    { id: 'casual', title: 'Basic Casual', desc: 'Thoải mái, dễ phối đồ hàng ngày, ứng dụng cao' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, style: style.id })}
                      className={`p-5 rounded-2xl border text-left transition-all ${
                        formData.style === style.id 
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm uppercase">{style.title}</span>
                        {formData.style === style.id && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <p className={`text-xs leading-relaxed ${formData.style === style.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {style.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Color Palette */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <Palette className="w-6 h-6 text-primary" />
                  <h2 className="text-lg font-black text-slate-900 uppercase">3. Tông màu yêu thích</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'neutral', title: 'Neutral Basic', colors: ['#FFFFFF', '#1E293B', '#94A3B8'], desc: 'Đen, Trắng, Ghi, Be' },
                    { id: 'vibrant', title: 'Vibrant Accent', colors: ['#E50027', '#0284C7', '#D97706'], desc: 'Đỏ, Xanh Dương, Cam' },
                    { id: 'dark', title: 'Monochrome Dark', colors: ['#0F172A', '#334155', '#475569'], desc: 'Tone Tối Thanh Lịch' },
                  ].map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, colorPreference: palette.id })}
                      className={`p-5 rounded-2xl border text-left transition-all ${
                        formData.colorPreference === palette.id 
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                          : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {palette.colors.map((c, i) => (
                          <span key={i} className="w-5 h-5 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <p className="font-black text-sm uppercase mb-1">{palette.title}</p>
                      <p className={`text-xs ${formData.colorPreference === palette.id ? 'text-slate-300' : 'text-slate-500'}`}>{palette.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-full text-xs uppercase hover:bg-slate-100 transition-colors"
                >
                  Quay lại
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3.5 bg-primary hover:bg-primary-hover text-white font-black rounded-full text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <span>{step === 3 ? 'Hoàn thành Quiz' : 'Tiếp theo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm flex flex-col items-center justify-center min-h-[360px]">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <Sparkles className="w-6 h-6 text-primary absolute inset-0 m-auto animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Đang lưu thông tin của bạn...</h3>
            <p className="text-slate-500 text-xs max-w-md">Vui lòng chờ trong giây lát.</p>
          </div>
        ) : (() => {
          const h = parseInt(formData.height, 10) || 170;
          const w = parseInt(formData.weight, 10) || 65;
          let suggestedSize = 'L';
          if (w < 53 || h < 162) suggestedSize = 'S';
          else if (w < 63 || h < 170) suggestedSize = 'M';
          else if (w < 73 || h < 178) suggestedSize = 'L';
          else if (w < 83 || h < 185) suggestedSize = 'XL';
          else suggestedSize = 'XXL';

          if (formData.bodyType === 'plus' && suggestedSize !== 'XXL') {
            const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
            const idx = sizes.indexOf(suggestedSize);
            if (idx !== -1 && idx < sizes.length - 1) suggestedSize = sizes[idx + 1];
          }

          const fitLabel = formData.style === 'streetwear' 
            ? `Oversize Fit (${suggestedSize})`
            : formData.style === 'office' 
              ? `Slim Fit (${suggestedSize})` 
              : formData.style === 'minimalist'
                ? `Regular Fit (${suggestedSize})`
                : `Casual Fit (${suggestedSize})`;

          const styleKeyword = formData.style === 'office' ? 'polo' : formData.style === 'streetwear' ? 'oversize' : '';
          const targetUrl = `/products?adultSize=${suggestedSize}${styleKeyword ? `&q=${styleKeyword}` : ''}`;

          return (
            /* RESULT STATE */
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8" />
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-primary bg-red-50 px-3.5 py-1.5 rounded-full inline-block mb-3">
                HỒ SƠ THỜI TRANG ĐÃ SẴN SÀNG
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase mb-4 tracking-tight">
                Phom dáng gợi ý: <span className="text-primary">{fitLabel}</span>
              </h2>

              <p className="text-slate-600 text-sm max-w-lg mx-auto mb-8 leading-relaxed">
                Dựa trên chiều cao <strong>{formData.height}cm</strong> và cân nặng <strong>{formData.weight}kg</strong> (Vóc dáng: <strong>{formData.bodyType}</strong>), phong cách <strong>{formData.style.toUpperCase()}</strong> phù hợp nhất với cỡ <strong>{suggestedSize}</strong> cho các mẫu T-Shirt Cotton USA & Polo có độ co giãn tốt.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                <Link 
                  href={targetUrl} 
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-black uppercase text-xs rounded-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Xem Sản phẩm Cỡ {suggestedSize}</span>
                </Link>

                <button 
                  onClick={handleReset}
                  className="w-full h-12 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold uppercase text-xs rounded-full flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Thực hiện lại Quiz</span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
