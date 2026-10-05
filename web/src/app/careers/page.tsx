'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, DollarSign, Award, Users, Heart, CheckCircle2, ArrowRight, X, Sparkles, Building } from 'lucide-react';
import { toast } from 'sonner';

const POSITIONS = [
  { id: 1, title: 'Cửa Hàng Trưởng Showroom', dept: 'store', location: 'Hà Nội / TP.HCM', salary: '15 - 25 Triệu', type: 'Toàn thời gian', exp: '2 năm kinh nghiệm' },
  { id: 2, title: 'Chuyên Viên Tư Vấn Bán Hàng', dept: 'store', location: 'Toàn Quốc (200+ Showroom)', salary: '8 - 14 Triệu', type: 'Toàn thời gian / Xoay ca', exp: 'Không yêu cầu kinh nghiệm' },
  { id: 3, title: 'Senior Fullstack Developer (Next.js & Python)', dept: 'tech', location: 'Hà Nội / Remote', salary: '30 - 45 Triệu', type: 'Toàn thời gian', exp: '3+ năm kinh nghiệm' },
  { id: 4, title: 'Chuyên Viên AI & Recommendation System', dept: 'tech', location: 'Hà Nội', salary: '35 - 50 Triệu', type: 'Toàn thời gian', exp: '3+ năm kinh nghiệm' },
  { id: 5, title: 'Kỹ Sư Thiết Kế Thời Trang (Fashion Designer)', dept: 'office', location: 'Hải Dương / Hà Nội', salary: '20 - 30 Triệu', type: 'Toàn thời gian', exp: '2+ năm kinh nghiệm' },
  { id: 6, title: 'Chuyên Viên Marketing & Performance Ads', dept: 'office', location: 'Hà Nội', salary: '15 - 25 Triệu', type: 'Toàn thời gian', exp: '2+ năm kinh nghiệm' },
];

export default function CareersPage() {
  const [selectedDept, setSelectedDept] = useState('all');
  const [activeJobModal, setActiveJobModal] = useState<any>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [cvLink, setCvLink] = useState('');

  const filtered = selectedDept === 'all' 
    ? POSITIONS 
    : POSITIONS.filter(p => p.dept === selectedDept);

  const handleSubmitApp = (e: React.FormEvent) => {
    e.preventDefault();
    // No backend endpoint exists to receive job applications - this used to
    // claim "đã được gửi thành công" while discarding the form entirely.
    // Open a prefilled mailto to the real recruiting inbox instead.
    const body = [
      `Vị trí ứng tuyển: ${activeJobModal?.title ?? ''}`,
      `Họ tên: ${applicantName}`,
      `Số điện thoại: ${applicantPhone}`,
      `Email: ${applicantEmail}`,
      `Link CV: ${cvLink}`,
    ].join('\n');
    window.location.href = `mailto:tuyendung@ettee.vn?subject=${encodeURIComponent('[Ứng tuyển] ' + (activeJobModal?.title ?? ''))}&body=${encodeURIComponent(body)}`;
    toast.success('Đã mở ứng dụng email với hồ sơ của bạn. Vui lòng bấm Gửi để hoàn tất ứng tuyển.');
    setActiveJobModal(null);
    setApplicantName('');
    setApplicantPhone('');
    setApplicantEmail('');
    setCvLink('');
  };

  return (
    <main className="min-h-screen bg-slate-50/70 pt-6 pb-24">
      <div className="container mx-auto px-4 xl:px-8 max-w-5xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Tuyển dụng</span>
        </div>

        {/* Hero Header */}
        <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl mb-10 shadow-md relative overflow-hidden border border-slate-200/80">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-50 text-amber-900 text-xs font-bold uppercase tracking-widest rounded-full border border-amber-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Gia Nhập Ngôi Nhà ET.TEE</span>
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900">
              Cùng Phát Triển Sự Nghiệp Bền Vững
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              ET.TEE mang đến môi trường làm việc trẻ trung, năng động, nơi năng lực của bạn được công nhận và lộ trình thăng tiến luôn rộng mở.
            </p>
          </div>
        </div>

        {/* Culture & Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Thu Nhập Cạnh Tranh</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Lương thưởng xứng đáng theo năng lực, thưởng doanh số hàng tháng và thưởng lễ tết hấp dẫn.</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Đào Tạo & Phát Triển</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Tham gia các khóa đào tạo kỹ năng mềm, tư duy lãnh đạo và chuyên môn định kỳ hoàn toàn miễn phí.</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Môi Trường Hạnh Phúc</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Văn hóa đồng đội gắn kết, du lịch teambuilding hàng năm và mua sắm ưu đãi giảm 30% cho nhân viên.</p>
          </div>
        </div>

        {/* Positions Filter */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-black uppercase text-slate-900">Vị Trí Đang Tuyển Dụng</h2>
            
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'Tất cả vị trí' },
                { id: 'store', label: 'Khối Cửa Hàng' },
                { id: 'tech', label: 'Công Nghệ & AI' },
                { id: 'office', label: 'Văn Phòng & Thiết Kế' },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDept(d.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedDept === d.id
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Job Listings Grid */}
          <div className="space-y-4">
            {filtered.map(job => (
              <div 
                key={job.id} 
                className="p-5 rounded-2xl border border-slate-200/80 hover:border-amber-400 transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-md"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      {job.dept.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{job.type}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{job.title}</h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-600" /> {job.location}</span>
                    <span className="flex items-center gap-1 font-bold text-emerald-600"><DollarSign className="w-3.5 h-3.5" /> {job.salary}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveJobModal(job)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                >
                  <span>Ứng Tuyển</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Application Modal */}
      {activeJobModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md" onClick={() => setActiveJobModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 z-10 space-y-4 my-auto border border-slate-100">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Ứng tuyển vị trí</h3>
                <p className="text-xs text-amber-700 font-bold">{activeJobModal.title}</p>
              </div>
              <button onClick={() => setActiveJobModal(null)} className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApp} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  required
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={applicantName}
                  onChange={e => setApplicantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                <input
                  required
                  type="tel"
                  placeholder="0987654321"
                  value={applicantPhone}
                  onChange={e => setApplicantPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email liên hệ *</label>
                <input
                  required
                  type="email"
                  placeholder="nguyenvana@gmail.com"
                  value={applicantEmail}
                  onChange={e => setApplicantEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Link CV / Ghi chú giới thiệu</label>
                <textarea
                  rows={3}
                  placeholder="Dán đường dẫn CV (Google Drive, TopCV...) hoặc giới thiệu bản thân..."
                  value={cvLink}
                  onChange={e => setCvLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold uppercase rounded-xl tracking-wider text-xs shadow-md transition-colors"
              >
                Gửi Hồ Sơ Ứng Tuyển
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

