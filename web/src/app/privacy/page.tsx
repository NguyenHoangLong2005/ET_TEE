import Link from 'next/link';

export const metadata = { title: 'Chính sách bảo mật | ET.TEE' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 xl:px-8 py-16 max-w-2xl">
        <Link href="/" className="text-sm text-gray-400 hover:text-[#e50027] mb-8 inline-block">← Trang chủ</Link>
        <h1 className="text-3xl font-black tracking-tight uppercase mb-4 text-slate-900">Chính sách bảo mật</h1>
        <p className="text-gray-500 leading-relaxed">Nội dung đang được cập nhật. Vui lòng quay lại sau.</p>
      </div>
    </main>
  );
}
