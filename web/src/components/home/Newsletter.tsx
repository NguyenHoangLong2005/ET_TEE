'use client';

export default function Newsletter() {
  return (
    <section className="py-20 bg-slate-100">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <h2 className="text-3xl font-black text-slate-900 mb-4">Đăng Ký Nhận Tin</h2>
        <p className="text-slate-600 mb-8">
          Trở thành người đầu tiên biết về các chương trình khuyến mãi, bộ sưu tập mới và bí kíp mặc đẹp từ ET.TEE. Tặng ngay voucher 10% cho lần mua đầu tiên!
        </p>
        <form className="flex flex-col sm:flex-row gap-4 justify-center" onSubmit={(e) => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="Nhập địa chỉ email của bạn..." 
            className="flex-1 max-w-md px-6 py-4 rounded-full border border-gray-300 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            required
          />
          <button 
            type="submit"
            className="bg-slate-900 text-white font-bold px-8 py-4 rounded-full hover:bg-primary transition shadow-lg hover:shadow-xl"
          >
            Đăng ký
          </button>
        </form>
      </div>
    </section>
  );
}
