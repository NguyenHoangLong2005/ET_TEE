import Link from 'next/link';

export default function CampaignBlock() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="bg-slate-900 rounded-3xl overflow-hidden flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 p-10 md:p-16 lg:p-24 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
              AI GỢI Ý <br /> <span className="text-primary">CHUẨN SIZE & GU</span>
            </h2>
            <p className="text-slate-300 mb-8 text-lg leading-relaxed max-w-md mx-auto md:mx-0">
              Chỉ cần trả lời 3 câu hỏi nhanh, ET.TEE sẽ tạo ngay một hồ sơ thời trang riêng biệt, giúp bạn tìm ra những item hoàn hảo nhất từ kiểu dáng đến kích cỡ.
            </p>
            <Link 
              href="/style-quiz"
              className="inline-block bg-primary text-white font-bold px-8 py-4 rounded-full hover:bg-red-700 transition shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Làm Quiz Ngay
            </Link>
          </div>
          <div className="w-full md:w-1/2 h-[400px] md:h-auto relative self-stretch">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1000&auto=format&fit=crop" 
              alt="Fashion fitting" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
