'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-4">Lỗi hệ thống nghiêm trọng</h2>
            <p className="text-gray-500 mb-8">
              Xin lỗi vì sự bất tiện này. Đội ngũ kỹ thuật đang xử lý.
            </p>
            <button
              onClick={() => reset()}
              className="w-full py-3 bg-black text-white rounded font-bold uppercase hover:bg-gray-800"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
