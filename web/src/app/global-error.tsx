'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200/80 p-8 md:p-10">
            <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight mb-3">Lỗi hệ thống nghiêm trọng</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Xin lỗi vì sự bất tiện này. Đội ngũ kỹ thuật đang xử lý.
            </p>
            <button
              onClick={() => reset()}
              className="w-full py-3.5 bg-primary text-white rounded-full font-black uppercase text-xs tracking-wider hover:bg-primary/90 shadow-md transition-all cursor-pointer"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
