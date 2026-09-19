'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('size');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success('Gửi thắc mắc thành công! ET.TEE sẽ phản hồi quý khách trong thời gian sớm nhất.');
  };

  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-5xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Liên hệ</span>
        </div>

        {/* Hero Header */}
        <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl mb-10 shadow-md relative overflow-hidden border border-slate-200/80">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-3.5 py-1 bg-amber-50 text-amber-900 text-xs font-bold uppercase tracking-widest rounded-full mb-4 border border-amber-200 shadow-2xs">
              ET.TEE Customer Care 24/7
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900 mb-4">
              Liên Hệ Với Chúng Tôi
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Chúng tôi luôn sẵn sàng lắng nghe mọi ý kiến đóng góp, thắc mắc về đơn hàng, chính sách đổi trả hay dịch vụ tư vấn size số từ quý khách.
            </p>
          </div>
        </div>

        {/* Support Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Tổng Đài Tư Vấn & Đặt Hàng</h3>
            <p className="text-lg font-black text-amber-700">1900 1234</p>
            <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 8:00 - 22:00 (Tất cả các ngày)</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Email Chăm Sóc Khách Hàng</h3>
            <p className="text-sm font-bold text-slate-900">cskh@ettee.vn</p>
            <p className="text-xs text-gray-500">Phản hồi trong vòng 2-4 giờ làm việc</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Trụ Sở Chính ET.TEE</h3>
            <p className="text-xs text-gray-600 leading-relaxed">Tầng 3, Tòa nhà Lotte Center, 54 Liễu Giai, Ba Đình, Hà Nội</p>
          </div>
        </div>

        {/* Contact Form & Info Grid */}
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Form */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase text-slate-900">Gửi Thắc Mắc Trực Tuyến</h2>
              <p className="text-xs text-gray-500">Điền thông tin bên dưới để bộ phận CSKH hỗ trợ bạn nhanh nhất</p>
            </div>

            {submitted ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-base">ET.TEE Đã Nhận Được Yêu Cầu!</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Cảm ơn bạn đã liên hệ. Đội ngũ chuyên viên tư vấn sẽ gọi lại hoặc phản hồi qua Email trong thời gian ngắn nhất.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
                >
                  Gửi yêu cầu khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                    <input
                      required
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-500 text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                    <input
                      required
                      type="tel"
                      placeholder="0987 654 321"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-500 text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email liên hệ *</label>
                  <input
                    required
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chủ đề hỗ trợ</label>
                  <select
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-500 text-slate-900 font-bold"
                  >
                    <option value="size">Tư vấn chọn Size / Kích cỡ</option>
                    <option value="order">Tra cứu tình trạng Đơn hàng</option>
                    <option value="return">Yêu cầu Đổi trả 30 ngày</option>
                    <option value="partner">Hợp tác kinh doanh / Showroom</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nội dung thắc mắc *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Nhập nội dung bạn cần ET.TEE hỗ trợ..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-500 text-slate-900 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold uppercase tracking-wider text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-slate-950" />
                  <span>Gửi Tin Nhắn Cho ET.TEE</span>
                </button>
              </form>
            )}
          </div>

          {/* Location Map / Info */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <h2 className="text-xl font-black uppercase text-slate-900">Trụ Sở Văn Phòng</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                ET.TEE chào đón đối tác, khách hàng ghé thăm văn phòng để trao đổi hợp tác và trải nghiệm văn hóa phục vụ của chúng tôi.
              </p>
            </div>

            <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-white block">Địa chỉ văn phòng đại diện:</span>
                  <span className="text-gray-300">Tầng 3, Tòa nhà Lotte Center, 54 Liễu Giai, P. Cống Vị, Q. Ba Đình, Hà Nội</span>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-800 pt-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-white block">Thời gian làm việc:</span>
                  <span className="text-gray-300">Thứ 2 - Thứ 7 (8:00 - 17:30)</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-slate-800">
              💡 Bạn cần tư vấn mua hàng gấp? Vui lòng gọi trực tiếp Hotline <strong>1900 1234</strong> để được nhân viên hỗ trợ giữ hàng tại showroom gần nhất ngay lập tức.
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
